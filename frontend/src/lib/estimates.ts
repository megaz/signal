// Spend/revenue don't exist for organic posts — these are ESTIMATES derived from the
// real numbers (views + engagement rate). Always render them with an "est." label.
export const EST_CPM = 9;          // $ per 1,000 views (TikTok paid-social benchmark)
export const EST_BENCH_ER = 0.05;  // 5% benchmark engagement rate

/** If this reach were bought at benchmark CPM. */
export function estSpend(views: number): number {
  return (views / 1000) * EST_CPM;
}

/** Better-than-benchmark engagement → higher assumed return. Bounded 0.8×–4.5×. */
export function estRoas(engagementRate: number): number {
  return Math.max(0.8, Math.min(4.5, 1.2 + engagementRate / EST_BENCH_ER));
}

export function estRevenue(views: number, engagementRate: number): number {
  return estSpend(views) * estRoas(engagementRate);
}
