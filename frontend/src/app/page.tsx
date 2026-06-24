"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import svgPaths from "@/imports/MacBookPro142/svg-hc5vql6mh7";
import { TopNav } from "@/components/shell/TopNav";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { adService } from "@/services/adService";
import { engagementService } from "@/services/engagementService";
import { formatCompact } from "@/lib/format";
import type { AdHealth, AdNode, BrandStats } from "@/types/ad";
import type { Engagement } from "@/types/engagement";

// ─── Config ─────────────────────────────────────────────────────────────────────
const BRAND_ID = process.env.NEXT_PUBLIC_DEMO_BRAND_ID ?? "celsius";

// ─── Layout constants ──────────────────────────────────────────────────────────
const PAD = 40;        // horizontal page padding
const COL_GAP = 22;    // gap between gallery columns
const GAL_TILE = 210;  // target gallery tile width → responsive column count
const FONT = "'Poppins', sans-serif";
const TIKTOK_RATIO = 16 / 9; // height / width

// ─── Shared types / palette ─────────────────────────────────────────────────────
type Status = "thriving" | "aging" | "fatigued";
type Trend  = "up" | "down";
type Period = "day" | "week" | "month" | "year";

const STATUS_COLOR: Record<Status, string> = {
  thriving: "#66A737",
  aging:    "#E28929",
  fatigued: "#C9391A",
};

const STATUS_LABEL: Record<Status, string> = {
  thriving: "Thriving",
  aging:    "Aging",
  fatigued: "Fatigued",
};

const PERIODS: { key: Period; label: string }[] = [
  { key: "day",   label: "Day"   },
  { key: "week",  label: "Week"  },
  { key: "month", label: "Month" },
  { key: "year",  label: "Year"  },
];
const PERIOD_DAYS: Record<Period, number> = { day: 1, week: 7, month: 31, year: 366 };

type GalleryView = "grid" | "stack";
type StatusFilter = "all" | Status;

const GALLERY_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all",      label: "All"      },
  { key: "thriving", label: "Thriving" },
  { key: "aging",    label: "Aging"    },
  { key: "fatigued", label: "Fatigued" },
];

const GALLERY_VIEWS: { key: GalleryView; label: string }[] = [
  { key: "grid",  label: "Grid"  },
  { key: "stack", label: "Stack" },
];

// ─── Mappers / helpers ───────────────────────────────────────────────────────────

function toStatus(health: AdHealth): Status {
  if (health === "thriving") return "thriving";
  if (health === "aging") return "aging";
  return "fatigued";
}
function toTrend(health: AdHealth): Trend {
  return health === "thriving" || health === "aging" ? "up" : "down";
}

// Portfolio health = weighted average of the SAME buckets shown in the stats bar,
// so the gauge reconciles with the counts (e.g. 8·100 + 7·60 + 15·20)/30 = 51.
const HEALTH_WEIGHT: Record<Status, number> = { thriving: 100, aging: 60, fatigued: 20 };
function portfolioHealth(ads: AdNode[]): number {
  if (!ads.length) return 0;
  const sum = ads.reduce((s, a) => s + HEALTH_WEIGHT[toStatus(a.health)], 0);
  return Math.round(sum / ads.length);
}
const hasVideo = (a: AdNode) =>
  !!a.thumbnail_url && (a.thumbnail_url.includes("tiktokcdn") || a.thumbnail_url.startsWith("/celsius/"));
const adName = (a: AdNode) => a.title?.trim() || "Untitled creative";
const adHandle = (a: AdNode) => `#${a.id.slice(0, 8)}`;
// Composite performance score — encodes the thesis: sustained health + reach + longevity.
// (health is the dominant, most reliable signal; reach and run-days reinforce it.)
const REACH_WEIGHT: Record<string, number> = { high: 1, mid: 0.6, low: 0.3 };
const reachWeight = (b: string | null) => (b ? REACH_WEIGHT[b] ?? 0.45 : 0.45);
const runNorm = (days: number) => Math.max(0, Math.min(1, (days ?? 0) / 60));
const perf = (a: AdNode) =>
  0.6 * a.health_score + 0.25 * reachWeight(a.reach_bucket) + 0.15 * runNorm(a.run_days);
const adScore = (a: AdNode) => Math.round(perf(a) * 100);

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const fmtInt = (n: number) => n.toLocaleString("en-US");
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function scoreColor(v: number): string {
  if (v >= 75) return STATUS_COLOR.thriving;
  if (v >= 50) return STATUS_COLOR.aging;
  return STATUS_COLOR.fatigued;
}

// SVG arc helpers (0° = top, clockwise) for the radial gauge
function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToCartesian(cx, cy, r, endDeg);
  const end = polarToCartesian(cx, cy, r, startDeg);
  const largeArc = endDeg - startDeg <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function useElementWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

// Fetch a brand's ads + stats once
function useBrandData(brandId: string) {
  const [ads, setAds] = useState<AdNode[]>([]);
  const [stats, setStats] = useState<BrandStats | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [web, st] = await Promise.all([
          adService.getWebNodes(brandId),
          adService.getStats(brandId),
        ]);
        if (!alive) return;
        setStats(st);
        // video-bearing creatives first, then by score
        const sorted = [...web.nodes].sort(
          (a, b) => Number(hasVideo(b)) - Number(hasVideo(a)) || perf(b) - perf(a)
        );
        setAds(sorted);
      } catch {
        /* leave empty — UI degrades gracefully */
      }
    })();
    return () => {
      alive = false;
    };
  }, [brandId]);
  return { ads, stats };
}

// ─── Media: real cover + hover/auto video (lazy-loads video_url via /ads/{id}) ──
function AdMedia({ ad, autoplay = false }: { ad: AdNode; autoplay?: boolean }) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [active, setActive] = useState(autoplay);
  const startedRef = useRef(false);

  const ensureVideo = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    try {
      const detail = await adService.getAd(ad.id);
      setVideoUrl(detail.video_url);
    } catch {
      /* keep showing the cover image */
    }
  }, [ad.id]);

  useEffect(() => {
    if (autoplay) {
      setActive(true);
      void ensureVideo();
    }
  }, [autoplay, ensureVideo]);

  return (
    <div
      className="absolute inset-0"
      onMouseEnter={() => {
        if (!autoplay) {
          setActive(true);
          void ensureVideo();
        }
      }}
      onMouseLeave={() => {
        if (!autoplay) setActive(false);
      }}
    >
      {ad.thumbnail_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ad.thumbnail_url}
          alt={ad.title ?? ""}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {active && videoUrl && (
        <video
          src={videoUrl}
          poster={ad.thumbnail_url ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
    </div>
  );
}

// Trend tab — its square outer corner is clipped to the card's radius by the
// parent's overflow:hidden, so it always lines up with the rounded background.
function TrendNotch({ color, trend, w = 44, h = 32 }: { color: string; trend: Trend; w?: number; h?: number }) {
  return (
    <div
      className="absolute top-0 right-0 z-10 flex items-center justify-center"
      style={{ width: w, height: h, background: color, borderBottomLeftRadius: 13, pointerEvents: "none" }}
    >
      <svg viewBox="0 0 54 39" fill="none" style={{ width: "60%", height: "60%", display: "block" }}>
        <path d={trend === "up" ? svgPaths.p817d080 : svgPaths.p7f52200} fill="white" />
      </svg>
    </div>
  );
}

function InfoDot({ size = 18 }: { size?: number }) {
  return (
    <div
      className="absolute z-10"
      style={{ top: 11, left: 11, pointerEvents: "none", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.55))" }}
    >
      <svg style={{ width: size, height: size, display: "block" }} viewBox="0 0 21 21" fill="none">
        <circle cx="10.5" cy="10.5" r="9.5" stroke="white" strokeWidth="2" />
        <path d={svgPaths.p3c4bedc0} fill="white" />
      </svg>
    </div>
  );
}

function StatusTag({ status }: { status: Status }) {
  return (
    <div
      className="absolute z-10 flex items-center gap-1.5"
      style={{ bottom: 10, left: 11, pointerEvents: "none", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.6))" }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: STATUS_COLOR[status] }} />
      <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 12, color: "rgba(255,255,255,0.92)" }}>
        {STATUS_LABEL[status]}
      </span>
    </div>
  );
}

const FATIGUE_RED = STATUS_COLOR.fatigued;
const canvasHref = (adId: string) => `/canvas/${adId}`;

// The money interaction: a fatigued creative is dying → drop straight into the
// Canvas teardown to fix it. This is the loudest affordance on a fatigued card —
// a red, always-visible "Refresh" button (not hover-gated) plus an alert ring.
function FatigueOverlay({ adId, radius }: { adId: string; radius: number }) {
  return (
    <>
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ border: `2px solid ${FATIGUE_RED}`, borderRadius: radius }}
      />
      <Link
        href={canvasHref(adId)}
        aria-label="Diagnose and refresh this creative in Canvas"
        className="absolute z-20 flex items-center justify-center gap-1.5 transition-transform hover:scale-[1.04]"
        style={{
          left: 8,
          right: 8,
          bottom: 8,
          height: 40,
          borderRadius: 12,
          background: FATIGUE_RED,
          color: "#fff",
          textDecoration: "none",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: "0.01em",
          boxShadow: "0 4px 16px rgba(201,57,26,0.55)",
        }}
      >
        Refresh now
        <span aria-hidden style={{ fontWeight: 600 }}>→</span>
      </Link>
    </>
  );
}

// ─── Stats bar ──────────────────────────────────────────────────────────────────

function StatBadge({ value }: { value: string }) {
  return (
    <div
      className="flex items-center justify-center flex-none"
      style={{ height: 32, paddingLeft: 13, paddingRight: 13, borderRadius: 40, border: "2px solid #000" }}
    >
      <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 16, color: "#000" }}>{value}</span>
    </div>
  );
}

function StatGroup({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 flex-none">
      <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 16, color: "rgba(0,0,0,0.55)", whiteSpace: "nowrap" }}>{label}</span>
      <StatBadge value={value} />
    </div>
  );
}

// ─── Top performers ─────────────────────────────────────────────────────────────

// Radial performance gauge (270° rainbow arc)
function Gauge({ value, fatigued, total }: { value: number; fatigued: number; total: number }) {
  const size = 168;
  const cx = size / 2;
  const cy = size / 2;
  const r = 64;
  const sw = 14;
  const START = -135;
  const END = 135;
  const valEnd = START + (END - START) * (clamp(value, 0, 100) / 100);
  const color = scoreColor(value);

  return (
    <div
      className="flex-none flex flex-col items-center justify-center"
      style={{ width: 190, minHeight: 188, border: "2px solid #ececec", borderRadius: 22, padding: "6px 0" }}
    >
      <svg width={size} height={size * 0.84} viewBox={`0 0 ${size} ${size * 0.84}`}>
        <path d={describeArc(cx, cy, r, START, END)} stroke="#ececec" strokeWidth={sw} fill="none" strokeLinecap="round" />
        {value > 0 && (
          <path d={describeArc(cx, cy, r, START, valEnd)} stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round" />
        )}
        <text x={cx} y={cy - 2} textAnchor="middle" style={{ fontFamily: FONT, fontWeight: 600, fontSize: 38, fill: "#000" }}>
          {value}
        </text>
        <text x={cx} y={cy + 20} textAnchor="middle" style={{ fontFamily: FONT, fontWeight: 500, fontSize: 12, fill: "rgba(0,0,0,0.55)" }}>
          Portfolio health
        </text>
      </svg>
      <div className="flex items-center gap-1" style={{ marginTop: -6 }}>
        <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: STATUS_COLOR.fatigued }}>{fatigued}</span>
        <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 12, color: "rgba(0,0,0,0.45)" }}>of {total} fatigued</span>
      </div>
    </div>
  );
}

function SegToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center flex-none" style={{ border: "1.5px solid #000", borderRadius: 20, padding: 2, gap: 2 }}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            style={{
              borderRadius: 16,
              padding: "5px 14px",
              background: active ? "#000" : "transparent",
              color: active ? "#fff" : "#000",
              fontFamily: FONT,
              fontWeight: 500,
              fontSize: 13,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function PeriodToggle({ period, setPeriod }: { period: Period; setPeriod: (p: Period) => void }) {
  return <SegToggle options={PERIODS} value={period} onChange={setPeriod} />;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col flex-1 items-start min-w-0">
      <span className="truncate w-full" style={{ fontFamily: FONT, fontWeight: 600, fontSize: 17, color: "#000", lineHeight: 1.1 }}>
        {value}
      </span>
      <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 12, color: "rgba(0,0,0,0.4)" }}>{label}</span>
    </div>
  );
}

function FeaturedPerformerCard({
  period,
  setPeriod,
  ad,
}: {
  period: Period;
  setPeriod: (p: Period) => void;
  ad: AdNode | null;
}) {
  const status = ad ? toStatus(ad.health) : "thriving";
  const color = STATUS_COLOR[status];

  return (
    <div className="flex-1 min-w-0 flex" style={{ height: 200, border: "2px solid #ececec", borderRadius: 22, padding: 18, gap: 16 }}>
      {/* Video — shown at a good size, full 9:16 */}
      <div className="relative flex-none overflow-hidden" style={{ width: 92, height: 164, borderRadius: 14, background: "#1a1a1a" }}>
        {ad && <AdMedia ad={ad} autoplay />}
        {ad && <TrendNotch color={color} trend={toTrend(ad.health)} w={34} h={25} />}
      </div>

      {/* Right column */}
      <div className="flex-1 min-w-0 flex flex-col justify-between" style={{ height: 164 }}>
        <div className="flex items-center justify-between">
          <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 14, color: "rgba(0,0,0,0.5)" }}>Top Performer</span>
          <PeriodToggle period={period} setPeriod={setPeriod} />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col min-w-0">
            <span className="truncate" style={{ fontFamily: FONT, fontWeight: 600, fontSize: 21, color: "#000", lineHeight: 1.15, maxWidth: 360 }} title={ad ? adName(ad) : ""}>
              {ad ? adName(ad) : "No campaigns yet"}
            </span>
            <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 13, color: "rgba(0,0,0,0.35)" }}>{ad ? adHandle(ad) : "—"}</span>
            <div className="flex items-center gap-1.5" style={{ marginTop: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
              <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 13, color }}>{STATUS_LABEL[status]}</span>
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex flex-col items-end flex-none">
            <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 38, color, lineHeight: 1 }}>{ad ? adScore(ad) : 0}</span>
            <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 12, color: "rgba(0,0,0,0.4)" }}>perf. score</span>
          </div>
        </div>

        <div className="flex items-center" style={{ borderTop: "1px solid #efefef", paddingTop: 10, gap: 8 }}>
          <Metric label="Run days" value={ad ? `${ad.run_days}d` : "—"} />
          <Metric label="Reach" value={ad?.reach_bucket ?? "—"} />
          <Metric label="Variants" value={ad ? String(ad.variant_count) : "—"} />
          <Metric label="Platform" value={ad ? ad.platform : "—"} />
        </div>
      </div>
    </div>
  );
}

// Compact campaign card for the carousel
function CampaignCard({ ad }: { ad: AdNode }) {
  const status = toStatus(ad.health);
  const fatigued = status === "fatigued";
  return (
    <div
      className="relative flex-none overflow-hidden"
      style={{ width: 162, height: 240, background: "#1a1a1a", borderRadius: 22, flexShrink: 0 }}
    >
      <AdMedia ad={ad} />
      <InfoDot />
      <TrendNotch color={STATUS_COLOR[status]} trend={toTrend(ad.health)} w={45} h={32} />
      {fatigued ? <FatigueOverlay adId={ad.id} radius={22} /> : <StatusTag status={status} />}
    </div>
  );
}

function TopPerformers({ ads }: { ads: AdNode[] }) {
  const [period, setPeriod] = useState<Period>("week");

  const { gaugeValue, fatigued, total, featured } = useMemo(() => {
    if (!ads.length) return { gaugeValue: 0, fatigued: 0, total: 0, featured: null as AdNode | null };
    // Gauge = portfolio health over ALL ads, derived from the same buckets shown in
    // the stats bar (stable; reconciles with the counts). The period toggle only
    // picks the hero ad below.
    // Period = "sustained at least this long" (proven), NOT "newer than" — a long-running
    // winner must never be excluded from the hero. Falls back to all ads if none qualify.
    const minRun = PERIOD_DAYS[period];
    const sub = ads.filter((a) => (a.run_days ?? 0) >= minRun);
    const pool = sub.length ? sub : ads;
    const feat = [...pool].sort(
      (a, b) => perf(b) - perf(a) || Number(hasVideo(b)) - Number(hasVideo(a))
    )[0];
    return {
      gaugeValue: portfolioHealth(ads),
      fatigued: ads.filter((a) => toStatus(a.health) === "fatigued").length,
      total: ads.length,
      featured: feat,
    };
  }, [ads, period]);

  return (
    <>
      {/* Section title + gauge / featured card */}
      <div className="flex-none" style={{ paddingLeft: PAD, paddingRight: PAD, marginTop: 22 }}>
        <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 22, color: "#000" }}>Top Performers</span>
        <div className="flex items-stretch" style={{ gap: 18, marginTop: 12 }}>
          <Gauge value={gaugeValue} fatigued={fatigued} total={total} />
          <FeaturedPerformerCard period={period} setPeriod={setPeriod} ad={featured} />
        </div>
      </div>

      {/* Carousel */}
      <div className="relative flex-none" style={{ marginTop: 16 }}>
        <div className="absolute inset-y-0 left-0 z-20 pointer-events-none" style={{ width: 60, background: "linear-gradient(to right, white 0%, rgba(255,255,255,0) 100%)" }} />
        <div className="flex" style={{ gap: 16, paddingLeft: PAD, paddingRight: PAD, overflowX: "auto", scrollbarWidth: "none" }}>
          {ads.map((ad) => (
            <CampaignCard key={ad.id} ad={ad} />
          ))}
        </div>
        <div className="absolute inset-y-0 right-0 z-20 pointer-events-none" style={{ width: 140, background: "linear-gradient(to right, rgba(255,255,255,0) 0%, white 100%)" }} />
      </div>
    </>
  );
}

// ─── Ad gallery ─────────────────────────────────────────────────────────────────

function TikTokCard({ ad, width }: { ad: AdNode; width: number }) {
  const status = toStatus(ad.health);
  const fatigued = status === "fatigued";
  const height = Math.round(width * TIKTOK_RATIO);
  const style = { width, height, background: "#1a1a1a", borderRadius: 18, flexShrink: 0, display: "block", textDecoration: "none" } as const;
  const inner = (
    <>
      <AdMedia ad={ad} />
      <InfoDot />
      <TrendNotch color={STATUS_COLOR[status]} trend={toTrend(ad.health)} w={45} h={32} />
      {fatigued ? <FatigueOverlay adId={ad.id} radius={18} /> : <StatusTag status={status} />}
    </>
  );
  // Fatigued → the loud Refresh CTA drives to Canvas; avoid nesting it inside an <a>.
  if (fatigued) {
    return (
      <div className="relative flex-none overflow-hidden" style={style}>
        {inner}
      </div>
    );
  }
  return (
    <a href={`/ads/${ad.id}`} className="relative flex-none overflow-hidden" style={style}>
      {inner}
    </a>
  );
}

function StackMetric({ label, value, accent, large }: { label: string; value: string; accent?: string; large?: boolean }) {
  return (
    <div className="flex flex-col">
      <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: large ? 22 : 16, color: accent ?? "#000", lineHeight: 1.1 }}>
        {value}
      </span>
      <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 11, color: "rgba(0,0,0,0.38)", whiteSpace: "nowrap", marginTop: 2 }}>
        {label}
      </span>
    </div>
  );
}

// Stack view row: square thumbnail | campaign info | divider | analytics
function StackRow({ ad }: { ad: AdNode }) {
  const status = toStatus(ad.health);
  const color = STATUS_COLOR[status];
  const trend = toTrend(ad.health);
  const score = adScore(ad);
  const fatigued = status === "fatigued";
  const signal = status === "thriving" ? "Strong signal" : status === "aging" ? "Watch closely" : "At risk";
  const thumbSz = 80; // square thumbnail

  return (
    <a
      href={fatigued ? canvasHref(ad.id) : `/ads/${ad.id}`}
      aria-label={fatigued ? "Diagnose and refresh this creative in Canvas" : undefined}
      className="flex items-center w-full overflow-hidden cursor-pointer"
      style={{ border: fatigued ? `2px solid ${FATIGUE_RED}` : "1.5px solid #e8e8e8", borderRadius: 16, background: "#fff", textDecoration: "none", gap: 0 }}
    >
      {/* Square thumbnail */}
      <div
        className="relative flex-none overflow-hidden"
        style={{ width: thumbSz, height: thumbSz, background: "#111", borderRadius: "14px 0 0 14px", flexShrink: 0 }}
      >
        <AdMedia ad={ad} />
        <div className="absolute inset-0 flex items-end justify-start" style={{ padding: "6px 8px", background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)" }}>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 17, color: "#fff", lineHeight: 1 }}>{score}</span>
        </div>
      </div>

      {/* Campaign info */}
      <div className="flex flex-col justify-center flex-none" style={{ padding: "0 18px", width: 200, gap: 4 }}>
        <span className="truncate" style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14, color: "#000" }} title={adName(ad)}>
          {adName(ad)}
        </span>
        <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 11, color: "rgba(0,0,0,0.35)" }}>{adHandle(ad)}</span>
        <div className="flex items-center gap-1.5" style={{ marginTop: 3 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, flexShrink: 0 }} />
          <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 12, color }}>{STATUS_LABEL[status]}</span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, alignSelf: "stretch", background: "#f0f0f0", flexShrink: 0 }} />

      {/* Analytics */}
      <div className="flex-1 min-w-0 flex items-center justify-between" style={{ padding: "0 24px", gap: 24 }}>
        {/* KPIs */}
        <div className="flex items-center" style={{ gap: 28 }}>
          <StackMetric label="Score"    value={String(score)} accent={color} large />
          <StackMetric label="Run days" value={`${ad.run_days ?? "—"}d`} large />
          <StackMetric label="Reach"    value={ad.reach_bucket ?? "—"} large />
          <StackMetric label="Variants" value={String(ad.variant_count)} large />
        </div>

        {fatigued ? (
          /* The money interaction: dying creative → straight into the Canvas teardown */
          <div
            className="flex items-center gap-2 flex-none transition-transform hover:scale-[1.03]"
            style={{ background: FATIGUE_RED, color: "#fff", borderRadius: 12, padding: "11px 20px", fontFamily: FONT, fontWeight: 700, fontSize: 14, boxShadow: "0 4px 16px rgba(201,57,26,0.45)" }}
          >
            Refresh now
            <span aria-hidden style={{ fontWeight: 600 }}>→</span>
          </div>
        ) : (
          /* Signal badge */
          <div
            className="flex items-center gap-1.5 flex-none"
            style={{ background: `${color}12`, border: `1.5px solid ${color}35`, borderRadius: 20, padding: "5px 14px" }}
          >
            <span style={{ fontSize: 10, color }}>{trend === "up" ? "▲" : "▼"}</span>
            <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color }}>{signal}</span>
          </div>
        )}
      </div>
    </a>
  );
}

function Gallery({ ads }: { ads: AdNode[] }) {
  const [ref, width] = useElementWidth();
  const [view, setView] = useState<GalleryView>("grid");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const inner = Math.max(0, width - PAD * 2);
  const numCols = inner ? Math.max(2, Math.round(inner / GAL_TILE)) : 5;
  const colWidth = inner ? (inner - (numCols - 1) * COL_GAP) / numCols : GAL_TILE;
  const items = ads.filter((a) => filter === "all" || toStatus(a.health) === filter);

  return (
    <div ref={ref} className="flex-none" style={{ paddingLeft: PAD, paddingRight: PAD, paddingBottom: PAD }}>
      <div className="flex items-center" style={{ marginBottom: 16, gap: 12 }}>
        <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 22, color: "#000" }}>Gallery</span>
        <div className="flex-1" />
        <SegToggle options={GALLERY_FILTERS} value={filter} onChange={setFilter} />
        <SegToggle options={GALLERY_VIEWS} value={view} onChange={setView} />
      </div>

      {view === "grid" ? (
        <div className="flex flex-wrap" style={{ gap: COL_GAP }}>
          {items.map((ad) => (
            <TikTokCard key={ad.id} ad={ad} width={colWidth} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: 14 }}>
          {items.map((ad) => (
            <StackRow key={ad.id} ad={ad} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

// Celsius brand identity (logo / followers) from the real TikTok creator profile.
function useBrandCreator(brandId: string) {
  const [creator, setCreator] = useState<Engagement | null>(null);
  const [totalViews, setTotalViews] = useState(0);
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    engagementService
      .getForBrand(brandId)
      .then((res) => {
        if (!alive) return;
        const items = res.items ?? [];
        setCreator(items.find((e) => e.author_avatar) ?? null);
        setTotalViews(items.reduce((s, e) => s + (e.views || 0), 0));
        setCount(items.length);
      })
      .catch(() => {
        /* header simply hides if engagement isn't available */
      });
    return () => {
      alive = false;
    };
  }, [brandId]);
  return { creator, totalViews, count };
}

function VerifiedTick({ size = 18 }: { size?: number }) {
  return (
    <span className="inline-flex items-center justify-center flex-none" style={{ width: size, height: size, borderRadius: size / 2, background: "#3B9BFF" }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 12 12">
        <path d="M2.5 6.2l2 2 4.5-4.8" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function BrandHeader({ creator, totalViews, count }: { creator: Engagement | null; totalViews: number; count: number }) {
  if (!creator) return null;
  return (
    <div className="flex items-center flex-none" style={{ paddingLeft: PAD, paddingRight: PAD, marginTop: 18, gap: 14 }}>
      <div className="flex-none overflow-hidden" style={{ width: 58, height: 58, borderRadius: 29, background: "#eee", border: "2px solid #ececec" }}>
        {creator.author_avatar && (
          <ImageWithFallback src={creator.author_avatar} alt="Celsius" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
        )}
      </div>
      <div className="flex flex-col">
        <span className="flex items-center" style={{ gap: 7 }}>
          <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 24, color: "#000" }}>
            {creator.author_nick ?? creator.author_name ?? "Celsius"}
          </span>
          {creator.author_verified && <VerifiedTick />}
        </span>
        <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 14, color: "rgba(0,0,0,0.45)" }}>
          {creator.author_fans != null && <>{formatCompact(creator.author_fans)} followers · </>}
          {count} live campaigns · {formatCompact(totalViews)} total views
        </span>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2 flex-none" style={{ border: "1.5px solid #66A737", borderRadius: 20, padding: "6px 14px" }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: "#66A737" }} />
        <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 13, color: "#3d6b1f" }}>Live</span>
      </div>
    </div>
  );
}

export default function App() {
  const { ads, stats } = useBrandData(BRAND_ID);
  const { creator, totalViews, count } = useBrandCreator(BRAND_ID);

  const thriving = stats ? stats.health_breakdown.thriving : 0;
  const aging = stats ? stats.health_breakdown.aging : 0;
  const fatigued = stats ? stats.fatiguing_count : 0;

  return (
    <div className="w-full min-h-screen bg-white flex flex-col">
      {/* ── 1. Nav header ─────────────────────────────────────────────── */}
      <TopNav />

      {/* ── 1b. Celsius brand identity ────────────────────────────────── */}
      <BrandHeader creator={creator} totalViews={totalViews} count={count} />

      {/* ── 2. Stats bar ──────────────────────────────────────────────── */}
      <div className="flex items-center flex-none" style={{ paddingLeft: PAD, paddingRight: PAD, marginTop: 16, gap: 20 }}>
        <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 21, color: "#000", whiteSpace: "nowrap" }}>Running Campaigns</span>
        <div className="flex-1" />
        <StatGroup label="Thriving" value={fmtInt(thriving)} />
        <StatGroup label="Aging"    value={fmtInt(aging)} />
        <StatGroup label="Fatigued" value={fmtInt(fatigued)} />
      </div>

      {/* ── 3. Top performers (gauge + featured card + carousel) ──────── */}
      <TopPerformers ads={ads} />

      {/* ── 4. Ad gallery — real creatives, filter + grid/stack view ──── */}
      <div style={{ height: 24 }} className="flex-none" />
      <Gallery ads={ads} />
    </div>
  );
}
