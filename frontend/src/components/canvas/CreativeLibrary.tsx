"use client";

import { useMemo, useState } from "react";
import { useCreativeLibrary } from "@/hooks/useCreativeLibrary";
import { CreativeCard } from "./CreativeCard";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { FONT, PAGE_PAD, BORDER, MUTED } from "@/lib/ui";
import { HEALTH_LABELS, healthToLight } from "@/lib/constants";
import { formatCompact } from "@/lib/format";
import { estRevenue } from "@/lib/estimates";
import type { AdHealth, AdNode } from "@/types/ad";
import type { Engagement } from "@/types/engagement";

type HealthTab = "all" | AdHealth;
type PlatformTab = "all" | "meta" | "tiktok";

const HEALTH_TABS: HealthTab[] = ["all", "thriving", "aging", "fatiguing", "declining"];
const SORTS = [
  { key: "views", label: "Most views" },
  { key: "engagement", label: "Top engagement" },
  { key: "revenue", label: "Est. revenue" },
  { key: "score_desc", label: "Health: high → low" },
  { key: "run_days", label: "Longest running" },
];

const selectStyle: React.CSSProperties = {
  fontFamily: FONT, fontSize: 14, color: "#000", border: `2px solid ${BORDER}`,
  borderRadius: 22, padding: "8px 14px", background: "#fff", cursor: "pointer", outline: "none",
};

function VerifiedTick({ size = 16 }: { size?: number }) {
  return (
    <span className="inline-flex items-center justify-center flex-none" style={{ width: size, height: size, borderRadius: size / 2, background: "#3B9BFF" }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 12 12">
        <path d="M2.5 6.2l2 2 4.5-4.8" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function CreatorHeader({ creator, total, totalViews }: { creator: Engagement | null; total: number; totalViews: number }) {
  return (
    <div className="flex items-center" style={{ gap: 14, marginTop: 16, border: `2px solid ${BORDER}`, borderRadius: 20, padding: 16 }}>
      <div className="flex-none overflow-hidden" style={{ width: 56, height: 56, borderRadius: 28, background: "#eee" }}>
        {creator?.author_avatar && (
          <ImageWithFallback src={creator.author_avatar} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
        )}
      </div>
      <div className="flex flex-col">
        <span className="flex items-center" style={{ gap: 6 }}>
          <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 20, color: "#000" }}>
            {creator?.author_nick ?? creator?.author_name ?? "Creator"}
          </span>
          {creator?.author_verified && <VerifiedTick />}
        </span>
        <span style={{ fontFamily: FONT, fontSize: 13, color: MUTED }}>
          {creator?.author_fans != null && <>{formatCompact(creator.author_fans)} followers · </>}
          {total} live campaigns · {formatCompact(totalViews)} total views
        </span>
      </div>
    </div>
  );
}

export function CreativeLibrary() {
  const { nodes, engagement, loading, error } = useCreativeLibrary();
  const [q, setQ] = useState("");
  const [health, setHealth] = useState<HealthTab>("all");
  const [platform, setPlatform] = useState<PlatformTab>("all");
  const [sort, setSort] = useState("views");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: nodes.length };
    for (const n of nodes) c[n.health] = (c[n.health] ?? 0) + 1;
    return c;
  }, [nodes]);

  const creator = useMemo(() => Object.values(engagement).find((e) => e.author_avatar) ?? null, [engagement]);
  const totalViews = useMemo(() => Object.values(engagement).reduce((s, e) => s + (e.views || 0), 0), [engagement]);

  const filtered = useMemo(() => {
    const ev = (a: AdNode) => engagement[a.id]?.views ?? 0;
    const eer = (a: AdNode) => engagement[a.id]?.engagement_rate ?? 0;
    const erev = (a: AdNode) => {
      const e = engagement[a.id];
      return e ? estRevenue(e.views, e.engagement_rate) : 0;
    };
    let xs = nodes.slice();
    const needle = q.trim().toLowerCase();
    if (needle) xs = xs.filter((n) => (n.title ?? "").toLowerCase().includes(needle));
    if (health !== "all") xs = xs.filter((n) => n.health === health);
    if (platform !== "all") xs = xs.filter((n) => n.platform === platform);
    xs.sort((a, b) => {
      if (sort === "views") return ev(b) - ev(a);
      if (sort === "engagement") return eer(b) - eer(a);
      if (sort === "revenue") return erev(b) - erev(a);
      if (sort === "run_days") return b.run_days - a.run_days;
      return b.health_score - a.health_score;
    });
    return xs;
  }, [nodes, engagement, q, health, platform, sort]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto" style={{ paddingLeft: PAGE_PAD, paddingRight: PAGE_PAD, paddingBottom: PAGE_PAD }}>
      {/* Title row */}
      <div className="flex items-center justify-between" style={{ marginTop: 18 }}>
        <div className="flex items-baseline" style={{ gap: 12 }}>
          <h1 style={{ fontFamily: FONT, fontWeight: 500, fontSize: 26, color: "#000" }}>Live Campaigns</h1>
          <span style={{ fontFamily: FONT, fontSize: 15, color: MUTED }}>{filtered.length} creatives</span>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search campaigns…" style={{ ...selectStyle, width: 260, cursor: "text" }} />
      </div>

      {/* Creator header */}
      {!loading && !error && <CreatorHeader creator={creator} total={nodes.length} totalViews={totalViews} />}

      {/* Filter bar */}
      <div className="flex items-center flex-wrap" style={{ gap: 10, marginTop: 16 }}>
        <div className="flex items-center" style={{ gap: 6, border: `2px solid ${BORDER}`, borderRadius: 24, padding: 4 }}>
          {HEALTH_TABS.map((t) => {
            const active = health === t;
            const color = t === "all" ? "#000" : healthToLight(t);
            return (
              <button
                key={t}
                onClick={() => setHealth(t)}
                style={{
                  fontFamily: FONT, fontSize: 13, fontWeight: 500, cursor: "pointer", borderRadius: 18,
                  padding: "6px 13px", border: "none", background: active ? "#000" : "transparent",
                  color: active ? "#fff" : "#000", display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                {t !== "all" && <span style={{ width: 7, height: 7, borderRadius: 4, background: color }} />}
                {t === "all" ? "All" : HEALTH_LABELS[t]}
                <span style={{ color: active ? "rgba(255,255,255,0.6)" : MUTED, fontSize: 12 }}>{counts[t] ?? 0}</span>
              </button>
            );
          })}
        </div>

        <select value={platform} onChange={(e) => setPlatform(e.target.value as PlatformTab)} style={selectStyle}>
          <option value="all">All platforms</option>
          <option value="meta">Meta</option>
          <option value="tiktok">TikTok</option>
        </select>

        <div className="flex-1" />

        <select value={sort} onChange={(e) => setSort(e.target.value)} style={selectStyle}>
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>Sort: {s.label}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      <div style={{ marginTop: 22 }}>
        {loading ? (
          <div style={{ fontFamily: FONT, color: MUTED, padding: "60px 0", textAlign: "center" }}>Loading campaigns…</div>
        ) : error ? (
          <div style={{ fontFamily: FONT, color: "#C9391A", padding: "60px 0", textAlign: "center" }}>Couldn’t load campaigns: {error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ fontFamily: FONT, color: MUTED, padding: "60px 0", textAlign: "center" }}>No campaigns match these filters.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
            {filtered.map((ad) => (
              <CreativeCard key={ad.id} ad={ad} eng={engagement[ad.id]} />
            ))}
          </div>
        )}
      </div>

      {/* Estimate disclaimer */}
      {!loading && !error && (
        <div style={{ fontFamily: FONT, fontSize: 12, color: MUTED, marginTop: 18 }}>
          Views, engagement, likes &amp; shares are real (TikTok). Revenue &amp; spend are estimates from
          views × CPM and an engagement-rate-derived ROAS — connect an ad account for measured spend.
        </div>
      )}
    </div>
  );
}
