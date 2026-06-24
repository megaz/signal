"use client";

import { scaleTime, scaleLinear, scaleSqrt, extent, max } from "d3";
import { useContainerWidth } from "@/hooks/useContainerWidth";
import { FONT, BORDER, MUTED } from "@/lib/ui";
import { healthToLight, HEALTH_LABELS } from "@/lib/constants";
import { shortDate, formatCompact } from "@/lib/format";
import type { AdHealth } from "@/types/ad";

export interface TimelinePoint {
  date: Date;
  er: number;
  views: number;
  health: AdHealth;
  title: string;
}

const HEALTHS: AdHealth[] = ["thriving", "aging", "fatiguing", "declining"];

export function PerformanceTimeline({ points }: { points: TimelinePoint[] }) {
  const [ref, width] = useContainerWidth();
  const height = 320;
  const m = { top: 18, right: 24, bottom: 34, left: 46 };
  const w = Math.max(width || 720, 360);
  const enough = points.length >= 2;

  let body: React.ReactNode = (
    <div style={{ fontFamily: FONT, color: MUTED, padding: "60px 0", textAlign: "center" }}>Not enough data yet.</div>
  );

  if (enough) {
    const dates = points.map((p) => p.date);
    const x = scaleTime().domain(extent(dates) as [Date, Date]).range([m.left, w - m.right]);
    const yMax = (max(points, (p) => p.er) ?? 0.05) * 1.18;
    const y = scaleLinear().domain([0, yMax]).range([height - m.bottom, m.top]).nice();
    const r = scaleSqrt().domain([0, max(points, (p) => p.views) ?? 1]).range([3, 26]);

    // Least-squares trend of ER over time (days since first post) — the real fatigue signal.
    const t0 = dates[0].getTime();
    const day = (d: Date) => (d.getTime() - t0) / 86_400_000;
    const n = points.length;
    const sx = points.reduce((s, p) => s + day(p.date), 0);
    const sy = points.reduce((s, p) => s + p.er, 0);
    const sxx = points.reduce((s, p) => s + day(p.date) ** 2, 0);
    const sxy = points.reduce((s, p) => s + day(p.date) * p.er, 0);
    const denom = n * sxx - sx * sx;
    const slope = denom ? (n * sxy - sx * sy) / denom : 0;
    const intercept = (sy - slope * sx) / n;
    const lastDay = day(dates[dates.length - 1]);
    const trendUp = slope >= 0;
    const clampY = (v: number) => Math.max(0, Math.min(yMax, v));

    body = (
      <svg width={w} height={height}>
        {y.ticks(5).map((t, i) => (
          <g key={i}>
            <line x1={m.left} x2={w - m.right} y1={y(t)} y2={y(t)} stroke={BORDER} />
            <text x={m.left - 8} y={y(t) + 4} textAnchor="end" style={{ fontFamily: FONT, fontSize: 11, fill: MUTED }}>
              {(t * 100).toFixed(1)}%
            </text>
          </g>
        ))}
        {x.ticks(6).map((t, i) => (
          <text key={i} x={x(t)} y={height - m.bottom + 18} textAnchor="middle" style={{ fontFamily: FONT, fontSize: 11, fill: MUTED }}>
            {shortDate(t)}
          </text>
        ))}

        {/* Trend line (engagement-rate direction over publish time) */}
        <line
          x1={x(dates[0])} y1={y(clampY(intercept))}
          x2={x(dates[dates.length - 1])} y2={y(clampY(intercept + slope * lastDay))}
          stroke={trendUp ? "#66A737" : "#C9391A"} strokeWidth={2} strokeDasharray="6 5"
        />

        {/* Posts as bubbles: size = views, color = health */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={x(p.date)} cy={y(p.er)} r={r(p.views)}
            fill={healthToLight(p.health)} fillOpacity={0.55}
            stroke={healthToLight(p.health)} strokeWidth={1.5}
          >
            <title>{`${p.title}\n${formatCompact(p.views)} views · ${(p.er * 100).toFixed(1)}% ER · ${HEALTH_LABELS[p.health]}`}</title>
          </circle>
        ))}
      </svg>
    );
  }

  return (
    <div ref={ref} className="flex flex-col" style={{ border: `2px solid ${BORDER}`, borderRadius: 18, padding: 16, background: "#fff" }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 16, color: "#000" }}>Creative performance over time</span>
        <div className="flex items-center flex-wrap" style={{ gap: 12 }}>
          {HEALTHS.map((h) => (
            <span key={h} className="inline-flex items-center" style={{ gap: 5 }}>
              <span style={{ width: 9, height: 9, borderRadius: 5, background: healthToLight(h) }} />
              <span style={{ fontFamily: FONT, fontSize: 11, color: MUTED }}>{HEALTH_LABELS[h]}</span>
            </span>
          ))}
        </div>
      </div>
      {body}
      <span style={{ fontFamily: FONT, fontSize: 12, color: MUTED, marginTop: 4 }}>
        Each bubble is a real post at its publish date · y = engagement rate · size = views. Dashed line = engagement trend.
      </span>
    </div>
  );
}
