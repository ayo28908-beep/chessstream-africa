import { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ExternalLink, GraduationCap, Target, Trophy } from "lucide-react";

export const metadata: Metadata = {
  title: "Chess Courses",
  description: "Structured chess courses from Prochess Academy. Learn chess from beginner to advanced with FIDE-certified coaches.",
  openGraph: {
    title: "Chess Courses | ChessStream Africa",
    description: "Structured chess courses from Prochess Academy.",
  },
};

const courses = [
  {
    level: "Beginner",
    title: "Your First Moves",
    description: "Learn the rules, basic checkmates, and how to play your first real game with confidence.",
    icon: Target,
    color: "var(--color-accent)",
  },
  {
    level: "Intermediate",
    title: "Level Up Your Game",
    description: "Master opening principles, tactical motifs, and simple endgames to crush your opponents.",
    icon: GraduationCap,
    color: "var(--color-gold)",
  },
  {
    level: "Advanced",
    title: "Tournament Ready",
    description: "Deep middlegame strategy, precise calculation, and tournament preparation.",
    icon: Trophy,
    color: "#ef4444",
  },
];

export default function CoursesPage() {
  return (
    <div className="wrap" style={{ padding: "32px 0" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Chess Courses</h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: 32, fontSize: 16 }}>
        Structured chess education from Prochess Academy
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
        {courses.map((course) => (
          <div key={course.level} className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: `${course.color}20`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <course.icon size={20} style={{ color: course.color }} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600 }}>{course.level}</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{course.title}</div>
              </div>
            </div>
            <p style={{ color: "var(--color-text-muted)", fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
              {course.description}
            </p>
            <Link
              href="https://prochess-lovat.vercel.app/courses"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ width: "100%" }}
            >
              Learn at Prochess Academy <ExternalLink size={14} />
            </Link>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 48,
        padding: 32,
        background: "var(--color-bg-raised)",
        borderRadius: 12,
        border: "1px solid var(--color-border)",
        textAlign: "center",
      }}>
        <BookOpen size={32} style={{ color: "var(--color-accent)", marginBottom: 16 }} />
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Want structured chess education?</h2>
        <p style={{ color: "var(--color-text-muted)", marginBottom: 20, maxWidth: 500, margin: "0 auto 20px" }}>
          Prochess Academy offers comprehensive chess courses from beginner to master level.
          Learn with FIDE-certified coaches and structured curriculum.
        </p>
        <Link
          href="https://prochess-lovat.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ padding: "12px 24px" }}
        >
          Visit Prochess Academy <ExternalLink size={14} />
        </Link>
      </div>
    </div>
  );
}
