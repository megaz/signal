"use client";

import { FONT, BORDER } from "@/lib/ui";

export function Suggestions({
  items,
  onPick,
  disabled,
}: {
  items: string[];
  onPick: (p: string) => void;
  disabled?: boolean;
}) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap" style={{ gap: 8, marginTop: 14 }}>
      {items.map((s, i) => (
        <button
          key={i}
          onClick={() => onPick(s)}
          disabled={disabled}
          style={{
            fontFamily: FONT,
            fontSize: 13,
            color: "#000",
            background: "#fff",
            border: `1.5px solid ${BORDER}`,
            borderRadius: 18,
            padding: "7px 14px",
            cursor: disabled ? "default" : "pointer",
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
