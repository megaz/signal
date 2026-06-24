"use client";

import Link from "next/link";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { HealthBadge } from "@/components/ui/HealthBadge";
import { healthToLight } from "@/lib/constants";
import { FONT, BORDER, MUTED } from "@/lib/ui";
import { formatRunDays } from "@/lib/utils";
import type { AdNode } from "@/types/ad";

export function CreativeCard({ ad }: { ad: AdNode }) {
  const color = healthToLight(ad.health);

  return (
    <Link href={`/canvas/${ad.id}`} className="block group">
      <div
        className="transition-transform group-hover:-translate-y-1"
        style={{ border: `2px solid ${BORDER}`, borderRadius: 18, overflow: "hidden", background: "#fff" }}
      >
        {/* Thumbnail */}
        <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 5", background: "#1b1b1b" }}>
          {ad.thumbnail_url ? (
            <ImageWithFallback src={ad.thumbnail_url} alt={ad.title ?? "creative"} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: "#262626" }} />
          )}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: color }} />
          <div style={{ position: "absolute", top: 10, right: 10 }}>
            <ScoreRing value={ad.health_score} color={color} size={42} />
          </div>
          <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(0,0,0,0.62)", borderRadius: 20, padding: "3px 10px" }}>
            <span style={{ fontFamily: FONT, fontSize: 11, color: "#fff", textTransform: "capitalize" }}>{ad.platform}</span>
          </div>
        </div>

        {/* Meta */}
        <div style={{ padding: 14 }}>
          <div
            style={{
              fontFamily: FONT, fontWeight: 500, fontSize: 15, color: "#000", lineHeight: 1.25,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}
          >
            {ad.title ?? "Untitled creative"}
          </div>
          <div className="flex items-center justify-between" style={{ marginTop: 9 }}>
            <HealthBadge health={ad.health} />
            <span style={{ fontFamily: FONT, fontSize: 12, color: MUTED }}>
              {formatRunDays(ad.run_days)} · {ad.variant_count} var
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
