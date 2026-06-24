"use client";

import { FONT } from "@/lib/ui";
import type { RetentionPoint, RetentionSummary } from "@/types/analytics";

/** Audience-retention curve over the creative runtime. Reusable across pages. */
export function RetentionChart({
  points,
  summary,
  color,
  height = 150,
}: {
  points: RetentionPoint[];
  summary: RetentionSummary;
  color: string;
  height?: number;
}) {
  const W = 320;
  const H = height;
  const padB = 22;
  const padL = 26;
  const innerW = W - padL;
  const innerH = H - padB;

  const xs = points.map((_, i) => padL + (i / Math.max(1, points.length - 1)) * innerW);
  const ys = points.map((p) => innerH - (p.value / 100) * innerH + 4);
  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
  const area = `${line} L ${xs[xs.length - 1].toFixed(1)} ${innerH} L ${xs[0].toFixed(1)} ${innerH} Z`;

  const stats = [
    { label: "Avg retention", value: `${summary.avg_retention}%`, c: color },
    { label: "Hook hold", value: `${summary.hook_hold}%`, c: "#000" },
    { label: "Drop-off", value: `${summary.drop_off}%`, c: "#ef4444" },
    { label: "Completion", value: `${summary.completion}%`, c: "#000" },
  ];

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="ret_grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Y grid + labels */}
        {[0, 25, 50, 75, 100].map((v) => {
          const y = innerH - (v / 100) * innerH + 4;
          return (
            <g key={v}>
              <line x1={padL} y1={y} x2={W} y2={y} stroke="#eee" strokeWidth={1} />
              <text x={0} y={y + 3} style={{ fontFamily: FONT, fontSize: 9, fill: "rgba(0,0,0,0.35)" }}>{v}</text>
            </g>
          );
        })}
        <path d={area} fill="url(#ret_grad)" />
        <path d={line} fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={xs[i]} cy={ys[i]} r={i === points.length - 1 ? 4 : 2.2} fill={color} stroke="#fff" strokeWidth={1} />
        ))}
        {/* X labels */}
        <text x={padL} y={H - 4} style={{ fontFamily: FONT, fontSize: 9, fill: "rgba(0,0,0,0.35)" }}>Start</text>
        <text x={padL + innerW / 2 - 18} y={H - 4} style={{ fontFamily: FONT, fontSize: 9, fill: "rgba(0,0,0,0.35)" }}>Runtime</text>
        <text x={W - 16} y={H - 4} style={{ fontFamily: FONT, fontSize: 9, fill: "rgba(0,0,0,0.35)" }}>End</text>
      </svg>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 12 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ border: "1px solid #ececec", borderRadius: 10, padding: "9px 10px" }}>
            <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: 16, color: s.c, margin: 0 }}>{s.value}</p>
            <p style={{ fontFamily: FONT, fontWeight: 400, fontSize: 10, color: "rgba(0,0,0,0.42)", margin: "2px 0 0" }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
