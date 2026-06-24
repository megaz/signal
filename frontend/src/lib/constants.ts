import type { AdHealth } from "@/types/ad";
import type { BeatHealth } from "@/types/beat";

export const HEALTH_COLORS: Record<AdHealth, string> = {
  thriving: "#22c55e",   // green-500
  aging:    "#eab308",   // yellow-500
  fatiguing:"#f97316",  // orange-500
  declining:"#ef4444",  // red-500
};

export const BEAT_HEALTH_COLORS: Record<BeatHealth, string> = {
  strong:   "#22c55e",
  weak:     "#f97316",
  critical: "#ef4444",
};

export const BEAT_LABELS: Record<string, string> = {
  hook:    "Hook",
  build:   "Build",
  product: "Product",
  payoff:  "Payoff",
  cta:     "CTA",
};

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const WS_BASE  = process.env.NEXT_PUBLIC_WS_URL  ?? "ws://localhost:8000";

// ─── Light theme (new Figma-look pages: Manager / Canvas / Monitoring / Radar / Trends) ───

/** Single demo brand wired across the new pages. */
export const DEFAULT_BRAND_ID = process.env.NEXT_PUBLIC_DEFAULT_BRAND_ID ?? "celsius";

/** Muted earthy palette from the Figma landing page (page.tsx). */
export const STATUS_COLORS_LIGHT: Record<AdHealth, string> = {
  thriving:  "#66A737",
  aging:     "#E28929",
  fatiguing: "#D9531F",
  declining: "#C9391A",
};

export const HEALTH_LABELS: Record<AdHealth, string> = {
  thriving:  "Thriving",
  aging:     "Aging",
  fatiguing: "Fatiguing",
  declining: "Declining",
};

export function healthToLight(health: AdHealth): string {
  return STATUS_COLORS_LIGHT[health];
}

export const BEAT_ORDER: { key: string; label: string }[] = [
  { key: "hook",    label: "Hook" },
  { key: "build",   label: "Build" },
  { key: "product", label: "Product" },
  { key: "payoff",  label: "Payoff" },
  { key: "cta",     label: "CTA" },
];
