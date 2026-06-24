import type { Beat } from "@/types/beat";

export type AdHealth = "thriving" | "aging" | "fatiguing" | "declining";
export type AdPlatform = "meta" | "tiktok";

export interface AdNode {
  id: string;
  brand_id: string;
  platform: AdPlatform;
  title: string | null;
  thumbnail_url: string | null;
  health: AdHealth;
  health_score: number;
  run_days: number;
  reach_bucket: "high" | "mid" | "low" | null;
  variant_count: number;
  creative_family_id: string | null;
  started_at: string | null;
  last_seen_at: string | null;
}

export interface AdDetail extends AdNode {
  video_url: string | null;
  beats: Beat[];
}

export interface BrandStats {
  total: number;
  health_breakdown: Record<AdHealth, number>;
  fatiguing_count: number;
}
