"use client";

import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { useCreativeLibrary } from "@/hooks/useCreativeLibrary";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { FONT, PAGE_PAD, BORDER, MUTED, INK } from "@/lib/ui";
import { HEALTH_LABELS, healthToLight } from "@/lib/constants";
import type { AdNode } from "@/types/ad";

function HealthBadge({ health, score }: { health: AdNode["health"]; score: number }) {
  const color = healthToLight(health);
  return (
    <span
      className="inline-flex items-center"
      style={{ gap: 5, background: `${color}18`, border: `1.5px solid ${color}`, borderRadius: 20, padding: "3px 10px" }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 3, background: color }} />
      <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 12, color }}>{HEALTH_LABELS[health]}</span>
      <span style={{ fontFamily: FONT, fontSize: 11, color, opacity: 0.75 }}>{Math.round(score * 100)}</span>
    </span>
  );
}

function TagPill({ label }: { label: string }) {
  return (
    <span style={{ fontFamily: FONT, fontSize: 11, color: INK, background: "#f2f2f2", borderRadius: 12, padding: "2px 8px", whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function RepairCard({ ad }: { ad: AdNode }) {
  const tags = ad.creative_tags;
  return (
    <Link
      href={`/canvas/${ad.id}`}
      className="group flex gap-4 items-start"
      style={{ border: `2px solid ${BORDER}`, borderRadius: 18, padding: 16, background: "#fff", textDecoration: "none", transition: "border-color 0.15s" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#000")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = BORDER)}
    >
      {/* Thumbnail */}
      <div className="flex-none overflow-hidden" style={{ width: 72, height: 96, borderRadius: 10, background: "#eee" }}>
        {ad.thumbnail_url && (
          <ImageWithFallback
            src={ad.thumbnail_url}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col" style={{ gap: 6 }}>
        <div className="flex items-start justify-between" style={{ gap: 8 }}>
          <span
            className="flex-1 min-w-0 overflow-hidden"
            style={{ fontFamily: FONT, fontWeight: 500, fontSize: 14, color: INK, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
          >
            {ad.title || "Untitled ad"}
          </span>
          <HealthBadge health={ad.health} score={ad.health_score} />
        </div>

        <span style={{ fontFamily: FONT, fontSize: 12, color: MUTED }}>
          {ad.platform === "tiktok" ? "TikTok" : "Meta"} · {ad.run_days}d running
        </span>

        {tags && (
          <div className="flex flex-wrap" style={{ gap: 4, marginTop: 2 }}>
            {tags.character_type && <TagPill label={tags.character_type} />}
            {tags.music_style && <TagPill label={tags.music_style} />}
            {tags.visual_emotion && <TagPill label={tags.visual_emotion} />}
          </div>
        )}
      </div>

      {/* CTA arrow */}
      <div
        className="flex-none flex items-center justify-center self-center"
        style={{ width: 36, height: 36, borderRadius: 18, background: "#000", color: "#fff", fontSize: 16 }}
      >
        →
      </div>
    </Link>
  );
}

function Section({ title, ads }: { title: string; ads: AdNode[] }) {
  if (ads.length === 0) return null;
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontFamily: FONT, fontWeight: 500, fontSize: 18, color: INK, marginBottom: 12 }}>
        {title}
        <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 14, color: MUTED, marginLeft: 10 }}>{ads.length}</span>
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
        {ads.map((ad) => (
          <RepairCard key={ad.id} ad={ad} />
        ))}
      </div>
    </section>
  );
}

export default function CanvasPage() {
  const { nodes, loading, error } = useCreativeLibrary();

  const fatiguing = nodes
    .filter((n) => n.health === "fatiguing" || n.health === "declining")
    .sort((a, b) => a.health_score - b.health_score);

  const aging = nodes
    .filter((n) => n.health === "aging")
    .sort((a, b) => a.health_score - b.health_score);

  const allHealthy = !loading && !error && fatiguing.length === 0 && aging.length === 0;

  return (
    <AppShell>
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ paddingLeft: PAGE_PAD, paddingRight: PAGE_PAD, paddingBottom: PAGE_PAD }}>
        <div style={{ marginTop: 20 }}>
          <h1 style={{ fontFamily: FONT, fontWeight: 500, fontSize: 26, color: INK }}>Canvas</h1>
          <p style={{ fontFamily: FONT, fontSize: 14, color: MUTED, marginTop: 4 }}>
            Fix fatigued creatives — select an ad to run AI teardown and propose beat-level repairs.
          </p>
        </div>

        {loading && (
          <div style={{ fontFamily: FONT, color: MUTED, padding: "60px 0", textAlign: "center" }}>Loading campaigns…</div>
        )}

        {error && (
          <div style={{ fontFamily: FONT, color: "#C9391A", padding: "60px 0", textAlign: "center" }}>
            Couldn't load campaigns: {error}
          </div>
        )}

        {allHealthy && (
          <div style={{ marginTop: 48, textAlign: "center", padding: 40, border: `2px dashed ${BORDER}`, borderRadius: 20 }}>
            <p style={{ fontFamily: FONT, fontWeight: 500, fontSize: 16, color: INK }}>✓ All campaigns healthy</p>
            <p style={{ fontFamily: FONT, fontSize: 14, color: MUTED, marginTop: 4 }}>Nothing needs fixing right now.</p>
          </div>
        )}

        <Section title="Needs fixing" ads={fatiguing} />
        <Section title="Watch closely" ads={aging} />
      </div>
    </AppShell>
  );
}
