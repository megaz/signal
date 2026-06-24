"use client";

import { useState } from "react";
import { FONT, BORDER, MUTED } from "@/lib/ui";
import type { RadarBackendTrace } from "@/types/radar";

export function ThinkingTrace({
  steps,
  trace,
  loading,
}: {
  steps: string[];
  trace?: RadarBackendTrace;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);
  const expanded = loading || open;

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, background: "#fafafa", marginBottom: 10 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center w-full"
        style={{ gap: 8, padding: "9px 12px", background: "transparent", border: "none", cursor: "pointer" }}
      >
        <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: "#000" }}>
          {loading ? "Thinking…" : `Thought for ${steps.length} step${steps.length === 1 ? "" : "s"}`}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: FONT, fontSize: 12, color: MUTED, transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>
          ›
        </span>
      </button>

      {expanded && (
        <div style={{ padding: "0 12px 12px" }}>
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            {steps.map((s, i) => (
              <li key={i} style={{ fontFamily: FONT, fontSize: 13, color: MUTED, lineHeight: 1.5, marginBottom: 4 }}>
                {s}
              </li>
            ))}
            {loading && steps.length === 0 && (
              <li style={{ fontFamily: FONT, fontSize: 13, color: MUTED }}>Analyzing Meta signals…</li>
            )}
          </ol>

          {trace && (
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => setTraceOpen((v) => !v)}
                style={{ fontFamily: FONT, fontSize: 12, color: MUTED, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
              >
                {traceOpen ? "Hide" : "Show"} pipeline trace
              </button>
              {traceOpen && (
                <div style={{ marginTop: 6, fontFamily: FONT, fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
                  <div><strong>Mode:</strong> {trace.mode}</div>
                  <div><strong>Confidence:</strong> {trace.confidence}</div>
                  <div style={{ marginTop: 4 }}><strong>Pipeline:</strong></div>
                  <ul style={{ margin: "2px 0 0", paddingLeft: 18 }}>
                    {trace.pipeline.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
