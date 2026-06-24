"use client";

import { FONT, BORDER, MUTED, INK } from "@/lib/ui";
import { BEAT_LABELS } from "@/lib/constants";
import type { PlanData } from "@/types/beat";
import type { Beat } from "@/types/beat";

const ORANGE = "#E28929";
const RED = "#C9391A";
const GREEN = "#66A737";

interface Props {
  planData: PlanData;
  beats: Beat[];
  planLoading: boolean;
}

function PulseLoader({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center" style={{ gap: 10, padding: "20px 0" }}>
      <div className="flex" style={{ gap: 7 }}>
        {[GREEN, ORANGE, ORANGE, ORANGE, RED].map((c, i) => (
          <span
            key={i}
            style={{
              width: 8, height: 8, borderRadius: 4, background: c,
              animation: `beatpulse 1.2s ease-in-out ${i * 0.16}s infinite`,
              opacity: 0.3,
            }}
          />
        ))}
      </div>
      <p style={{ fontFamily: FONT, fontSize: 13, color: MUTED }}>{label}</p>
      <style>{`@keyframes beatpulse { 0%,100%{opacity:0.25;transform:translateY(0)} 50%{opacity:1;transform:translateY(-3px)} }`}</style>
    </div>
  );
}

export function PlanStage({ planData, beats, planLoading }: Props) {
  if (planLoading) {
    return (
      <div style={{ border: `1.5px solid ${BORDER}`, borderRadius: 16, background: "#fafafa", padding: "12px 20px", marginBottom: 18 }}>
        <PulseLoader label="Planning your refresh…" />
      </div>
    );
  }

  const isVariations = planData.strategy === "variations";
  const accent = isVariations ? ORANGE : RED;

  // Resolve beat labels from IDs
  const affectedBeats = planData.affected_beat_ids
    .map((id) => beats.find((b) => b.id === id))
    .filter(Boolean) as Beat[];

  const affectedLabel = affectedBeats
    .map((b) => BEAT_LABELS[b.beat_type] ?? b.beat_type)
    .join(", ");

  return (
    <div
      style={{
        border: `2px solid ${accent}`,
        borderRadius: 16,
        background: `${accent}08`,
        padding: "16px 20px",
        marginBottom: 18,
      }}
    >
      {/* Header */}
      <div className="flex items-center" style={{ gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>{isVariations ? "⚡" : "🔁"}</span>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 15, color: accent }}>
          {isVariations ? "Variations" : "Full Recreate"}
        </span>
        <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 14, color: INK }}>
          — {planData.rationale}
        </span>
      </div>

      {/* Affected beats (Variations only) */}
      {isVariations && affectedLabel && (
        <p style={{ fontFamily: FONT, fontSize: 13, color: MUTED, marginBottom: 8 }}>
          Patching: <strong style={{ color: INK }}>{affectedLabel}</strong>
          {" "}— keeping the rest intact.
        </p>
      )}

      {/* Reasoning steps */}
      <ol style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: 4 }}>
        {planData.reasoning_steps.map((step, i) => (
          <li key={i} style={{ fontFamily: FONT, fontSize: 12, color: MUTED }}>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
