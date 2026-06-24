"use client";

import Link from "next/link";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { HealthBadge } from "@/components/ui/HealthBadge";
import { FONT, BORDER, MUTED } from "@/lib/ui";
import { formatCompact } from "@/lib/format";
import { estRevenue } from "@/lib/estimates";
import type { AdNode } from "@/types/ad";
import type { Engagement } from "@/types/engagement";

const COLS = "minmax(180px, 2.4fr) 110px 90px 70px 80px 80px 110px";

export interface EngRow {
  ad: AdNode;
  eng: Engagement;
}

function HeaderCell({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <span style={{ fontFamily: FONT, fontSize: 12, color: MUTED, textAlign: right ? "right" : "left" }}>{children}</span>;
}
function Cell({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <span style={{ fontFamily: FONT, fontSize: 14, color: "#000", textAlign: right ? "right" : "left" }}>{children}</span>;
}

export function EngagementTable({ rows }: { rows: EngRow[] }) {
  return (
    <div style={{ border: `2px solid ${BORDER}`, borderRadius: 18, background: "#fff", overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 16, color: "#000" }}>Creatives</span>
        <span style={{ fontFamily: FONT, fontSize: 13, color: MUTED, marginLeft: 8 }}>most at-risk first</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 12, padding: "10px 18px", borderBottom: `1px solid ${BORDER}` }}>
        <HeaderCell>Creative</HeaderCell>
        <HeaderCell>Health</HeaderCell>
        <HeaderCell right>Views</HeaderCell>
        <HeaderCell right>ER</HeaderCell>
        <HeaderCell right>Likes</HeaderCell>
        <HeaderCell right>Shares</HeaderCell>
        <HeaderCell right>Revenue · est</HeaderCell>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: 460 }}>
        {rows.map(({ ad, eng }) => (
          <Link
            key={ad.id}
            href={`/canvas/${ad.id}`}
            className="grid items-center hover:bg-black/[0.02]"
            style={{ gridTemplateColumns: COLS, gap: 12, padding: "10px 18px", borderBottom: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center" style={{ gap: 10, minWidth: 0 }}>
              <div style={{ width: 34, height: 42, borderRadius: 7, overflow: "hidden", background: "#262626", flexShrink: 0 }}>
                {ad.thumbnail_url && <ImageWithFallback src={ad.thumbnail_url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />}
              </div>
              <span className="truncate" style={{ fontFamily: FONT, fontSize: 14, color: "#000" }}>{ad.title ?? "Untitled"}</span>
            </div>
            <div><HealthBadge health={ad.health} size="sm" /></div>
            <Cell right>{formatCompact(eng.views)}</Cell>
            <Cell right>{(eng.engagement_rate * 100).toFixed(1)}%</Cell>
            <Cell right>{formatCompact(eng.likes)}</Cell>
            <Cell right>{formatCompact(eng.shares)}</Cell>
            <Cell right>${formatCompact(estRevenue(eng.views, eng.engagement_rate))}</Cell>
          </Link>
        ))}
      </div>
    </div>
  );
}
