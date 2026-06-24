// Analytics types — mirror app/schemas/analytics.py on the backend.

export interface RetentionPoint {
  pct: number;       // 0–100 runtime position
  value: number;     // 0–100 retention
  beat: string | null;
}

export interface GrowthPoint {
  day: number;
  label: string;
  value: number;     // 0–100 cumulative reach index
  velocity: number;  // day-over-day growth
}

export interface CultureNode {
  id: string;
  label: string;
  strength: number;  // 0–1 share of cultural engagement
  x: number;         // 0–1 niche → mainstream
  y: number;         // 0–1 functional → emotional
  engagement: number;
  posts: number;
  sentiment: "positive" | "neutral" | "watch";
  aligned: boolean;
}

export interface CultureAxis {
  label: string;
  low: string;
  high: string;
}

export interface CultureMap {
  nodes: CultureNode[];
  x_axis: CultureAxis;
  y_axis: CultureAxis;
  headline: string;
  dominant_theme: string | null;
}

export interface CulturalSignal {
  tag: string;
  title: string;
  description: string;
  source: string;
  url: string;
}

export interface RetentionSummary {
  avg_retention: number;
  hook_hold: number;
  drop_off: number;
  completion: number;
}

export interface GrowthSummary {
  peak_day: number;
  total_reach_index: number;
  trajectory: "scaling" | "plateauing" | "declining";
  momentum_pct: number;
}

export interface AdAnalytics {
  ad_id: string;
  status: "thriving" | "aging" | "fatigued";
  retention: RetentionPoint[];
  retention_summary: RetentionSummary;
  growth: GrowthPoint[];
  growth_summary: GrowthSummary;
  culture_map: CultureMap;
  cultural_signals: CulturalSignal[];
}
