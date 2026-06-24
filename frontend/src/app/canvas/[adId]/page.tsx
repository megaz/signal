"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { BeatCanvas } from "@/components/canvas/BeatCanvas";
import { CoPilot } from "@/components/canvas/CoPilot";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { adService } from "@/services/adService";
import { FONT, BORDER, MUTED, INK } from "@/lib/ui";
import { HEALTH_LABELS, healthToLight } from "@/lib/constants";
import type { AdDetail } from "@/types/ad";

const TAG_LABELS: Record<string, string> = {
  hook_dialogue:    "Hook",
  music_style:      "Music",
  visual_emotion:   "Emotion",
  cta_type:         "CTA",
  scene_transitions:"Cuts",
  character_type:   "Talent",
};

function SkeletonPill() {
  return (
    <span style={{ display: "inline-block", width: 72, height: 22, borderRadius: 12, background: "#ececec" }} />
  );
}

function TagPill({ label, value }: { label: string; value: string }) {
  return (
    <span
      className="inline-flex items-center"
      style={{ gap: 4, background: "#f4f4f4", border: `1.5px solid #e8e8e8`, borderRadius: 20, padding: "4px 10px" }}
    >
      <span style={{ fontFamily: FONT, fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: INK }}>{value}</span>
    </span>
  );
}

function AdHeader({ ad }: { ad: AdDetail }) {
  const color = healthToLight(ad.health);
  const tags = ad.creative_tags;
  const tagKeys = Object.keys(TAG_LABELS) as (keyof typeof TAG_LABELS)[];

  return (
    <div
      className="flex-none flex gap-4 items-start"
      style={{ borderBottom: `1.5px solid ${BORDER}`, padding: "20px 32px", background: "#fff" }}
    >
      {/* Thumbnail */}
      <div className="flex-none overflow-hidden" style={{ width: 64, height: 80, borderRadius: 10, background: "#eee" }}>
        {ad.thumbnail_url && (
          <ImageWithFallback
            src={ad.thumbnail_url}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Meta */}
      <div className="flex-1 min-w-0 flex flex-col" style={{ gap: 6 }}>
        <div className="flex items-center" style={{ gap: 10 }}>
          <Link href="/canvas" style={{ fontFamily: FONT, fontSize: 12, color: MUTED, textDecoration: "none" }}>
            ← Canvas
          </Link>
          <span style={{ color: MUTED }}>/</span>
          <span
            style={{ fontFamily: FONT, fontWeight: 500, fontSize: 15, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 340 }}
          >
            {ad.title || "Untitled ad"}
          </span>

          {/* Health badge */}
          <span
            className="flex-none inline-flex items-center"
            style={{ gap: 5, background: `${color}18`, border: `1.5px solid ${color}`, borderRadius: 20, padding: "3px 10px" }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 3, background: color }} />
            <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 12, color }}>{HEALTH_LABELS[ad.health]}</span>
            <span style={{ fontFamily: FONT, fontSize: 11, color, opacity: 0.75 }}>{Math.round(ad.health_score * 100)}</span>
          </span>

          <span style={{ fontFamily: FONT, fontSize: 12, color: MUTED }}>
            {ad.platform === "tiktok" ? "TikTok" : "Meta"} · {ad.run_days}d running
          </span>
        </div>

        {/* Creative tags row */}
        <div className="flex flex-wrap" style={{ gap: 6 }}>
          {tags
            ? tagKeys.map((key) => {
                const val = tags[key as keyof typeof tags];
                return val ? <TagPill key={key} label={TAG_LABELS[key]} value={val} /> : null;
              })
            : tagKeys.map((key) => <SkeletonPill key={key} />)}
        </div>
      </div>
    </div>
  );
}

interface Props {
  params: { adId: string };
}

export default function CanvasScreen({ params }: Props) {
  const { adId } = params;
  const [ad, setAd] = useState<AdDetail | null>(null);

  useEffect(() => {
    adService.getAd(adId).then(setAd).catch(() => null);
  }, [adId]);

  return (
    <AppShell>
      <div className="flex flex-col flex-1 min-h-0">
        {ad && <AdHeader ad={ad} />}
        <div className="relative flex flex-1 min-h-0 overflow-hidden">
          <BeatCanvas
            adId={adId}
            adTitle={ad?.title ?? undefined}
            adVideoUrl={ad?.video_url ?? undefined}
            onAnalysisComplete={() => adService.getAd(adId).then(setAd).catch(() => null)}
          />
          <CoPilot adId={adId} />
        </div>
      </div>
    </AppShell>
  );
}
