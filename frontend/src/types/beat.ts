export type BeatType = "hook" | "build" | "product" | "payoff" | "cta";
export type BeatHealth = "strong" | "weak" | "critical";

export interface Beat {
  id: string;
  beat_type: BeatType;
  order: number;
  start_ms: number | null;
  end_ms: number | null;
  health: BeatHealth;
  health_score: number;
  diagnosis: string | null;
  proposed_fix: {
    description: string;
    rationale: string;
    script_delta: string;
    trend_hook: string;
  } | null;
  fix_accepted: boolean;
}

export interface FixProposal {
  description: string;
  rationale: string;
  script_delta: string;
  trend_hook: string;
}
