import { api } from "./api";
import type { RadarChatEnvelope } from "@/types/radar";

interface RadarContext {
  brand?: string;
  category?: string;
  campaign_context?: string;
  meta_signals?: string[];
}

export const radarService = {
  sendChat: (prompt: string, ctx: RadarContext = {}) =>
    api.post<RadarChatEnvelope>("/radar/chat", { prompt, ...ctx }),
};
