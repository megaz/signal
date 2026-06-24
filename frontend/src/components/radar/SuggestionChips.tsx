"use client";

import { FONT, BORDER, MUTED } from "@/lib/ui";
import type { RadarEditSuggestion } from "@/types/radar";

export function SuggestionChips({
  suggestions,
  editSuggestions,
  onPick,
  disabled,
}: {
  suggestions: string[];
  editSuggestions: RadarEditSuggestion[];
  onPick: (prompt: string) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ marginTop: 12 }}>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap" style={{ gap: 8 }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              disabled={disabled}
              onClick={() => onPick(s)}
              style={{
                fontFamily: FONT, fontSize: 13, color: "#000", background: "#fff",
                border: `1.5px solid ${BORDER}`, borderRadius: 18, padding: "6px 14px",
                cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {editSuggestions.length > 0 && (
        <div className="flex flex-col" style={{ gap: 8, marginTop: 10 }}>
          {editSuggestions.map((e) => (
            <button
              key={e.id}
              disabled={disabled}
              onClick={() => onPick(e.title)}
              className="flex flex-col text-left"
              style={{
                border: `1.5px solid ${BORDER}`, borderRadius: 12, padding: "10px 12px", background: "#fff",
                cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1,
              }}
            >
              <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: "#000" }}>{e.title} →</span>
              <span style={{ fontFamily: FONT, fontSize: 12, color: MUTED, marginTop: 2 }}>{e.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
