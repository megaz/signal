"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Sparkline } from "@/components/monitoring/Sparkline";
import { FONT, BORDER, MUTED } from "@/lib/ui";
import type { TrendSeries } from "@/types/trends";

interface Row {
  keyword: string;
  color: string;
  latest: number;
  growth: number;       // % first → last
  values: number[];
  breakout: boolean;
}

function buildRows(series: TrendSeries[], colors: string[]): Row[] {
  return series.map((s, i) => {
    const values = s.points.map((p) => p.value);
    const first = values.find((v) => v > 0) ?? 0;
    const last = values.length ? values[values.length - 1] : 0;
    const growth = first ? Math.round(((last - first) / first) * 100) : 0;
    return {
      keyword: s.keyword,
      color: colors[i % colors.length],
      latest: last,
      growth,
      values,
      breakout: growth >= 50,
    };
  });
}

export function RisingTopTabs({ series, colors }: { series: TrendSeries[]; colors: string[] }) {
  const [tab, setTab] = useState<"rising" | "top">("rising");
  const rows = useMemo(() => buildRows(series, colors), [series, colors]);
  const sorted = useMemo(
    () => rows.slice().sort((a, b) => (tab === "rising" ? b.growth - a.growth : b.latest - a.latest)),
    [rows, tab],
  );

  return (
    <div style={{ marginTop: 20 }}>
      <div className="flex items-center" style={{ gap: 6, border: `2px solid ${BORDER}`, borderRadius: 24, padding: 4, width: "fit-content" }}>
        {(["rising", "top"] as const).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                fontFamily: FONT, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none",
                borderRadius: 18, padding: "6px 16px", textTransform: "capitalize",
                background: active ? "#000" : "transparent", color: active ? "#fff" : "#000",
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14, marginTop: 14 }}>
        {sorted.map((r) => {
          const up = r.growth >= 0;
          const growthColor = up ? "#66A737" : "#C9391A";
          return (
            <div key={r.keyword} style={{ border: `2px solid ${BORDER}`, borderRadius: 16, padding: 16, background: "#fff" }}>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center" style={{ gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 5, background: r.color }} />
                  <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 15, color: "#000" }}>{r.keyword}</span>
                </span>
                {r.breakout && (
                  <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: "#fff", background: "#C9391A", borderRadius: 10, padding: "2px 8px" }}>
                    Breakout
                  </span>
                )}
              </div>
              <div className="flex items-baseline" style={{ gap: 8, marginTop: 8 }}>
                <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 26, color: "#000" }}>{r.latest}</span>
                <span style={{ fontFamily: FONT, fontSize: 13, color: MUTED }}>interest</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: growthColor }}>
                  {up ? "▲" : "▼"} {Math.abs(r.growth)}%
                </span>
              </div>
              <div style={{ marginTop: 10 }}>
                <Sparkline values={r.values} width={200} height={32} color={r.color} />
              </div>
              <Link
                href="/radar"
                style={{ fontFamily: FONT, fontSize: 13, color: "#000", marginTop: 10, display: "inline-block", textDecoration: "underline" }}
              >
                Explore in Radar →
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
