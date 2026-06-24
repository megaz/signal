"use client";

import { FONT } from "@/lib/ui";
import type { GrowthPoint, GrowthSummary } from "@/types/analytics";

const TRAJECTORY_COLOR: Record<string, string> = {
  scaling: "#22c55e",
  plateauing: "#E28929",
  declining: "#ef4444",
};

/** Cumulative reach/impressions growth over the campaign lifetime. */
export function GrowthChart({
  points,
  summary,
  color,
  height = 150,
}: {
  points: GrowthPoint[];
  summary: GrowthSummary;
  color: string;
  height?: number;
}) {
  const W = 320;
  const H = height;
  const padB = 22;
  const padL = 26;
  const innerW = W - padL;
  const innerH = H - padB;

  const n = points.length;
  const xs = points.map((_, i) => padL + (i / Math.max(1, n - 1)) * innerW);
  const ys = points.map((p) => innerH - (p.value / 100) * innerH + 4);
  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
  const area = `${line} L ${xs[xs.length - 1].toFixed(1)} ${innerH} L ${xs[0].toFixed(1)} ${innerH} Z`;

  // velocity bars (growth rate per step) along the bottom
  const maxVel = Math.max(...points.map((p) => p.velocity), 1);
  const barW = innerW / n * 0.5;

  const trajColor = TRAJECTORY_COLOR[summary.trajectory] ?? color;
  const stats = [
    { label: "Reach index", value: `${summary.total_reach_index}`, c: "#000" },
    { label: "Momentum", value: `${summary.momentum_pct > 0 ? "+" : ""}${summary.momentum_pct}%`, c: summary.momentum_pct >= 0 ? "#22c55e" : "#ef4444" },
    { label: "Peak day", value: `D${summary.peak_day}`, c: "#000" },
    { label: "Trajectory", value: summary.trajectory, c: trajColor },
  ];

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="grow_grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((v) => {
          const y = innerH - (v / 100) * innerH + 4;
          return (
            <g key={v}>
              <line x1={padL} y1={y} x2={W} y2={y} stroke="#eee" strokeWidth={1} />
              <text x={0} y={y + 3} style={{ fontFamily: FONT, fontSize: 9, fill: "rgba(0,0,0,0.35)" }}>{v}</text>
            </g>
          );
        })}
        {/* velocity bars */}
        {points.map((p, i) => {
          const h = (p.velocity / maxVel) * (innerH * 0.4);
          return <rect key={i} x={xs[i] - barW / 2} y={innerH - h + 4} width={barW} height={h} rx={1.5} fill={color} opacity={0.16} />;
        })}
        <path d={area} fill="url(#grow_grad)" />
        <path d={line} fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={xs[i]} cy={ys[i]} r={i === n - 1 ? 4 : 2} fill={color} stroke="#fff" strokeWidth={1} />
        ))}
        {/* X labels — show first, mid, last */}
        {[0, Math.floor(n / 2), n - 1].map((i) => (
          <text key={i} x={xs[i]} y={H - 4} textAnchor="middle" style={{ fontFamily: FONT, fontSize: 9, fill: "rgba(0,0,0,0.35)" }}>{points[i]?.label}</text>
        ))}
      </svg>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 12 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ border: "1px solid #ececec", borderRadius: 10, padding: "9px 10px" }}>
            <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: 16, color: s.c, margin: 0, textTransform: s.label === "Trajectory" ? "capitalize" : "none" }}>{s.value}</p>
            <p style={{ fontFamily: FONT, fontWeight: 400, fontSize: 10, color: "rgba(0,0,0,0.42)", margin: "2px 0 0" }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
