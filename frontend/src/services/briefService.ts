import { api } from "./api";
import type { CreativeBrief } from "@/types/brief";

export const briefService = {
  getBrief: (adId: string) =>
    api.post<CreativeBrief>(`/ads/${adId}/brief`),

  generateVariants: (adId: string, count = 3) =>
    api.post<{ queued: boolean; ad_id: string; count: number }>(
      `/review/${adId}/generate-variants?count=${count}`
    ),
};
