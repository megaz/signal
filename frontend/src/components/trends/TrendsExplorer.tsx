"use client";

import { useMemo } from "react";
import { useTrends } from "@/hooks/useTrends";
import { CompareBar } from "./CompareBar";
import { TrendsChart, SERIES_COLORS } from "./TrendsChart";
import { RisingTopTabs } from "./RisingTopTabs";
import { FONT, PAGE_PAD, BORDER, MUTED } from "@/lib/ui";
import type { TrendSeries } from "@/types/trends";

export function TrendsExplorer() {
  const { keywords, geo, setGeo, series, loading, error, addKeyword, removeKeyword } = useTrends();

  // Keep series (and therefore colors) ordered by the keyword chips.
  const ordered = useMemo(
    () => keywords.map((k) => series.find((s) => s.keyword === k)).filter(Boolean) as TrendSeries[],
    [keywords, series],
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto" style={{ paddingLeft: PAGE_PAD, paddingRight: PAGE_PAD, paddingBottom: PAGE_PAD }}>
      <div style={{ marginTop: 18 }}>
        <h1 style={{ fontFamily: FONT, fontWeight: 500, fontSize: 26, color: "#000" }}>Trends</h1>
        <p style={{ fontFamily: FONT, fontSize: 14, color: MUTED, marginTop: 4 }}>
          Interest over time from Google Trends — compare up to 5 terms.
        </p>
      </div>

      <CompareBar keywords={keywords} geo={geo} colors={SERIES_COLORS} onAdd={addKeyword} onRemove={removeKeyword} onGeo={setGeo} />

      {error ? (
        <div style={{ fontFamily: FONT, color: "#C9391A", padding: "60px 0", textAlign: "center" }}>
          Couldn’t load trends: {error}
        </div>
      ) : loading ? (
        <div style={{ fontFamily: FONT, color: MUTED, padding: "60px 0", textAlign: "center" }}>Loading trends…</div>
      ) : ordered.length === 0 || ordered.every((s) => s.points.length === 0) ? (
        <div style={{ fontFamily: FONT, color: MUTED, padding: "60px 0", textAlign: "center" }}>
          No data returned for these terms in this region. A blank result doesn’t mean zero interest — try a broader term or “Worldwide”.
        </div>
      ) : (
        <>
          <div style={{ border: `2px solid ${BORDER}`, borderRadius: 18, padding: 16, background: "#fff", marginTop: 16 }}>
            <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 16, color: "#000" }}>Interest over time</span>
            <div style={{ marginTop: 8 }}>
              <TrendsChart series={ordered} />
            </div>
          </div>
          <RisingTopTabs series={ordered} colors={SERIES_COLORS} />
        </>
      )}
    </div>
  );
}
