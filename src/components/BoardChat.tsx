"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, Send, Trash2 } from "lucide-react";

interface ChatMessage {
  id: string;
  gameId: string;
  user: string;
  text: string;
  moveNumber?: number;
  time: string;
}

// Poll every 4s while the chat is open (per-board thread, like Lichess room but scoped to a board)
const POLL_MS = 4000;

export default function BoardChat({
  gameId,
  onClose,
}: {
  gameId: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [userName, setUserName] = useState("");
  const [moveLink, setMoveLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/${encodeURIComponent(gameId)}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {
      // keep current list
    }
  }, [gameId]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, POLL_MS);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    setError(null);

    const moveNumber = /^\d+$/.test(moveLink.trim())
      ? parseInt(moveLink.trim())
      : undefined;

    try {
      const res = await fetch(`/api/chat/${encodeURIComponent(gameId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: userName.trim() || "Guest",
          text,
          moveNumber,
        }),
      });
      if (res.ok) {
        setInput("");
        setMoveLink("");
        loadMessages();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to send message");
      }
    } catch {
      setError("Network error. Please try again.");
    }
  };

  const deleteMessage = async (id: string) => {
    const passcode = window.prompt("Admin passcode to remove this message:");
    if (!passcode) return;
    try {
      const res = await fetch(`/api/chat/${encodeURIComponent(gameId)}?id=${id}`, {
        method: "DELETE",
        headers: { "x-admin-passcode": passcode },
      });
      if (res.ok) loadMessages();
    } catch {
      // ignore
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div
      style={{
        borderTop: "1px solid var(--color-border)",
        background: "var(--color-bg-overlay)",
        display: "flex",
        flexDirection: "column",
        maxHeight: 260,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 14px",
          borderBottom: "1px solid var(--color-border-muted)",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
          <MessageSquare size={13} /> Board Chat
          <span style={{ color: "var(--color-text-faint)", fontWeight: 500 }}>({messages.length})</span>
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--color-text-faint)", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>
          ×
        </button>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          minHeight: 90,
        }}
      >
        {messages.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--color-text-faint)", textAlign: "center", padding: "12px 0" }}>
            No comments on this board yet. Start the discussion.
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} style={{ fontSize: 12, lineHeight: 1.4 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontWeight: 700, color: "var(--color-text)" }}>{msg.user}</span>
              {msg.moveNumber !== undefined && (
                <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-gold)", background: "var(--color-gold-muted)", padding: "0 4px", borderRadius: 3 }}>
                  move {msg.moveNumber}
                </span>
              )}
              <span style={{ color: "var(--color-text-faint)", fontSize: 10 }}>{formatTime(msg.time)}</span>
              <button
                onClick={() => deleteMessage(msg.id)}
                title="Remove (admin)"
                style={{ background: "none", border: "none", color: "var(--color-text-faint)", cursor: "pointer", padding: 0, display: "inline-flex" }}
              >
                <Trash2 size={10} />
              </button>
            </span>
            <div style={{ color: "var(--color-text-muted)" }}>{msg.text}</div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: "8px 14px", borderTop: "1px solid var(--color-border-muted)", display: "grid", gap: 6 }}>
        {error && <div style={{ fontSize: 11, color: "var(--color-eval-bad)" }}>{error}</div>}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Comment on this board... (Enter to send)"
          rows={2}
          style={{
            width: "100%",
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            color: "var(--color-text)",
            fontSize: 12,
            outline: "none",
            resize: "none",
            fontFamily: "inherit",
          }}
        />
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Name (optional)"
            style={{
              flex: 1,
              padding: "5px 8px",
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              fontSize: 12,
              outline: "none",
              maxWidth: 130,
            }}
          />
          <input
            value={moveLink}
            onChange={(e) => setMoveLink(e.target.value)}
            placeholder="Move #"
            title="Link this comment to a move number"
            style={{
              width: 64,
              padding: "5px 8px",
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              fontSize: 12,
              outline: "none",
            }}
          />
          <button
            onClick={sendMessage}
            className="btn btn-primary"
            style={{ padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}
          >
            <Send size={12} /> Send
          </button>
        </div>
      </div>
    </div>
  );
}
