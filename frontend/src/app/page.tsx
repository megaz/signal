"use client";

import { useEffect, useRef, useState } from "react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import imgAvatar from "@/imports/MacBookPro142/85510eea03b550927f9e55a6dd3a47e8d4de59a5.png";
import imgLogo from "@/imports/MacBookPro142/dead263f5cd0cad1ebb5b08c03b9078354a946ff.png";
import svgPaths from "@/imports/MacBookPro142/svg-hc5vql6mh7";

// ─── Layout constants ──────────────────────────────────────────────────────────
const PAD = 40;        // horizontal page padding
const COL_GAP = 22;    // gap between gallery columns
const ROW_GAP = 14;    // gap between ads in a column
const TARGET_COL = 460; // desired column width → drives responsive column count
const FONT = "'Poppins', sans-serif";

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

// ─── Campaign cards ───────────────────────────────────────────────────────────
const CAMPAIGNS: { id: number; status: Status; trend: Trend }[] = [
  { id: 1,  status: "thriving", trend: "up"   },
  { id: 2,  status: "aging",    trend: "down"  },
  { id: 3,  status: "thriving", trend: "up"   },
  { id: 4,  status: "thriving", trend: "up"   },
  { id: 5,  status: "aging",    trend: "up"   },
  { id: 6,  status: "fatigued", trend: "down"  },
  { id: 7,  status: "thriving", trend: "up"   },
  { id: 8,  status: "aging",    trend: "down"  },
  { id: 9,  status: "thriving", trend: "up"   },
  { id: 10, status: "fatigued", trend: "down"  },
  { id: 11, status: "aging",    trend: "up"   },
  { id: 12, status: "thriving", trend: "up"   },
  { id: 13, status: "fatigued", trend: "down"  },
  { id: 14, status: "thriving", trend: "up"   },
  { id: 15, status: "aging",    trend: "up"   },
  { id: 16, status: "thriving", trend: "up"   },
  { id: 17, status: "fatigued", trend: "down"  },
  { id: 18, status: "aging",    trend: "down"  },
  { id: 19, status: "thriving", trend: "up"   },
  { id: 20, status: "aging",    trend: "up"   },
];

// ─── Top performer data (per toggle period) ─────────────────────────────────────
const PERIOD_DATA: Record<
  Period,
  {
    avg: number;
    change: string;
    trend: Trend;
    top: {
      name: string;
      handle: string;
      score: number;
      status: Status;
      trend: Trend;
      roas: string;
      spend: string;
      impr: string;
      ctr: string;
    };
  }
> = {
  day:   { avg: 86, change: "+5.1%",  trend: "up",   top: { name: "Summer Splash",  handle: "#sum-04", score: 94, status: "thriving", trend: "up",   roas: "4.8x", spend: "$2.4k", impr: "182k", ctr: "3.1%" } },
  week:  { avg: 82, change: "+4.2%",  trend: "up",   top: { name: "Back to School", handle: "#b2s-12", score: 91, status: "thriving", trend: "up",   roas: "4.2x", spend: "$14k",  impr: "1.2M", ctr: "2.8%" } },
  month: { avg: 78, change: "-1.8%",  trend: "down", top: { name: "Brand Awareness", handle: "#bra-07", score: 88, status: "thriving", trend: "up",  roas: "3.9x", spend: "$61k",  impr: "5.4M", ctr: "2.5%" } },
  year:  { avg: 84, change: "+18.6%", trend: "up",   top: { name: "Holiday Push",   handle: "#hol-21", score: 96, status: "thriving", trend: "up",   roas: "5.4x", spend: "$820k", impr: "62M",  ctr: "3.4%" } },
};

const PERIODS: { key: Period; label: string }[] = [
  { key: "day",   label: "Day"   },
  { key: "week",  label: "Week"  },
  { key: "month", label: "Month" },
  { key: "year",  label: "Year"  },
];

// ─── Ad gallery ───────────────────────────────────────────────────────────────
// TikTok-format creatives (9:16). Each card carries health status for filtering.
const TIKTOK_RATIO = 16 / 9; // height / width

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

type GalleryItem = {
  id: number;
  status: Status;
  trend: Trend;
  name: string;
  handle: string;
  score: number;
  rev: string;
  roas: string;
  impr: string;
  dropoff: string;
  ctr: string;
};

const GALLERY_NAMES = [
  "Summer Splash",  "Back to School", "Holiday Push",  "Brand Awareness",
  "Hydration Hits", "Energy Boost",   "Morning Reset", "Game Day",
  "Festival Series", "Gym Streak",    "Office Fuel",   "Trail Mix",
];

const GALLERY_ITEMS: GalleryItem[] = Array.from({ length: 24 }, (_, i) => {
  const status = (["thriving", "aging", "thriving", "fatigued", "aging", "thriving"] as Status[])[i % 6];
  const trend: Trend = status === "fatigued" ? "down" : "up";
  const r = (i * 37) % 100;
  const score =
    status === "thriving" ? 78 + (r % 20) : status === "aging" ? 55 + (r % 20) : 30 + (r % 22);
  return {
    id: i + 1,
    status,
    trend,
    name: GALLERY_NAMES[i % GALLERY_NAMES.length],
    handle: `#cmp-${String(i + 1).padStart(2, "0")}`,
    score,
    rev: `$${8 + (r % 90)}k`,
    roas: `${(2 + (r % 35) / 10).toFixed(1)}x`,
    impr: `${(0.3 + (r % 50) / 10).toFixed(1)}M`,
    dropoff: `${12 + (r % 40)}%`,
    ctr: `${(1.5 + (r % 30) / 10).toFixed(1)}%`,
  };
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function shadeFor(colIdx: number, numCols: number, rowIdx: number): string {
  const t = numCols > 1 ? colIdx / (numCols - 1) : 0.5;
  const base = Math.round(0x3a + (0xc8 - 0x3a) * t);
  const jitter = [0, -8, 7, -4, 10, -10][rowIdx % 6];
  const v = clamp(base + jitter, 0x20, 0xe0);
  const h = v.toString(16).padStart(2, "0");
  return `#${h}${h}${h}`;
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

// ─── Nav sub-components ─────────────────────────────────────────────────────────

function NavLogo() {
  return (
    <div
      className="relative flex-none rounded-full"
      style={{
        width: 46,
        height: 46,
        background: "linear-gradient(180deg, #bcbce5 36.923%, #8a8bc7 125.39%)",
      }}
    >
      <img
        src={imgLogo.src}
        alt="logo"
        className="absolute pointer-events-none"
        style={{ width: 25, height: 24, top: 11, left: 11, objectFit: "cover" }}
      />
    </div>
  );
}

function NavPill({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <div
      className="flex items-center justify-center flex-none cursor-pointer"
      style={{
        width: 132,
        height: 46,
        borderRadius: 26,
        border: `2px solid ${active ? "#000" : "rgba(138,138,138,0.8)"}`,
      }}
    >
      <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 17, color: "#000" }}>{label}</span>
    </div>
  );
}

function SearchBar() {
  return (
    <div
      className="flex items-center gap-2 flex-1 min-w-0"
      style={{ height: 46, borderRadius: 30, border: "2px solid #000", paddingLeft: 18, paddingRight: 16 }}
    >
      <svg style={{ width: 17, height: 17, flexShrink: 0 }} viewBox="0 0 21.7087 21.7055" fill="none">
        <path d={svgPaths.p2ec3ce00} stroke="#000" strokeWidth="2" />
      </svg>
      <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 17, color: "#000" }}>Search</span>
    </div>
  );
}

function UserSection() {
  return (
    <div className="flex items-center gap-2 flex-none">
      <div className="flex flex-col">
        <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 17, color: "#000", lineHeight: 1.2 }}>
          James Kuzan
        </span>
        <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 13, color: "rgba(0,0,0,0.3)", lineHeight: 1.2 }}>
          @JamesK
        </span>
      </div>
      <div className="flex-none overflow-hidden" style={{ width: 46, height: 46, borderRadius: 50 }}>
        <ImageWithFallback src={imgAvatar} alt="James Kuzan" className="w-full h-full object-cover" />
      </div>
    </div>
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
      <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 16, color: "rgba(0,0,0,0.55)", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <StatBadge value={value} />
    </div>
  );
}

// ─── Top performers ─────────────────────────────────────────────────────────────

// Trend badge SVG reused from the campaign card (top-right notch)
function TrendNotch({ color, trend, w = 44, h = 32 }: { color: string; trend: Trend; w?: number; h?: number }) {
  return (
    <svg style={{ width: w, height: h, display: "block" }} viewBox="0 0 54 39" fill="none">
      <path d={svgPaths.p3f477800} fill={color} />
      <path d={trend === "up" ? svgPaths.p817d080 : svgPaths.p7f52200} fill="white" />
    </svg>
  );
}

// Radial performance gauge (270° rainbow arc)
function Gauge({ value, change, trend }: { value: number; change: string; trend: Trend }) {
  const size = 168;
  const cx = size / 2;
  const cy = size / 2;
  const r = 64;
  const sw = 14;
  const START = -135;
  const END = 135;
  const valEnd = START + (END - START) * (clamp(value, 0, 100) / 100);
  const color = scoreColor(value);
  const trendColor = trend === "up" ? STATUS_COLOR.thriving : STATUS_COLOR.fatigued;

  return (
    <div
      className="flex-none flex flex-col items-center justify-center"
      style={{ width: 190, minHeight: 188, border: "2px solid #ececec", borderRadius: 22, padding: "6px 0" }}
    >
      <svg width={size} height={size * 0.84} viewBox={`0 0 ${size} ${size * 0.84}`}>
        {/* track */}
        <path d={describeArc(cx, cy, r, START, END)} stroke="#ececec" strokeWidth={sw} fill="none" strokeLinecap="round" />
        {/* value */}
        {value > 0 && (
          <path d={describeArc(cx, cy, r, START, valEnd)} stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round" />
        )}
        <text x={cx} y={cy - 2} textAnchor="middle" style={{ fontFamily: FONT, fontWeight: 600, fontSize: 38, fill: "#000" }}>
          {value}
        </text>
        <text x={cx} y={cy + 20} textAnchor="middle" style={{ fontFamily: FONT, fontWeight: 400, fontSize: 12, fill: "rgba(0,0,0,0.45)" }}>
          Performance
        </text>
      </svg>
      <div className="flex items-center gap-1" style={{ marginTop: -6 }}>
        <span style={{ color: trendColor, fontSize: 13 }}>{trend === "up" ? "▲" : "▼"}</span>
        <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 13, color: trendColor }}>{change}</span>
        <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 12, color: "rgba(0,0,0,0.4)" }}>vs prev.</span>
      </div>
    </div>
  );
}

function PeriodToggle({ period, setPeriod }: { period: Period; setPeriod: (p: Period) => void }) {
  return (
    <div className="flex items-center flex-none" style={{ border: "1.5px solid #000", borderRadius: 20, padding: 2, gap: 2 }}>
      {PERIODS.map((p) => {
        const active = p.key === period;
        return (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            style={{
              borderRadius: 16,
              padding: "4px 12px",
              background: active ? "#000" : "transparent",
              color: active ? "#fff" : "#000",
              fontFamily: FONT,
              fontWeight: 500,
              fontSize: 13,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col flex-1 items-start">
      <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 18, color: "#000", lineHeight: 1.1 }}>{value}</span>
      <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 12, color: "rgba(0,0,0,0.4)" }}>{label}</span>
    </div>
  );
}

function FeaturedPerformerCard({
  period,
  setPeriod,
  data,
}: {
  period: Period;
  setPeriod: (p: Period) => void;
  data: (typeof PERIOD_DATA)[Period]["top"];
}) {
  const color = STATUS_COLOR[data.status];
  return (
    <div
      className="flex-1 min-w-0 flex flex-col"
      style={{ border: "2px solid #ececec", borderRadius: 22, padding: 18 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 14, color: "rgba(0,0,0,0.5)" }}>
          Top Performer
        </span>
        <PeriodToggle period={period} setPeriod={setPeriod} />
      </div>

      {/* Body */}
      <div className="flex items-center gap-4" style={{ marginTop: 14 }}>
        {/* Thumbnail */}
        <div className="relative flex-none" style={{ width: 84, height: 92, backgroundColor: "#262626", borderRadius: 16 }}>
          <div style={{ position: "absolute", top: 0, right: 0 }}>
            <TrendNotch color={color} trend={data.trend} w={36} h={26} />
          </div>
          <div style={{ position: "absolute", bottom: 10, left: 10, width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
        </div>

        {/* Name + status */}
        <div className="flex flex-col min-w-0">
          <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 22, color: "#000", lineHeight: 1.15, whiteSpace: "nowrap" }}>
            {data.name}
          </span>
          <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 13, color: "rgba(0,0,0,0.35)" }}>{data.handle}</span>
          <div className="flex items-center gap-1.5" style={{ marginTop: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
            <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 13, color }}>{STATUS_LABEL[data.status]}</span>
          </div>
        </div>

        <div className="flex-1" />

        {/* Score */}
        <div className="flex flex-col items-end flex-none">
          <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 40, color, lineHeight: 1 }}>{data.score}</span>
          <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 12, color: "rgba(0,0,0,0.4)" }}>perf. score</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="flex items-center" style={{ marginTop: 16, borderTop: "1px solid #efefef", paddingTop: 12, gap: 8 }}>
        <Metric label="ROAS" value={data.roas} />
        <Metric label="Spend" value={data.spend} />
        <Metric label="Impressions" value={data.impr} />
        <Metric label="CTR" value={data.ctr} />
      </div>
    </div>
  );
}

// Compact campaign card for the carousel
function CampaignCard({ status, trend }: { status: Status; trend: Trend }) {
  const color = STATUS_COLOR[status];
  return (
    <div
      className="relative flex-none"
      style={{ width: 162, height: 240, backgroundColor: "#262626", borderRadius: 22, flexShrink: 0 }}
    >
      <div style={{ position: "absolute", top: 12, left: 12 }}>
        <svg style={{ width: 18, height: 18, display: "block" }} viewBox="0 0 21 21" fill="none">
          <circle cx="10.5" cy="10.5" r="9.5" stroke="white" strokeWidth="2" />
          <path d={svgPaths.p3c4bedc0} fill="white" />
        </svg>
      </div>
      <div style={{ position: "absolute", top: 0, right: 0 }}>
        <TrendNotch color={color} trend={trend} w={45} h={32} />
      </div>
    </div>
  );
}

function TopPerformers() {
  const [period, setPeriod] = useState<Period>("week");
  const d = PERIOD_DATA[period];

  return (
    <>
      {/* Section title + gauge / featured card */}
      <div className="flex-none" style={{ paddingLeft: PAD, paddingRight: PAD, marginTop: 22 }}>
        <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 22, color: "#000" }}>Top Performers</span>
        <div className="flex items-stretch" style={{ gap: 18, marginTop: 12 }}>
          <Gauge value={d.avg} change={d.change} trend={d.trend} />
          <FeaturedPerformerCard period={period} setPeriod={setPeriod} data={d.top} />
        </div>
      </div>

      {/* Carousel */}
      <div className="relative flex-none" style={{ marginTop: 16 }}>
        <div
          className="absolute inset-y-0 left-0 z-10 pointer-events-none"
          style={{ width: 80, background: "linear-gradient(to right, white 0%, rgba(255,255,255,0) 100%)" }}
        />
        <div
          className="flex"
          style={{ gap: 16, paddingLeft: PAD, paddingRight: PAD, overflowX: "auto", scrollbarWidth: "none" }}
        >
          {CAMPAIGNS.map((c) => (
            <CampaignCard key={c.id} status={c.status} trend={c.trend} />
          ))}
        </div>
        <div
          className="absolute inset-y-0 right-0 z-10 pointer-events-none"
          style={{ width: 160, background: "linear-gradient(to right, rgba(255,255,255,0) 0%, white 100%)" }}
        />
      </div>
    </>
  );
}

// ─── Ad gallery ─────────────────────────────────────────────────────────────────

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

function TikTokCard({
  item,
  width,
  shade,
}: {
  item: GalleryItem;
  width: number;
  shade: string;
}) {
  const color = STATUS_COLOR[item.status];
  const height = Math.round(width * TIKTOK_RATIO);
  return (
    <div className="relative flex-none" style={{ width, height, backgroundColor: shade, borderRadius: 18, flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 12, left: 12 }}>
        <svg style={{ width: 18, height: 18, display: "block" }} viewBox="0 0 21 21" fill="none">
          <circle cx="10.5" cy="10.5" r="9.5" stroke="white" strokeWidth="2" />
          <path d={svgPaths.p3c4bedc0} fill="white" />
        </svg>
      </div>
      <div style={{ position: "absolute", top: 0, right: 0 }}>
        <TrendNotch color={color} trend={item.trend} w={45} h={32} />
      </div>
      <div className="absolute flex items-center gap-1.5" style={{ bottom: 12, left: 12 }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
        <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 12, color: "rgba(255,255,255,0.85)" }}>
          {STATUS_LABEL[item.status]}
        </span>
      </div>
    </div>
  );
}

function StackMetric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col">
      <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 18, color: accent ?? "#000", lineHeight: 1.1 }}>
        {value}
      </span>
      <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 11, color: "rgba(0,0,0,0.4)", whiteSpace: "nowrap" }}>
        {label}
      </span>
    </div>
  );
}

// Stack view row: a rectangular pill split into a creative column (video + info)
// and a linked analytics column (revenue, ROAS, impressions, drop-off, signal).
function StackRow({ item, shade }: { item: GalleryItem; shade: string }) {
  const color = STATUS_COLOR[item.status];
  const signal = item.status === "thriving" ? "Strong" : item.status === "aging" ? "Watch" : "At Risk";
  const vidW = 104;
  const vidH = Math.round(vidW * TIKTOK_RATIO);
  return (
    <div className="flex items-stretch w-full" style={{ border: "2px solid #ececec", borderRadius: 24, padding: 14, gap: 18 }}>
      {/* Column 1 — video + campaign info */}
      <div className="flex items-center flex-none" style={{ gap: 14 }}>
        <div className="relative flex-none" style={{ width: vidW, height: vidH, backgroundColor: shade, borderRadius: 16 }}>
          <div style={{ position: "absolute", top: 10, left: 10 }}>
            <svg style={{ width: 16, height: 16, display: "block" }} viewBox="0 0 21 21" fill="none">
              <circle cx="10.5" cy="10.5" r="9.5" stroke="white" strokeWidth="2" />
              <path d={svgPaths.p3c4bedc0} fill="white" />
            </svg>
          </div>
          <div style={{ position: "absolute", top: 0, right: 0 }}>
            <TrendNotch color={color} trend={item.trend} w={38} h={27} />
          </div>
        </div>
        <div className="flex flex-col" style={{ width: 150 }}>
          <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 17, color: "#000", lineHeight: 1.2 }}>
            {item.name}
          </span>
          <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 12, color: "rgba(0,0,0,0.35)" }}>
            {item.handle}
          </span>
          <div className="flex items-center gap-1.5" style={{ marginTop: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
            <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 13, color }}>{STATUS_LABEL[item.status]}</span>
          </div>
          <div className="flex items-baseline gap-1" style={{ marginTop: 10 }}>
            <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 26, color, lineHeight: 1 }}>{item.score}</span>
            <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 11, color: "rgba(0,0,0,0.4)" }}>perf.</span>
          </div>
        </div>
      </div>

      {/* Divider linking the two columns */}
      <div className="flex-none self-stretch" style={{ width: 1, background: "#efefef" }} />

      {/* Column 2 — analytics linked to the creative */}
      <div className="flex-1 min-w-0 flex flex-col justify-center" style={{ gap: 14 }}>
        <div className="flex items-center justify-between">
          <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 12, color: "rgba(0,0,0,0.45)" }}>
            Performance signals
          </span>
          <div
            className="flex items-center gap-1.5 flex-none"
            style={{ border: `1.5px solid ${color}`, borderRadius: 20, padding: "3px 10px" }}
          >
            <span style={{ color, fontSize: 11 }}>{item.trend === "up" ? "▲" : "▼"}</span>
            <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 12, color }}>{signal}</span>
          </div>
        </div>
        <div className="flex flex-wrap" style={{ gap: "14px 28px" }}>
          <StackMetric label="Revenue" value={item.rev} />
          <StackMetric label="ROAS" value={item.roas} accent={STATUS_COLOR.thriving} />
          <StackMetric label="Impressions" value={item.impr} />
          <StackMetric label="Drop-off" value={item.dropoff} accent={STATUS_COLOR.fatigued} />
          <StackMetric label="CTR" value={item.ctr} />
          <StackMetric label="Perf. score" value={String(item.score)} accent={color} />
        </div>
      </div>
    </div>
  );
}

function Gallery() {
  const [ref, width] = useElementWidth();
  const [view, setView] = useState<GalleryView>("grid");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const inner = Math.max(0, width - PAD * 2);
  const numCols = inner ? Math.max(1, Math.round(inner / TARGET_COL)) : 3;
  const colWidth = inner ? (inner - (numCols - 1) * COL_GAP) / numCols : TARGET_COL;
  const items = GALLERY_ITEMS.filter((it) => filter === "all" || it.status === filter);

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
          {items.map((it, i) => (
            <TikTokCard
              key={it.id}
              item={it}
              width={colWidth}
              shade={shadeFor(i % numCols, numCols, Math.floor(i / numCols))}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: 14 }}>
          {items.map((it, i) => (
            <StackRow key={it.id} item={it} shade={shadeFor(0, 1, i)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <div className="w-full min-h-screen bg-white flex flex-col">
      {/* ── 1. Nav header ─────────────────────────────────────────────── */}
      <div className="flex items-center flex-none" style={{ paddingLeft: PAD, paddingRight: PAD, paddingTop: 28, gap: 14 }}>
        <NavLogo />
        <NavPill label="Manager" active />
        <NavPill label="Canvas" />
        <NavPill label="Monitoring" />
        <div className="flex-1 min-w-0" style={{ marginLeft: 12, maxWidth: 340 }}>
          <SearchBar />
        </div>
        <div className="flex-1" />
        <UserSection />
      </div>

      {/* ── 2. Stats bar ──────────────────────────────────────────────── */}
      <div className="flex items-center flex-none" style={{ paddingLeft: PAD, paddingRight: PAD, marginTop: 16, gap: 20 }}>
        <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 21, color: "#000", whiteSpace: "nowrap" }}>
          Running Campaigns
        </span>
        <div className="flex-1" />
        <StatGroup label="Thriving" value="1,004" />
        <StatGroup label="Aging"    value="920"   />
        <StatGroup label="Fatigued" value="84"    />
      </div>

      {/* ── 3. Top performers (gauge + featured card + carousel) ──────── */}
      <TopPerformers />

      {/* ── 4. Ad gallery — fills remaining height, responsive masonry ── */}
      <div style={{ height: 24 }} className="flex-none" />
      <Gallery />
    </div>
  );
}
