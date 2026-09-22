import { useEffect, useState } from "react";

const ROUND_INFO = {
  r1: {
    emoji: "🎯",
    subtitle: "Get ready. You have 20 questions to complete.",
    tip: "Questions get harder as you go — start strong!",
  },
  r2: {
    emoji: "🔐",
    subtitle: "Get ready for the next challenge.",
    tip: "Decode each cipher carefully. Think before you type!",
  },
  r3: {
    emoji: "🐛",
    subtitle: "Hunt the bugs hidden in the code.",
    tip: "Read each snippet carefully and spot the vulnerability.",
  },
  r4: {
    emoji: "🕵️",
    subtitle: "Investigate every clue.",
    tip: "Each station holds a flag — find them all!",
  },
};

export default function RoundStartPopup({ round, onStart }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Small delay so the animation feels intentional
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const info = ROUND_INFO[round.id] || {
    emoji: "🚀",
    subtitle: "Get ready for the next challenge.",
    tip: "Good luck!",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(8, 12, 24, 0.88)",
        backdropFilter: "blur(6px)",
        transition: "opacity 0.3s ease",
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, var(--panel-1, #0f1724) 0%, var(--panel-2, #131c30) 100%)",
          border: `2px solid var(--${round.color || "cyan"}, #4fd8f0)`,
          borderRadius: 16,
          padding: "44px 40px 36px",
          maxWidth: 480,
          width: "90%",
          textAlign: "center",
          boxShadow: `0 0 60px rgba(79,216,240,0.18), 0 8px 40px rgba(0,0,0,0.6)`,
          transform: visible ? "scale(1) translateY(0)" : "scale(0.92) translateY(20px)",
          transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease",
        }}
      >
        {/* Emoji icon */}
        <div style={{ fontSize: 56, marginBottom: 12, lineHeight: 1 }}>{info.emoji}</div>

        {/* Round number & name */}
        <div
          style={{
            fontFamily: "var(--mono, monospace)",
            fontSize: 11,
            letterSpacing: "0.15em",
            color: "var(--text-faint, #4a5568)",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          ROUND {round.order}
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: `var(--${round.color || "cyan"}, #4fd8f0)`,
            marginBottom: 12,
            letterSpacing: "-0.5px",
          }}
        >
          {round.name} Started!
        </div>

        {/* Subtitle */}
        <div
          style={{
            color: "var(--text-dim, #a0aec0)",
            fontSize: 15,
            marginBottom: 10,
            lineHeight: 1.6,
          }}
        >
          {info.subtitle}
        </div>

        {/* Tip */}
        <div
          style={{
            background: "rgba(79,216,240,0.07)",
            border: "1px solid rgba(79,216,240,0.2)",
            borderRadius: 8,
            padding: "10px 16px",
            fontSize: 13,
            color: "var(--text-dim, #a0aec0)",
            fontFamily: "var(--mono, monospace)",
            marginBottom: 28,
          }}
        >
          {"\uD83D\uDCA1"} {info.tip}
        </div>

        {/* CTA Button */}
        <button
          id={`round-start-btn-${round.id}`}
          className="btn btn-cyan"
          style={{
            width: "100%",
            padding: "14px 24px",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "0.08em",
          }}
          onClick={onStart}
        >
          {"LET'S GO \u2192"}
        </button>
      </div>
    </div>
  );
}
