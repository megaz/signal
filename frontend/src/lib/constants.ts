import type { AdHealth, BeatHealth } from "@/types/ad";

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
