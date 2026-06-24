"use client";

import { useMemo, useState } from "react";
import { useCreativeLibrary } from "@/hooks/useCreativeLibrary";
import { CreativeCard } from "./CreativeCard";
import { FONT, PAGE_PAD, BORDER, MUTED } from "@/lib/ui";
import { HEALTH_LABELS, healthToLight } from "@/lib/constants";
import type { AdHealth, AdNode } from "@/types/ad";

type HealthTab = "all" | AdHealth;
type PlatformTab = "all" | "meta" | "tiktok";

const HEALTH_TABS: HealthTab[] = ["all", "thriving", "aging", "fatiguing", "declining"];
const SORTS = [
  { key: "score_desc", label: "Health: high → low" },
  { key: "score_asc", label: "At-risk first" },
  { key: "run_days", label: "Longest running" },
  { key: "recent", label: "Recently seen" },
];

const selectStyle: React.CSSProperties = {
  fontFamily: FONT, fontSize: 14, color: "#000", border: `2px solid ${BORDER}`,
  borderRadius: 22, padding: "8px 14px", background: "#fff", cursor: "pointer", outline: "none",
};

export function CreativeLibrary() {
  const { nodes, loading, error } = useCreativeLibrary();
  const [q, setQ] = useState("");
  const [health, setHealth] = useState<HealthTab>("all");
  const [platform, setPlatform] = useState<PlatformTab>("all");
  const [sort, setSort] = useState("score_desc");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: nodes.length };
    for (const n of nodes) c[n.health] = (c[n.health] ?? 0) + 1;
    return c;
  }, [nodes]);

  const filtered = useMemo(() => {
    let xs = nodes.slice();
    const needle = q.trim().toLowerCase();
    if (needle) xs = xs.filter((n) => (n.title ?? "").toLowerCase().includes(needle));
    if (health !== "all") xs = xs.filter((n) => n.health === health);
    if (platform !== "all") xs = xs.filter((n) => n.platform === platform);
    xs.sort((a: AdNode, b: AdNode) => {
      if (sort === "score_desc") return b.health_score - a.health_score;
      if (sort === "score_asc") return a.health_score - b.health_score;
      if (sort === "run_days") return b.run_days - a.run_days;
      return (b.last_seen_at ?? "").localeCompare(a.last_seen_at ?? "");
    });
    return xs;
  }, [nodes, q, health, platform, sort]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto" style={{ paddingLeft: PAGE_PAD, paddingRight: PAGE_PAD, paddingBottom: PAGE_PAD }}>
      {/* Title row */}
      <div className="flex items-center justify-between" style={{ marginTop: 18 }}>
        <div className="flex items-baseline" style={{ gap: 12 }}>
          <h1 style={{ fontFamily: FONT, fontWeight: 500, fontSize: 26, color: "#000" }}>Creative Library</h1>
          <span style={{ fontFamily: FONT, fontSize: 15, color: MUTED }}>{filtered.length} creatives</span>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search creatives…"
          style={{ ...selectStyle, width: 260, cursor: "text" }}
        />
      </div>

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
                  fontFamily: FONT, fontSize: 13, fontWeight: 500, cursor: "pointer",
                  borderRadius: 18, padding: "6px 13px", border: "none",
                  background: active ? "#000" : "transparent",
                  color: active ? "#fff" : "#000",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                {t !== "all" && <span style={{ width: 7, height: 7, borderRadius: 4, background: active ? color : color }} />}
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
          <div style={{ fontFamily: FONT, color: MUTED, padding: "60px 0", textAlign: "center" }}>Loading creatives…</div>
        ) : error ? (
          <div style={{ fontFamily: FONT, color: "#C9391A", padding: "60px 0", textAlign: "center" }}>
            Couldn’t load creatives: {error}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ fontFamily: FONT, color: MUTED, padding: "60px 0", textAlign: "center" }}>
            No creatives match these filters.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
              gap: 20,
            }}
          >
            {filtered.map((ad) => (
              <CreativeCard key={ad.id} ad={ad} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
