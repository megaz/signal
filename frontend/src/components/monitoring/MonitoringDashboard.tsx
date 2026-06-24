"use client";

import { useMemo } from "react";
import { useCreativeLibrary } from "@/hooks/useCreativeLibrary";
import { KpiTile } from "./KpiTile";
import { AlertStrip } from "./AlertStrip";
import { PerformanceTimeline, type TimelinePoint } from "./PerformanceTimeline";
import { EngagementTable, type EngRow } from "./EngagementTable";
import { FONT, PAGE_PAD, BORDER, MUTED } from "@/lib/ui";
import { healthToLight, HEALTH_LABELS } from "@/lib/constants";
import type { AdHealth } from "@/types/ad";
import type { KpiTile as KpiTileT, MonitoringAlert } from "@/types/monitoring";

const HEALTH_ORDER: AdHealth[] = ["thriving", "aging", "fatiguing", "declining"];
const GOOD_DIRECTION: Record<string, "up" | "down" | undefined> = { views: undefined, er: "up", likes: undefined, fatiguing: undefined };

export function MonitoringDashboard() {
  const { nodes, engagement, loading, error } = useCreativeLibrary();

  const model = useMemo(() => {
    const rows: EngRow[] = nodes
      .map((ad) => ({ ad, eng: engagement[ad.id]! }))
      .filter((r) => r.eng);

    const dated = rows
      .filter((r) => r.eng.posted_at)
      .map((r) => ({ ...r, date: new Date(r.eng.posted_at as string) }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const sum = (f: (r: EngRow) => number) => rows.reduce((s, r) => s + f(r), 0);
    const totalViews = sum((r) => r.eng.views);
    const totalLikes = sum((r) => r.eng.likes);
    const totalEng = sum((r) => r.eng.likes + r.eng.comments + r.eng.shares + r.eng.saves);
    const trueER = totalViews ? totalEng / totalViews : 0;

    // Real engagement-rate delta: recent half vs older half (by publish date). Age-robust (it's a ratio).
    const erOf = (set: typeof dated) => {
      const v = set.reduce((s, r) => s + r.eng.views, 0);
      const e = set.reduce((s, r) => s + r.eng.likes + r.eng.comments + r.eng.shares + r.eng.saves, 0);
      return v ? e / v : 0;
    };
    const mid = Math.floor(dated.length / 2);
    const olderER = erOf(dated.slice(0, mid));
    const recentER = erOf(dated.slice(mid));
    const erDelta = olderER ? Math.round(((recentER - olderER) / olderER) * 1000) / 10 : null;

    const breakdown: Record<string, number> = {};
    for (const ad of nodes) breakdown[ad.health] = (breakdown[ad.health] ?? 0) + 1;
    const fatiguing = (breakdown["fatiguing"] ?? 0) + (breakdown["declining"] ?? 0);

    const kpis: KpiTileT[] = [
      { key: "views", label: "Total Views", value: totalViews, unit: "", delta_pct: null, sparkline: dated.map((r) => r.eng.views) },
      { key: "er", label: "Avg Engagement", value: Math.round(trueER * 1000) / 10, unit: "%", delta_pct: erDelta, sparkline: dated.map((r) => r.eng.engagement_rate * 100) },
      { key: "likes", label: "Total Likes", value: totalLikes, unit: "", delta_pct: null, sparkline: dated.map((r) => r.eng.likes) },
      { key: "fatiguing", label: "Fatiguing Creatives", value: fatiguing, unit: "", delta_pct: null, sparkline: [] },
    ];

    const alerts: MonitoringAlert[] = nodes
      .filter((ad) => ad.health === "fatiguing" || ad.health === "declining")
      .map((ad) => ({
        ad_id: ad.id,
        ad_title: ad.title,
        severity: ad.health === "declining" ? "critical" : "warning",
        health: ad.health,
        text:
          ad.health === "declining"
            ? `${ad.title ?? "Creative"} is declining — retire or refresh.`
            : `${ad.title ?? "Creative"} is fatiguing after ${ad.run_days}d — refresh the hook.`,
      }))
      .sort((a, b) => (a.severity === "critical" ? 0 : 1) - (b.severity === "critical" ? 0 : 1));

    const timeline: TimelinePoint[] = dated.map((r) => ({
      date: r.date,
      er: r.eng.engagement_rate,
      views: r.eng.views,
      health: r.ad.health,
      title: r.ad.title ?? "Untitled",
    }));

    const table = [...rows].sort((a, b) => a.ad.health_score - b.ad.health_score);

    return { kpis, alerts, timeline, table, breakdown, total: nodes.length };
  }, [nodes, engagement]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto" style={{ paddingLeft: PAGE_PAD, paddingRight: PAGE_PAD, paddingBottom: PAGE_PAD }}>
      <div className="flex items-baseline" style={{ gap: 12, marginTop: 18 }}>
        <h1 style={{ fontFamily: FONT, fontWeight: 500, fontSize: 26, color: "#000" }}>Monitoring</h1>
        <span style={{ fontFamily: FONT, fontSize: 14, color: MUTED }}>real engagement across live campaigns</span>
      </div>

      {error ? (
        <div style={{ fontFamily: FONT, color: "#C9391A", padding: "60px 0", textAlign: "center" }}>Couldn’t load monitoring data: {error}</div>
      ) : loading ? (
        <div style={{ fontFamily: FONT, color: MUTED, padding: "60px 0", textAlign: "center" }}>Loading monitoring…</div>
      ) : (
        <>
          {/* Health breakdown bar */}
          <div style={{ marginTop: 16 }}>
            <div className="flex" style={{ height: 10, borderRadius: 6, overflow: "hidden", border: `1px solid ${BORDER}` }}>
              {HEALTH_ORDER.map((h) => {
                const n = model.breakdown[h] ?? 0;
                const pct = model.total ? (n / model.total) * 100 : 0;
                return <div key={h} style={{ width: `${pct}%`, background: healthToLight(h) }} title={`${HEALTH_LABELS[h]}: ${n}`} />;
              })}
            </div>
            <div className="flex flex-wrap" style={{ gap: 16, marginTop: 8 }}>
              {HEALTH_ORDER.map((h) => (
                <span key={h} className="inline-flex items-center" style={{ gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: healthToLight(h) }} />
                  <span style={{ fontFamily: FONT, fontSize: 12, color: MUTED }}>{HEALTH_LABELS[h]} {model.breakdown[h] ?? 0}</span>
                </span>
              ))}
            </div>
          </div>

          {/* KPI row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginTop: 18 }}>
            {model.kpis.map((t) => (
              <KpiTile key={t.key} tile={t} goodDirection={GOOD_DIRECTION[t.key]} />
            ))}
          </div>

          {/* Timeline + alerts */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(260px, 1fr)", gap: 16, marginTop: 16 }}>
            <PerformanceTimeline points={model.timeline} />
            <AlertStrip alerts={model.alerts} />
          </div>

          {/* Table */}
          <div style={{ marginTop: 16 }}>
            <EngagementTable rows={model.table} />
          </div>

          <div style={{ fontFamily: FONT, fontSize: 12, color: MUTED, marginTop: 16 }}>
            Views, engagement, likes &amp; shares are real (TikTok). Revenue is an estimate from views × CPM and
            engagement-derived ROAS. Engagement-rate delta compares recent vs older posts (age-robust).
          </div>
        </>
      )}
    </div>
  );
}
