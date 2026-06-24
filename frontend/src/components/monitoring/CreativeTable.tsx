"use client";

import Link from "next/link";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { HealthBadge } from "@/components/ui/HealthBadge";
import { Sparkline } from "./Sparkline";
import { FONT, BORDER, MUTED } from "@/lib/ui";
import { formatCompact } from "@/lib/format";
import type { CreativeRow } from "@/types/monitoring";

const GREEN = "#66A737";
const RED = "#C9391A";
const COLS = "minmax(180px, 2.4fr) 110px 90px 70px 64px 80px 110px 64px";

function HeaderCell({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <span style={{ fontFamily: FONT, fontSize: 12, color: MUTED, textAlign: right ? "right" : "left" }}>{children}</span>
  );
}

export function CreativeTable({ rows }: { rows: CreativeRow[] }) {
  return (
    <div style={{ border: `2px solid ${BORDER}`, borderRadius: 18, background: "#fff", overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 16, color: "#000" }}>Creatives</span>
        <span style={{ fontFamily: FONT, fontSize: 13, color: MUTED, marginLeft: 8 }}>worst first</span>
      </div>

      {/* Header */}
      <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 12, padding: "10px 18px", borderBottom: `1px solid ${BORDER}` }}>
        <HeaderCell>Creative</HeaderCell>
        <HeaderCell>Health</HeaderCell>
        <HeaderCell right>Spend</HeaderCell>
        <HeaderCell right>CTR</HeaderCell>
        <HeaderCell right>Freq</HeaderCell>
        <HeaderCell right>CPA</HeaderCell>
        <HeaderCell>Health trend</HeaderCell>
        <HeaderCell right>Δ</HeaderCell>
      </div>

      {/* Rows */}
      <div className="overflow-y-auto" style={{ maxHeight: 460 }}>
        {rows.map((r) => {
          const delta = r.delta_pct;
          const deltaColor = delta == null ? MUTED : delta >= 0 ? GREEN : RED;
          return (
            <Link
              key={r.ad.id}
              href={`/canvas/${r.ad.id}`}
              className="grid items-center hover:bg-black/[0.02]"
              style={{ gridTemplateColumns: COLS, gap: 12, padding: "10px 18px", borderBottom: `1px solid ${BORDER}` }}
            >
              <div className="flex items-center" style={{ gap: 10, minWidth: 0 }}>
                <div style={{ width: 34, height: 42, borderRadius: 7, overflow: "hidden", background: "#262626", flexShrink: 0 }}>
                  {r.ad.thumbnail_url && (
                    <ImageWithFallback src={r.ad.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <span
                  style={{
                    fontFamily: FONT, fontSize: 14, color: "#000",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}
                >
                  {r.ad.title ?? "Untitled"}
                </span>
              </div>
              <div><HealthBadge health={r.ad.health} size="sm" /></div>
              <Cell right>${formatCompact(r.spend)}</Cell>
              <Cell right>{r.ctr}%</Cell>
              <Cell right>{r.frequency}x</Cell>
              <Cell right>${r.cpa}</Cell>
              <div><Sparkline values={r.sparkline} width={100} height={26} color={deltaColor === MUTED ? "#9aa0a6" : deltaColor} /></div>
              <span style={{ fontFamily: FONT, fontSize: 13, color: deltaColor, textAlign: "right" }}>
                {delta == null ? "—" : `${delta >= 0 ? "+" : ""}${delta}%`}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Cell({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <span style={{ fontFamily: FONT, fontSize: 14, color: "#000", textAlign: right ? "right" : "left" }}>{children}</span>
  );
}
