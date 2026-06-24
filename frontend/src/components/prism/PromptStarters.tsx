"use client";

import { FONT, BORDER, MUTED } from "@/lib/ui";

const STARTERS = [
  {
    title: "Scan the competitive field",
    prompt: "Research what our top competitors are running right now and where the category is saturated.",
  },
  {
    title: "Find white-space opportunity",
    prompt: "Where is the white-space opportunity for our brand based on current market and our own ad fatigue?",
  },
  {
    title: "Decode a rising trend",
    prompt: "What cultural or creative trend is rising in our category right now, and how should we act on it?",
  },
  {
    title: "Draft a creative brief",
    prompt: "Draft a research-backed creative brief for our next campaign.",
  },
  {
    title: "Diagnose ad fatigue",
    prompt: "Which of our creatives are fatiguing, and what should replace them?",
  },
  {
    title: "Benchmark our channel mix",
    prompt: "Benchmark our channel strategy against current industry data and competitor activity.",
  },
];

export function PromptStarters({ onPick, disabled }: { onPick: (p: string) => void; disabled?: boolean }) {
  return (
    <div style={{ paddingTop: 48 }}>
      <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 30, color: "#000", letterSpacing: "-0.01em" }}>Prism</div>
      <div style={{ fontFamily: FONT, fontSize: 15, color: MUTED, marginTop: 6, marginBottom: 28 }}>
        Marketing intelligence that researches the open web and your own ads, then shows its work.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
        {STARTERS.map((s) => (
          <button
            key={s.title}
            onClick={() => onPick(s.prompt)}
            disabled={disabled}
            className="text-left transition-transform hover:-translate-y-0.5"
            style={{
              fontFamily: FONT,
              border: `1.5px solid ${BORDER}`,
              borderRadius: 14,
              padding: "14px 16px",
              background: "#fff",
              cursor: disabled ? "default" : "pointer",
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 500, color: "#000", marginBottom: 4 }}>{s.title}</div>
            <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.4 }}>{s.prompt}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
