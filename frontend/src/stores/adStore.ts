import { create } from "zustand";
import type { AdNode, BrandStats } from "@/types/ad";
import { adService } from "@/services/adService";

interface AdStore {
  nodes: AdNode[];
  competitorNodes: AdNode[];
  stats: BrandStats | null;
  showCompetitors: boolean;
  loading: boolean;

  fetchWeb: (brandId: string) => Promise<void>;
  fetchStats: (brandId: string) => Promise<void>;
  toggleCompetitors: (brandId: string) => void;
}

export const useAdStore = create<AdStore>((set, get) => ({
  nodes: [],
  competitorNodes: [],
  stats: null,
  showCompetitors: false,
  loading: false,

  fetchWeb: async (brandId) => {
    set({ loading: true });
    const data = await adService.getWebNodes(brandId, get().showCompetitors);
    set({ nodes: data.nodes, competitorNodes: data.competitor_nodes, loading: false });
  },

  fetchStats: async (brandId) => {
    const stats = await adService.getStats(brandId);
    set({ stats });
  },

  toggleCompetitors: (brandId) => {
    const next = !get().showCompetitors;
    set({ showCompetitors: next });
    get().fetchWeb(brandId);
  },
}));
