import Link from "next/link";
import { BookOpen, Clock, Users, ArrowRight, ExternalLink, Target, Zap, Shield } from "lucide-react";

const courses = [
  {
    level: "Beginner",
    title: "Your First Moves",
    icon: Target,
    lessons: 10,
    hours: 8,
    color: "#2ea043",
    desc: "Learn the rules, piece movement, basic checkmates, and how to play your first real game with confidence.",
    topics: ["How the pieces move", "Castling & en passant", "Basic checkmates (K+Q, K+R)", "Opening principles", "Your first tournament game"],
  },
  {
    level: "Intermediate",
    title: "Level Up Your Game",
    icon: Zap,
    lessons: 12,
    hours: 12,
    color: "#f0b429",
    desc: "Master opening principles, tactical motifs, and simple endgames to crush your opponents.",
    topics: ["Tactical patterns (forks, pins, skewers)", "Opening repertoire basics", "Middlegame plans", "Rook endgames", "Positional play fundamentals"],
  },
  {
    level: "Advanced",
    title: "Tournament Ready",
    icon: Shield,
    lessons: 15,
    hours: 16,
    color: "#da3633",
    desc: "Deep middlegame strategy, precise calculation, and tournament preparation.",
    topics: ["Advanced calculation", "Complex endgames", "Opening preparation", "Tournament psychology", "Game analysis techniques"],
  },
];

export default function CoursesPage() {
  return (
    <div className="wrap" style={{ padding: "32px 20px" }}>
      <div style={{ maxWidth: 800 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
          <BookOpen style={{ display: "inline", width: 24, height: 24, verticalAlign: "middle", marginRight: 8 }} />
          Chess Courses
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: 14, marginBottom: 8 }}>
          Structured curriculum from ProChess Academy — Nigeria&apos;s premier chess academy
        </p>
        <p style={{ color: "var(--color-text-muted)", fontSize: 13, marginBottom: 32 }}>
          Unlike random YouTube videos, these courses follow a structured progression designed by FIDE-certified coaches.
          Each lesson builds on the last, so you actually improve — not just watch.
        </p>
      </div>

      <div style={{ display: "grid", gap: 20 }}>
        {courses.map((course) => {
          const Icon = course.icon;
          return (
            <div key={course.level} className="card" style={{ padding: 24 }}>
              <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: `${course.color}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Icon size={24} style={{ color: course.color }} />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: `${course.color}20`,
                      color: course.color,
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}>
                      {course.level}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                      {course.lessons} lessons · {course.hours} hours
                    </span>
                  </div>

                  <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                    {course.title}
                  </h2>

                  <p style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: 12 }}>
                    {course.desc}
                  </p>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      What you&apos;ll learn
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {course.topics.map((topic) => (
                        <div key={topic} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-muted)" }}>
                          <div style={{ width: 4, height: 4, borderRadius: "50%", background: course.color, flexShrink: 0 }} />
                          {topic}
                        </div>
                      ))}
                    </div>
                  </div>

                  <a
                    href="https://prochess-lovat.vercel.app/courses"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ fontSize: 13 }}
                  >
                    Start Learning on ProChess <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Why these courses */}
      <div className="card" style={{ padding: 24, marginTop: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Why ProChess courses?</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {[
            { icon: Target, title: "Structured", desc: "Each lesson builds on the last. No random videos." },
            { icon: Clock, title: "Self-paced", desc: "Learn on your schedule. Rewatch as many times as you need." },
            { icon: Users, title: "FIDE Coaches", desc: "Designed by certified instructors, not algorithms." },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} style={{ display: "flex", gap: 12 }}>
                <Icon size={20} style={{ color: "var(--color-accent)", flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{item.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
