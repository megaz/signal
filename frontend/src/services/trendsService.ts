import { api } from "./api";
import type { TrendsResponse, TrendSeries, TrendsRaw } from "@/types/trends";

export const trendsService = {
  getTrends: (keywords: string[], geo = "US") => {
    const qs = keywords.map((k) => `keywords=${encodeURIComponent(k)}`).join("&");
    return api.get<TrendsResponse>(`/trends?${qs}&geo=${encodeURIComponent(geo)}`);
  },
};

/** Flatten the raw {keyword: {ts: value}} payload into sorted series. */
export function normalizeTrends(raw: TrendsRaw): TrendSeries[] {
  return Object.entries(raw || {}).map(([keyword, byDate]) => ({
    keyword,
    points: Object.entries(byDate)
      .map(([date, value]) => ({ date, value: Number(value) }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  }));
}
