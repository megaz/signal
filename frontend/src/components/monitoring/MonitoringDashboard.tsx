"use client";

import { useState } from "react";
import { useMonitoring } from "@/hooks/useMonitoring";
import { KpiTile } from "./KpiTile";
import { AlertStrip } from "./AlertStrip";
import { FatigueChart } from "./FatigueChart";
import { CreativeTable } from "./CreativeTable";
import { FONT, PAGE_PAD, BORDER, MUTED } from "@/lib/ui";
import { healthToLight, HEALTH_LABELS } from "@/lib/constants";
import type { AdHealth } from "@/types/ad";

const RANGES = ["7d", "14d", "30d", "90d"];

// Which delta direction is "good" per KPI, for coloring.
const GOOD_DIRECTION: Record<string, "up" | "down" | undefined> = {
  spend: undefined,
  ctr: "up",
  frequency: "down",
  fatiguing: undefined,
};

const HEALTH_ORDER: AdHealth[] = ["thriving", "aging", "fatiguing", "declining"];

export function MonitoringDashboard() {
  const [range, setRange] = useState("30d");
  const { overview, timeseries, creatives, loading, error } = useMonitoring(range);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto" style={{ paddingLeft: PAGE_PAD, paddingRight: PAGE_PAD, paddingBottom: PAGE_PAD }}>
      {/* Title + range */}
      <div className="flex items-center justify-between flex-wrap" style={{ gap: 12, marginTop: 18 }}>
        <div className="flex items-baseline" style={{ gap: 12 }}>
          <h1 style={{ fontFamily: FONT, fontWeight: 500, fontSize: 26, color: "#000" }}>Monitoring</h1>
          <span style={{ fontFamily: FONT, fontSize: 14, color: MUTED }}>deltas vs previous period</span>
        </div>
        <div className="flex items-center" style={{ gap: 6, border: `2px solid ${BORDER}`, borderRadius: 24, padding: 4 }}>
          {RANGES.map((r) => {
            const active = range === r;
            return (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  fontFamily: FONT, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none",
                  borderRadius: 18, padding: "6px 14px",
                  background: active ? "#000" : "transparent", color: active ? "#fff" : "#000",
                }}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <div style={{ fontFamily: FONT, color: "#C9391A", padding: "60px 0", textAlign: "center" }}>
          Couldn’t load monitoring data: {error}
        </div>
      ) : loading || !overview || !timeseries || !creatives ? (
        <div style={{ fontFamily: FONT, color: MUTED, padding: "60px 0", textAlign: "center" }}>Loading monitoring…</div>
      ) : (
        <>
          {/* Health breakdown bar */}
          <div style={{ marginTop: 16 }}>
            <div className="flex" style={{ height: 10, borderRadius: 6, overflow: "hidden", border: `1px solid ${BORDER}` }}>
              {HEALTH_ORDER.map((h) => {
                const n = overview.health_breakdown[h] ?? 0;
                const pct = overview.total ? (n / overview.total) * 100 : 0;
                return <div key={h} style={{ width: `${pct}%`, background: healthToLight(h) }} title={`${HEALTH_LABELS[h]}: ${n}`} />;
              })}
            </div>
            <div className="flex flex-wrap" style={{ gap: 16, marginTop: 8 }}>
              {HEALTH_ORDER.map((h) => (
                <span key={h} className="inline-flex items-center" style={{ gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: healthToLight(h) }} />
                  <span style={{ fontFamily: FONT, fontSize: 12, color: MUTED }}>
                    {HEALTH_LABELS[h]} {overview.health_breakdown[h] ?? 0}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* KPI row */}
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginTop: 18 }}
          >
            {overview.kpis.map((t) => (
              <KpiTile key={t.key} tile={t} goodDirection={GOOD_DIRECTION[t.key]} />
            ))}
          </div>

          {/* Chart + alerts */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(260px, 1fr)", gap: 16, marginTop: 16 }}>
            <FatigueChart points={timeseries.points} />
            <AlertStrip alerts={overview.alerts} />
          </div>

          {/* Creative table */}
          <div style={{ marginTop: 16 }}>
            <CreativeTable rows={creatives.creatives} />
          </div>
        </>
      )}
    </div>
  );
}
