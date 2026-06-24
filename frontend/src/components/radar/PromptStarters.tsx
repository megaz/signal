"use client";

import { FONT, BORDER, MUTED } from "@/lib/ui";

const STARTERS = [
  { title: "Map our creative genome", prompt: "Map our creative genome" },
  { title: "Where are we saturated?", prompt: "Where are we saturated?" },
  { title: "Find white-space opportunity", prompt: "Find white-space opportunity" },
  { title: "Compare us to competitors", prompt: "Compare us to competitors" },
  { title: "Draft a creative brief", prompt: "Draft a creative brief for our next campaign" },
  { title: "Give me 3 Luma concepts", prompt: "Generate 3 Luma concepts" },
];

export function PromptStarters({ onPick, disabled }: { onPick: (p: string) => void; disabled?: boolean }) {
  return (
    <div style={{ paddingTop: 48 }}>
      <h1 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 30, color: "#000" }}>Creative Genome Radar</h1>
      <p style={{ fontFamily: FONT, fontSize: 15, color: MUTED, marginTop: 6 }}>
        Ask about saturation, white-space, competitors, or a brief — answers come back as interactive cards.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 22 }}>
        {STARTERS.map((s, i) => (
          <button
            key={i}
            disabled={disabled}
            onClick={() => onPick(s.prompt)}
            className="text-left transition-transform hover:-translate-y-0.5"
            style={{ border: `2px solid ${BORDER}`, borderRadius: 14, padding: 16, background: "#fff", cursor: disabled ? "default" : "pointer" }}
          >
            <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 500, color: "#000" }}>{s.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
