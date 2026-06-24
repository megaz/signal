import { api } from "./api";
import type { EngagementResponse } from "@/types/engagement";

export const engagementService = {
  getForBrand: (brandId: string) => api.get<EngagementResponse>(`/brands/${brandId}/engagement`),
};
