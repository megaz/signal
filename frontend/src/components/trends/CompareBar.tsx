"use client";

import { useState } from "react";
import { FONT, BORDER, MUTED } from "@/lib/ui";

const GEOS = [
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "", label: "Worldwide" },
];

export function CompareBar({
  keywords,
  geo,
  colors,
  onAdd,
  onRemove,
  onGeo,
}: {
  keywords: string[];
  geo: string;
  colors: string[];
  onAdd: (k: string) => void;
  onRemove: (k: string) => void;
  onGeo: (g: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const full = keywords.length >= 5;

  const add = () => {
    onAdd(draft);
    setDraft("");
  };

  return (
    <div className="flex items-center flex-wrap" style={{ gap: 10, marginTop: 16 }}>
      {keywords.map((k, i) => (
        <span
          key={k}
          className="inline-flex items-center"
          style={{ gap: 8, border: `2px solid ${BORDER}`, borderRadius: 22, padding: "7px 12px" }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 5, background: colors[i % colors.length] }} />
          <span style={{ fontFamily: FONT, fontSize: 14, color: "#000" }}>{k}</span>
          <button
            onClick={() => onRemove(k)}
            aria-label={`Remove ${k}`}
            style={{ fontFamily: FONT, fontSize: 15, color: MUTED, background: "transparent", border: "none", cursor: "pointer", lineHeight: 1 }}
          >
            ×
          </button>
        </span>
      ))}

      {!full && (
        <div className="inline-flex items-center" style={{ gap: 6, border: `2px solid ${BORDER}`, borderRadius: 22, padding: "3px 6px 3px 12px" }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Add term…"
            style={{ fontFamily: FONT, fontSize: 14, color: "#000", border: "none", outline: "none", width: 120, background: "transparent" }}
          />
          <button
            onClick={add}
            disabled={!draft.trim()}
            style={{
              fontFamily: FONT, fontSize: 13, fontWeight: 500, color: "#fff", background: "#000", border: "none",
              borderRadius: 18, padding: "5px 12px", cursor: draft.trim() ? "pointer" : "default", opacity: draft.trim() ? 1 : 0.5,
            }}
          >
            Add
          </button>
        </div>
      )}

      <div className="flex-1" />

      <select
        value={geo}
        onChange={(e) => onGeo(e.target.value)}
        style={{ fontFamily: FONT, fontSize: 14, color: "#000", border: `2px solid ${BORDER}`, borderRadius: 22, padding: "8px 14px", background: "#fff", cursor: "pointer" }}
      >
        {GEOS.map((g) => (
          <option key={g.value} value={g.value}>{g.label}</option>
        ))}
      </select>
    </div>
  );
}
