import { create } from "zustand";
import type { Beat } from "@/types/beat";
import { canvasService } from "@/services/canvasService";

interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
}

interface CanvasStore {
  beats: Beat[];
  loading: boolean;
  teardownRunning: boolean;
  copilotOpen: boolean;
  copilotMessages: CopilotMessage[];
  copilotLoading: boolean;

  loadBeats: (adId: string) => Promise<void>;
  runTeardown: (adId: string) => Promise<void>;
  requestFix: (beatId: string) => Promise<void>;
  acceptFix: (beatId: string) => Promise<void>;
  toggleCopilot: () => void;
  askCopilot: (adId: string, question: string) => Promise<void>;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  beats: [],
  loading: false,
  teardownRunning: false,
  copilotOpen: false,
  copilotMessages: [],
  copilotLoading: false,

  loadBeats: async (adId) => {
    set({ loading: true });
    const beats = await canvasService.getBeats(adId);
    set({ beats, loading: false });
  },

  runTeardown: async (adId) => {
    set({ teardownRunning: true });
    const { beats } = await canvasService.runTeardown(adId);
    set({ beats, teardownRunning: false });
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
