"use client";

import { useState } from "react";

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  time: string;
  isAI?: boolean;
}

const DEMO_MESSAGES: ChatMessage[] = [
  { id: "1", user: "ChessFan_NG", text: "Great central control from white!", time: "2m ago" },
  { id: "2", user: "FM_Kigigha", text: "Black's knight on c6 is well placed", time: "1m ago" },
  { id: "3", user: "AI Commentary", text: "White has a slight advantage (+0.3) due to better pawn structure. The d4 pawn controls key squares.", time: "30s ago", isAI: true },
];

export default function BoardChat({
  gameId,
  onClose,
}: {
  gameId: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(DEMO_MESSAGES);
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg: ChatMessage = {
      id: String(Date.now()),
      user: "You",
      text: input.trim(),
      time: "now",
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");

    // Simulate AI response after a short delay
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: String(Date.now() + 1),
        user: "AI Commentary",
        text: generateAICommentary(input),
        time: "now",
        isAI: true,
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 1500);
  };

  return (
    <div style={{
      borderTop: "1px solid var(--color-border)",
      padding: "10px 14px",
      background: "var(--color-bg-overlay)",
      maxHeight: 200,
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)" }}>
          Board Chat
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-faint)",
            cursor: "pointer",
            fontSize: 14,
            padding: "0 4px",
          }}
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        marginBottom: 8,
      }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{
            fontSize: 12,
            lineHeight: 1.4,
          }}>
            <span style={{
              fontWeight: 700,
              color: msg.isAI ? "var(--color-accent)" : "var(--color-text)",
            }}>
              {msg.user}
            </span>
            {msg.isAI && (
              <span style={{
                fontSize: 9,
                background: "var(--color-accent-muted)",
                color: "var(--color-accent)",
                padding: "1px 5px",
                borderRadius: 3,
                marginLeft: 4,
                fontWeight: 700,
              }}>
                AI
              </span>
            )}
            <span style={{ color: "var(--color-text-faint)", marginLeft: 6, fontSize: 10 }}>
              {msg.time}
            </span>
            <div style={{ color: "var(--color-text-muted)" }}>{msg.text}</div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Comment on this board..."
          style={{
            flex: 1,
            padding: "6px 10px",
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
          style={{ padding: "6px 12px", fontSize: 12 }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

function generateAICommentary(userInput: string): string {
  const lower = userInput.toLowerCase();
  if (lower.includes("check") || lower.includes("attack")) {
    return "The position is sharp — both sides have tactical opportunities. Engine evaluation remains close to equal.";
  }
  if (lower.includes("endgame") || lower.includes("pawn")) {
    return "If this reaches an endgame, the pawn structure will be critical. White's majority on the queenside could be decisive.";
  }
  if (lower.includes("opening") || lower.includes("book")) {
    return "This is a well-known position from the Ruy Lopez. Both players are still in theoretical territory.";
  }
  return "Interesting observation! The position is dynamically balanced with chances for both sides.";
}
