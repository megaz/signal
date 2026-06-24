import { api } from "./api";
import type { Refresh } from "@/types/review";

export const reviewService = {
  triggerGeneration: (adId: string, extraContext?: string) =>
    api.post<Refresh>(`/review/${adId}/generate`, { extra_context: extraContext ?? null }),

  getRefresh: (adId: string) =>
    api.get<Refresh>(`/review/${adId}/refresh`),

  approve: (refreshId: string, notes?: string) =>
    api.post<Refresh>(`/review/refresh/${refreshId}/approve`, { notes }),

  reject: (refreshId: string, notes: string) =>
    api.post<Refresh>(`/review/refresh/${refreshId}/reject`, { notes }),
};
