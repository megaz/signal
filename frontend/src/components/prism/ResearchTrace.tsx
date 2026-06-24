"use client";

import { useState } from "react";
import { FaviconDot } from "./SourceChip";
import { FONT, BORDER, MUTED } from "@/lib/ui";
import type { PrismMessage, PrismPhase } from "@/types/prism";

const PHASE_LABEL: Record<PrismPhase, string> = {
  thinking: "Thinking",
  researching: "Researching the web",
  writing: "Writing the answer",
  done: "Done",
};

function Dots() {
  return (
    <span className="inline-flex" style={{ gap: 3, marginLeft: 2 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            background: MUTED,
            display: "inline-block",
            animation: `prismBlink 1s ${i * 0.18}s infinite ease-in-out`,
          }}
        />
      ))}
    </span>
  );
}

export function ResearchTrace({ message }: { message: PrismMessage }) {
  const phase = message.phase ?? "thinking";
  const active = phase !== "done";
  const [manual, setManual] = useState<boolean | null>(null);
  const expanded = manual ?? active;

  const sources = message.sources ?? [];
  const searches = message.searches ?? [];
  const thinking = message.thinking ?? "";

  const summary = active
    ? PHASE_LABEL[phase]
    : sources.length
      ? `Researched ${sources.length} source${sources.length === 1 ? "" : "s"}`
      : "Reasoned through it";

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, background: "#fafafa", marginBottom: 12, overflow: "hidden" }}>
      <button
        onClick={() => setManual((v) => !(v ?? active))}
        className="flex items-center w-full"
        style={{ gap: 8, padding: "9px 12px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: "#000" }}>{summary}</span>
        {active && <Dots />}
        <span style={{ flex: 1 }} />
        {sources.length > 0 && (
          <span className="flex items-center" style={{ gap: 4, marginRight: 6 }}>
            {sources.slice(0, 5).map((s, i) => (
              <FaviconDot key={s.url} source={s} index={i} />
            ))}
            {sources.length > 5 && (
              <span style={{ fontFamily: FONT, fontSize: 11, color: MUTED }}>+{sources.length - 5}</span>
            )}
          </span>
        )}
        <span style={{ fontFamily: FONT, fontSize: 12, color: MUTED, transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>
          ›
        </span>
      </button>

      {expanded && (
        <div style={{ padding: "0 12px 12px" }}>
          {searches.length > 0 && (
            <div className="flex flex-wrap" style={{ gap: 6, marginBottom: thinking ? 10 : 0 }}>
              {searches.map((q, i) => (
                <span
                  key={i}
                  style={{ fontFamily: FONT, fontSize: 11.5, color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "3px 9px", background: "#fff" }}
                >
                  🔍 {q}
                </span>
              ))}
            </div>
          )}

          {thinking ? (
            <div
              style={{
                fontFamily: FONT,
                fontSize: 12.5,
                color: "rgba(0,0,0,0.55)",
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
                maxHeight: active ? 180 : 320,
                overflowY: "auto",
                borderLeft: `2px solid ${BORDER}`,
                paddingLeft: 10,
              }}
            >
              {thinking}
              {phase === "thinking" && <span style={{ opacity: 0.5 }}>▍</span>}
            </div>
          ) : (
            phase === "thinking" && (
              <div style={{ fontFamily: FONT, fontSize: 12.5, color: MUTED }}>Forming an approach…</div>
            )
          )}
        </div>
      )}
    </div>
  );
}
