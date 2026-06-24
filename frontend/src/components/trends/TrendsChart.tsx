"use client";

import { scaleTime, scaleLinear, line } from "d3";
import { useContainerWidth } from "@/hooks/useContainerWidth";
import { FONT, BORDER, MUTED } from "@/lib/ui";
import { shortDate } from "@/lib/format";
import type { TrendSeries } from "@/types/trends";

export const SERIES_COLORS = ["#2F6FE0", "#66A737", "#D9531F", "#8a8bc7", "#E28929"];

export function TrendsChart({ series }: { series: TrendSeries[] }) {
  const [ref, width] = useContainerWidth();
  const height = 300;
  const m = { top: 16, right: 20, bottom: 28, left: 34 };
  const w = Math.max(width || 640, 360);

  const all = series.flatMap((s) => s.points.map((p) => new Date(p.date).getTime()));
  const hasData = all.length > 0;

  let x = scaleTime();
  const y = scaleLinear().domain([0, 100]).range([height - m.bottom, m.top]);
  let xTicks: Date[] = [];

  if (hasData) {
    x = scaleTime().domain([new Date(Math.min(...all)), new Date(Math.max(...all))]).range([m.left, w - m.right]);
    xTicks = x.ticks(6);
  }

  const mkLine = line<{ date: string; value: number }>()
    .x((d) => x(new Date(d.date)))
    .y((d) => y(d.value));

  return (
    <div ref={ref}>
      {!hasData ? (
        <div style={{ fontFamily: FONT, color: MUTED, padding: "60px 0", textAlign: "center" }}>No trend data to plot.</div>
      ) : (
        <svg width={w} height={height}>
          {y.ticks(5).map((t, i) => (
            <g key={i}>
              <line x1={m.left} x2={w - m.right} y1={y(t)} y2={y(t)} stroke={BORDER} />
              <text x={m.left - 8} y={y(t) + 4} textAnchor="end" style={{ fontFamily: FONT, fontSize: 11, fill: MUTED }}>{t}</text>
            </g>
          ))}
          {xTicks.map((t, i) => (
            <text key={i} x={x(t)} y={height - m.bottom + 18} textAnchor="middle" style={{ fontFamily: FONT, fontSize: 11, fill: MUTED }}>
              {shortDate(t)}
            </text>
          ))}
          {series.map((s, i) => (
            <path key={s.keyword} d={mkLine(s.points) ?? ""} fill="none" stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={2.5} strokeLinejoin="round" />
          ))}
        </svg>
      )}
    </div>
  );
}
