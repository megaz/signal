import { api } from "./api";
import type { Beat, FixProposal } from "@/types/beat";

export const canvasService = {
  getBeats: (adId: string) =>
    api.get<Beat[]>(`/canvas/${adId}/beats`),

  runTeardown: (adId: string) =>
    api.post<{ beats: Beat[] }>(`/canvas/${adId}/teardown`),

  getFixProposal: (beatId: string) =>
    api.post<FixProposal>(`/canvas/beats/${beatId}/fix`),

  acceptFix: (beatId: string) =>
    api.post<Beat>(`/canvas/beats/${beatId}/accept`),

  askCopilot: (adId: string, question: string) =>
    api.post<{ answer: string }>(`/canvas/${adId}/copilot`, { question }),
};
