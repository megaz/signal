"use client";

import { useCallback, useState } from "react";
import { radarService } from "@/services/radarService";
import type { RadarResponse } from "@/types/radar";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text?: string;
  result?: RadarResponse;
  mode?: "live" | "fallback";
  loading?: boolean;
  error?: string;
}

let _id = 0;
const nextId = () => `m${_id++}`;

export function useRadarChat(brand = "Celsius") {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);

  const send = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || pending) return;
      const assistantId = nextId();
      setMessages((m) => [
        ...m,
        { id: nextId(), role: "user", text: trimmed },
        { id: assistantId, role: "assistant", loading: true },
      ]);
      setPending(true);
      try {
        const env = await radarService.sendChat(trimmed, { brand });
        setMessages((m) =>
          m.map((x) => (x.id === assistantId ? { ...x, loading: false, result: env.result, mode: env.mode } : x)),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, loading: false, error: msg } : x)));
      } finally {
        setPending(false);
      }
    },
    [brand, pending],
  );

  return { messages, pending, send };
}
