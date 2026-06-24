// Backend returns Google-Trends interest-over-time as { data: { keyword: { isoTimestamp: value } } }.
export type TrendsRaw = Record<string, Record<string, number>>;

export interface TrendsResponse {
  data: TrendsRaw;
}

export interface TrendSeries {
  keyword: string;
  points: { date: string; value: number }[];
}
