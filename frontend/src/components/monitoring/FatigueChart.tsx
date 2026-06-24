"use client";

import { scaleTime, scaleLinear, line } from "d3";
import { useContainerWidth } from "@/hooks/useContainerWidth";
import { FONT, BORDER, MUTED } from "@/lib/ui";
import { shortDate } from "@/lib/format";
import type { MetricPoint } from "@/types/monitoring";

const CPA_COLOR = "#C9391A";
const FREQ_COLOR = "#2F6FE0";

interface Datum {
  date: Date;
  cpaIndex: number;
  freq: number;
}

export function FatigueChart({ points }: { points: MetricPoint[] }) {
  const [ref, width] = useContainerWidth();
  const height = 280;
  const m = { top: 30, right: 54, bottom: 30, left: 50 };

  const w = Math.max(width || 640, 360);
  const enough = points.length >= 2;

  const data: Datum[] = enough
    ? points.map((p) => ({
        date: new Date(p.date),
        cpaIndex: points[0].cpa ? (p.cpa / points[0].cpa) * 100 : 100,
        freq: p.frequency,
      }))
    : [];

  let cpaPath = "";
  let freqPath = "";
  let xTicks: Date[] = [];
  let yLTicks: number[] = [];
  let yRTicks: number[] = [];
  let x = scaleTime();
  let yL = scaleLinear();
  let yR = scaleLinear();

  if (enough) {
    const cpaVals = data.map((d) => d.cpaIndex);
    const freqVals = data.map((d) => d.freq);
    x = scaleTime().domain([data[0].date, data[data.length - 1].date]).range([m.left, w - m.right]);
    yL = scaleLinear().domain([Math.min(...cpaVals) * 0.92, Math.max(...cpaVals) * 1.06]).range([height - m.bottom, m.top]).nice();
    yR = scaleLinear().domain([Math.min(...freqVals) * 0.9, Math.max(...freqVals) * 1.08]).range([height - m.bottom, m.top]).nice();
    cpaPath = line<Datum>().x((d) => x(d.date)).y((d) => yL(d.cpaIndex))(data) ?? "";
    freqPath = line<Datum>().x((d) => x(d.date)).y((d) => yR(d.freq))(data) ?? "";
    xTicks = x.ticks(5);
    yLTicks = yL.ticks(4);
    yRTicks = yR.ticks(4);
  }

  return (
    <div
      ref={ref}
      className="flex flex-col"
      style={{ border: `2px solid ${BORDER}`, borderRadius: 18, padding: 16, background: "#fff" }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
        <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 16, color: "#000" }}>Fatigue signal</span>
        <div className="flex items-center" style={{ gap: 16 }}>
          <Legend color={CPA_COLOR} label="CPA (indexed)" />
          <Legend color={FREQ_COLOR} label="Frequency" />
        </div>
      </div>

      {!enough ? (
        <div style={{ fontFamily: FONT, color: MUTED, padding: "60px 0", textAlign: "center" }}>Not enough data yet.</div>
      ) : (
        <svg width={w} height={height}>
          {yLTicks.map((t, i) => (
            <g key={`gl-${i}`}>
              <line x1={m.left} x2={w - m.right} y1={yL(t)} y2={yL(t)} stroke={BORDER} />
              <text x={m.left - 8} y={yL(t) + 4} textAnchor="end" style={{ fontFamily: FONT, fontSize: 11, fill: MUTED }}>
                {Math.round(t)}
              </text>
            </g>
          ))}
          {yRTicks.map((t, i) => (
            <text key={`gr-${i}`} x={w - m.right + 8} y={yR(t) + 4} textAnchor="start" style={{ fontFamily: FONT, fontSize: 11, fill: MUTED }}>
              {t.toFixed(1)}
            </text>
          ))}
          {xTicks.map((t, i) => (
            <text key={`gx-${i}`} x={x(t)} y={height - m.bottom + 18} textAnchor="middle" style={{ fontFamily: FONT, fontSize: 11, fill: MUTED }}>
              {shortDate(t)}
            </text>
          ))}
          <path d={cpaPath} fill="none" stroke={CPA_COLOR} strokeWidth={2.5} />
          <path d={freqPath} fill="none" stroke={FREQ_COLOR} strokeWidth={2.5} />
        </svg>
      )}
      <span style={{ fontFamily: FONT, fontSize: 12, color: MUTED, marginTop: 4 }}>
        Rising CPA crossing rising frequency is the classic fatigue “scissors”.
      </span>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center" style={{ gap: 6 }}>
      <span style={{ width: 14, height: 3, borderRadius: 2, background: color }} />
      <span style={{ fontFamily: FONT, fontSize: 12, color: MUTED }}>{label}</span>
    </span>
  );
}
