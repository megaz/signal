import { create } from "zustand";
import type { Beat, PlanData } from "@/types/beat";
import { canvasService } from "@/services/canvasService";

export type CanvasStage = "plan" | "flow" | "generate";

interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
}

interface CanvasStore {
  // Beat state
  beats: Beat[];
  loading: boolean;
  teardownRunning: boolean;

  // Plan state
  canvasStage: CanvasStage;
  planData: PlanData | null;
  planLoading: boolean;

  // Node editing
  nodeEdits: Record<string, string>;   // beatId → user-edited action description
  brandKit: string;                    // brand guidelines text

  // Copilot
  copilotOpen: boolean;
  copilotMessages: CopilotMessage[];
  copilotLoading: boolean;

  // Actions
  loadBeats: (adId: string, onAnalysisComplete?: () => void) => Promise<void>;
  runTeardown: (adId: string, onComplete?: () => void) => Promise<void>;
  fetchPlan: (adId: string) => Promise<void>;
  requestFix: (beatId: string) => Promise<void>;
  acceptFix: (beatId: string) => Promise<void>;
  setNodeEdit: (id: string, text: string) => void;
  setBrandKit: (text: string) => void;
  setStage: (stage: CanvasStage) => void;
  toggleCopilot: () => void;
  askCopilot: (adId: string, question: string) => Promise<void>;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  beats: [],
  loading: false,
  teardownRunning: false,

  canvasStage: "plan",
  planData: null,
  planLoading: false,

  nodeEdits: {},
  brandKit: "",

  copilotOpen: false,
  copilotMessages: [],
  copilotLoading: false,

  loadBeats: async (adId, onAnalysisComplete) => {
    set({ loading: true });
    const beats = await canvasService.getBeats(adId);
    if (beats.length === 0) {
      set({ loading: false });
      await get().runTeardown(adId, onAnalysisComplete);
    } else {
      set({ beats, loading: false });
      // Beats exist but no plan yet — fetch plan automatically
      if (!get().planData) {
        await get().fetchPlan(adId);
      }
    }
  },

  runTeardown: async (adId, onComplete) => {
    set({ teardownRunning: true });
    const { beats } = await canvasService.runTeardown(adId);
    set({ beats, teardownRunning: false });
    onComplete?.();
    // Auto-fetch plan after teardown
    await get().fetchPlan(adId);
  },

  fetchPlan: async (adId) => {
    set({ planLoading: true });
    try {
      const planData = await canvasService.getPlan(adId);
      set({ planData, planLoading: false, canvasStage: "flow" });
    } catch {
      set({ planLoading: false });
    }
  },

  requestFix: async (beatId) => {
    const fix = await canvasService.getFixProposal(beatId);
    set((s) => ({
      beats: s.beats.map((b) =>
        b.id === beatId ? { ...b, proposed_fix: fix } : b
      ),
    }));
  },

  acceptFix: async (beatId) => {
    const updated = await canvasService.acceptFix(beatId);
    set((s) => ({
      beats: s.beats.map((b) => (b.id === beatId ? updated : b)),
    }));
  },

  setNodeEdit: (id, text) =>
    set((s) => ({ nodeEdits: { ...s.nodeEdits, [id]: text } })),

  setBrandKit: (text) => set({ brandKit: text }),

  setStage: (stage) => set({ canvasStage: stage }),

  toggleCopilot: () => set((s) => ({ copilotOpen: !s.copilotOpen })),

  askCopilot: async (adId, question) => {
    set((s) => ({
      copilotLoading: true,
      copilotMessages: [...s.copilotMessages, { role: "user", content: question }],
    }));
    const { answer } = await canvasService.askCopilot(adId, question);
    set((s) => ({
      copilotLoading: false,
      copilotMessages: [...s.copilotMessages, { role: "assistant", content: answer }],
    }));
  },
}));
