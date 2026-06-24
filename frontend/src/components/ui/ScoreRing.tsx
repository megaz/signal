import { FONT } from "@/lib/ui";

/** Compact circular health-score gauge (0–1 → 0–100) via a conic ring. */
export function ScoreRing({
  value,
  color,
  size = 42,
}: {
  value: number;        // 0–1
  color: string;
  size?: number;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  const inner = size - 7;
  return (
    <div
      className="flex items-center justify-center flex-none"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `conic-gradient(${color} ${pct * 3.6}deg, #ececec 0deg)`,
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{ width: inner, height: inner, borderRadius: "50%", background: "#fff" }}
      >
        <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: Math.round(size * 0.3), color: "#000" }}>
          {pct}
        </span>
      </div>
    </div>
  );
}
