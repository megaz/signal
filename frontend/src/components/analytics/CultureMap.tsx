"use client";

import { FONT } from "@/lib/ui";
import type { CultureMap as CultureMapData, CultureNode } from "@/types/analytics";

const SENTIMENT_COLOR: Record<string, string> = {
  positive: "#22c55e",
  neutral: "#E28929",
  watch: "#9CA3AF",
};

/** A generated 2-D map of the brand's cultural footprint.

   Reusable: pass any CultureMap payload from the analytics endpoint. Nodes are
   positioned by reach (x) and resonance (y); size encodes engagement share. */
export function CultureMap({ data, size = 360 }: { data: CultureMapData; size?: number }) {
  const S = size;
  const pad = 30;
  const inner = S - pad * 2;

  const px = (x: number) => pad + x * inner;
  const py = (y: number) => pad + (1 - y) * inner; // invert: high y at top

  // radius from strength (sqrt so small themes stay visible)
  const r = (n: CultureNode) => 10 + Math.sqrt(n.strength) * 34;

  return (
    <div>
      <div style={{ display: "flex", gap: 20, alignItems: "stretch", flexWrap: "wrap" }}>
        {/* Map */}
        <div style={{ position: "relative", flex: "0 0 auto" }}>
          <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ display: "block" }}>
            {/* plot frame */}
            <rect x={pad} y={pad} width={inner} height={inner} rx={14} fill="#faf9f7" stroke="#ececec" strokeWidth={1} />
            {/* quadrant guides */}
            <line x1={pad + inner / 2} y1={pad} x2={pad + inner / 2} y2={pad + inner} stroke="#ececec" strokeWidth={1} strokeDasharray="4 5" />
            <line x1={pad} y1={pad + inner / 2} x2={pad + inner} y2={pad + inner / 2} stroke="#ececec" strokeWidth={1} strokeDasharray="4 5" />

            {/* nodes */}
            {data.nodes.map((n) => {
              const c = SENTIMENT_COLOR[n.sentiment] ?? "#9CA3AF";
              const cx = px(n.x);
              const cy = py(n.y);
              const rad = r(n);
              return (
                <g key={n.id}>
                  {n.aligned && (
                    <circle cx={cx} cy={cy} r={rad + 6} fill="none" stroke="#000" strokeWidth={1.5} strokeDasharray="3 3" />
                  )}
                  <circle cx={cx} cy={cy} r={rad} fill={c} fillOpacity={0.22} stroke={c} strokeWidth={1.6} />
                  <circle cx={cx} cy={cy} r={3} fill={c} />
                  <text x={cx} y={cy - rad - 6} textAnchor="middle" style={{ fontFamily: FONT, fontWeight: 600, fontSize: 11, fill: "#000" }}>
                    {n.label}
                  </text>
                  <text x={cx} y={cy + rad + 13} textAnchor="middle" style={{ fontFamily: FONT, fontWeight: 500, fontSize: 9, fill: "rgba(0,0,0,0.4)" }}>
                    {Math.round(n.strength * 100)}% · {n.posts} posts
                  </text>
                </g>
              );
            })}

            {/* axis labels */}
            <text x={pad} y={S - 6} style={{ fontFamily: FONT, fontSize: 10, fill: "rgba(0,0,0,0.4)" }}>{data.x_axis.low}</text>
            <text x={pad + inner} y={S - 6} textAnchor="end" style={{ fontFamily: FONT, fontSize: 10, fill: "rgba(0,0,0,0.4)" }}>{data.x_axis.high}</text>
            <text x={pad - 6} y={pad + inner} textAnchor="end" transform={`rotate(-90 ${pad - 6} ${pad + inner})`} style={{ fontFamily: FONT, fontSize: 10, fill: "rgba(0,0,0,0.4)" }}>{data.y_axis.low}</text>
            <text x={pad - 6} y={pad + 4} textAnchor="end" transform={`rotate(-90 ${pad - 6} ${pad + 4})`} style={{ fontFamily: FONT, fontSize: 10, fill: "rgba(0,0,0,0.4)" }}>{data.y_axis.high}</text>
          </svg>
        </div>

        {/* Side panel: headline + legend + theme list */}
        <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "#faf9f7", border: "1px solid #ececec", borderRadius: 12, padding: "14px 16px" }}>
            <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 10, color: "rgba(0,0,0,0.4)", letterSpacing: "0.07em", textTransform: "uppercase", margin: "0 0 6px" }}>Cultural read</p>
            <p style={{ fontFamily: FONT, fontWeight: 400, fontSize: 13, color: "#000", lineHeight: 1.6, margin: 0 }}>{data.headline}</p>
          </div>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {[
              { k: "positive", t: "High resonance" },
              { k: "neutral", t: "Mid resonance" },
              { k: "watch", t: "Emerging / watch" },
            ].map((l) => (
              <div key={l.k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: SENTIMENT_COLOR[l.k] }} />
                <span style={{ fontFamily: FONT, fontSize: 11, color: "rgba(0,0,0,0.55)" }}>{l.t}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 11, height: 11, borderRadius: "50%", border: "1.5px dashed #000" }} />
              <span style={{ fontFamily: FONT, fontSize: 11, color: "rgba(0,0,0,0.55)" }}>This creative&apos;s lane</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {data.nodes.map((n) => {
              const c = SENTIMENT_COLOR[n.sentiment] ?? "#9CA3AF";
              return (
                <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f3f3f3" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, flexShrink: 0 }} />
                  <span style={{ fontFamily: FONT, fontWeight: n.aligned ? 600 : 500, fontSize: 13, color: "#000", flex: 1 }}>
                    {n.label}{n.aligned && <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 11, color: "rgba(0,0,0,0.4)" }}> · this creative</span>}
                  </span>
                  <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: c }}>{Math.round(n.strength * 100)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
