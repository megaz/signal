"use client";

import Link from "next/link";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { HealthBadge } from "@/components/ui/HealthBadge";
import { healthToLight } from "@/lib/constants";
import { FONT, BORDER, MUTED } from "@/lib/ui";
import { formatCompact } from "@/lib/format";
import { formatRunDays } from "@/lib/utils";
import { estSpend, estRevenue } from "@/lib/estimates";
import type { AdNode } from "@/types/ad";
import type { Engagement } from "@/types/engagement";

function VerifiedTick() {
  return (
    <span
      className="inline-flex items-center justify-center flex-none"
      style={{ width: 14, height: 14, borderRadius: 7, background: "#3B9BFF" }}
    >
      <svg width="9" height="9" viewBox="0 0 12 12">
        <path d="M2.5 6.2l2 2 4.5-4.8" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function Stat({ label, value, est }: { label: string; value: string; est?: boolean }) {
  return (
    <div className="flex flex-col">
      <span style={{ fontFamily: FONT, fontSize: 11, color: MUTED }}>
        {label}
        {est && <span style={{ fontSize: 9, color: "#9aa0a6" }}> · est</span>}
      </span>
      <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 15, color: "#000" }}>{value}</span>
    </div>
  );
}

export function CreativeCard({ ad, eng }: { ad: AdNode; eng?: Engagement }) {
  const color = healthToLight(ad.health);
  const views = eng?.views ?? 0;
  const er = eng?.engagement_rate ?? 0;
  const revenue = eng ? estRevenue(views, er) : 0;
  const spend = eng ? estSpend(views) : 0;

  return (
    <Link href={`/canvas/${ad.id}`} className="block group">
      <div
        className="transition-transform group-hover:-translate-y-1"
        style={{ border: `2px solid ${BORDER}`, borderRadius: 18, overflow: "hidden", background: "#fff" }}
      >
        {/* Creator header */}
        <div className="flex items-center" style={{ gap: 8, padding: "10px 12px" }}>
          <div className="flex-none overflow-hidden" style={{ width: 26, height: 26, borderRadius: 13, background: "#eee" }}>
            {eng?.author_avatar && (
              <ImageWithFallback src={eng.author_avatar} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            )}
          </div>
          <span className="truncate" style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: "#000", maxWidth: 110 }}>
            {eng?.author_nick ?? eng?.author_name ?? "Creator"}
          </span>
          {eng?.author_verified && <VerifiedTick />}
          <div className="flex-1" />
          {eng?.is_sponsored && (
            <span style={{ fontFamily: FONT, fontSize: 10, color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "1px 6px" }}>
              Sponsored
            </span>
          )}
        </div>

        {/* Thumbnail */}
        <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 5", background: "#1b1b1b" }}>
          {ad.thumbnail_url ? (
            <ImageWithFallback src={ad.thumbnail_url} alt={ad.title ?? "creative"} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: "#262626" }} />
          )}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: color }} />
          <div style={{ position: "absolute", top: 10, right: 10 }}>
            <ScoreRing value={ad.health_score} color={color} size={40} />
          </div>
          {views > 0 && (
            <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(0,0,0,0.62)", borderRadius: 20, padding: "3px 10px" }}>
              <span style={{ fontFamily: FONT, fontSize: 11, color: "#fff" }}>▶ {formatCompact(views)}</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: 12 }}>
          <div
            className="truncate"
            style={{ fontFamily: FONT, fontWeight: 500, fontSize: 14, color: "#000" }}
            title={ad.title ?? ""}
          >
            {ad.title ?? "Untitled creative"}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 10px", marginTop: 10 }}>
            <Stat label="Views" value={formatCompact(views)} />
            <Stat label="Engagement" value={`${(er * 100).toFixed(1)}%`} />
            <Stat label="Revenue" value={`$${formatCompact(revenue)}`} est />
            <Stat label="Spend" value={`$${formatCompact(spend)}`} est />
          </div>

          <div className="flex items-center justify-between" style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
            <HealthBadge health={ad.health} size="sm" />
            <span style={{ fontFamily: FONT, fontSize: 12, color: MUTED }}>
              ♥ {formatCompact(eng?.likes ?? 0)} · {formatRunDays(ad.run_days)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
