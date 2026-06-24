import { api } from "./api";
import type { AdNode, AdDetail, BrandStats } from "@/types/ad";
import type { AdAnalytics } from "@/types/analytics";

export const adService = {
  getWebNodes: (brandId: string, includeCompetitors = false) =>
    api.get<{ nodes: AdNode[]; competitor_nodes: AdNode[] }>(
      `/brands/${brandId}/web?include_competitors=${includeCompetitors}`
    ),

  getStats: (brandId: string) =>
    api.get<BrandStats>(`/brands/${brandId}/stats`),

  getAd: (adId: string) =>
    api.get<AdDetail>(`/ads/${adId}`),

  getAnalytics: (adId: string) =>
    api.get<AdAnalytics>(`/ads/${adId}/analytics`),

  triggerSync: (brandId: string) =>
    api.post(`/ads/sync/${brandId}`),

  triggerAnalysis: (adId: string) =>
    api.post(`/ads/${adId}/analyze`),
};
