import { create } from "zustand";
import type { Refresh } from "@/types/review";
import { reviewService } from "@/services/reviewService";

interface ReviewStore {
  refresh: Refresh | null;
  loading: boolean;

  startGeneration: (adId: string) => Promise<void>;
  pollRefresh: (adId: string) => Promise<void>;
  approve: (notes?: string) => Promise<void>;
  reject: (notes: string) => Promise<void>;
}

export const useReviewStore = create<ReviewStore>((set, get) => ({
  refresh: null,
  loading: false,

  startGeneration: async (adId) => {
    set({ loading: true });
    const refresh = await reviewService.triggerGeneration(adId);
    set({ refresh, loading: false });
  },

  pollRefresh: async (adId) => {
    const refresh = await reviewService.getRefresh(adId);
    set({ refresh });
  },

  approve: async (notes) => {
    const { refresh } = get();
    if (!refresh) return;
    const updated = await reviewService.approve(refresh.id, notes);
    set({ refresh: updated });
  },

  reject: async (notes) => {
    const { refresh } = get();
    if (!refresh) return;
    const updated = await reviewService.reject(refresh.id, notes);
    set({ refresh: updated });
  },
}));
