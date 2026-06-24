"use client";

import { useCallback, useRef, useState } from "react";
import { streamPrismChat } from "@/services/prismService";
import type { PrismMessage, PrismTurn } from "@/types/prism";

let _id = 0;
const nextId = () => `m${_id++}`;

export function usePrismChat(brand = "Celsius") {
  const [messages, setMessages] = useState<PrismMessage[]>([]);
  const [pending, setPending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const patch = useCallback((id: string, fn: (m: PrismMessage) => PrismMessage) => {
    setMessages((list) => list.map((m) => (m.id === id ? fn(m) : m)));
  }, []);

  const send = useCallback(
    (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || pending) return;

      const history: PrismTurn[] = messages
        .filter((m) => m.text.trim() && !m.error)
        .map((m) => ({ role: m.role, text: m.text }));

      const assistantId = nextId();
      setMessages((list) => [
        ...list,
        { id: nextId(), role: "user", text: trimmed },
        {
          id: assistantId,
          role: "assistant",
          text: "",
          phase: "thinking",
          thinking: "",
          searches: [],
          sources: [],
          citations: [],
          cards: [],
          suggestions: [],
        },
      ]);
      setPending(true);

      const controller = new AbortController();
      abortRef.current = controller;

      streamPrismChat(
        { prompt: trimmed, brand, history },
        {
          onThinking: (delta) =>
            patch(assistantId, (m) => ({
              ...m,
              phase: m.phase === "writing" ? m.phase : "thinking",
              thinking: (m.thinking ?? "") + delta,
            })),
          onSearch: (query) =>
            patch(assistantId, (m) => ({
              ...m,
              phase: "researching",
              searches: query ? [...(m.searches ?? []), query] : m.searches,
            })),
          onSource: (source) =>
            patch(assistantId, (m) => {
              const sources = m.sources ?? [];
              if (sources.some((s) => s.url === source.url)) return { ...m, phase: "researching" };
              return { ...m, phase: "researching", sources: [...sources, source] };
            }),
          onToken: (delta) =>
            patch(assistantId, (m) => ({ ...m, phase: "writing", text: m.text + delta })),
          onCitation: (citation) =>
            patch(assistantId, (m) => {
              const citations = m.citations ?? [];
              if (citation.url && citations.some((c) => c.url === citation.url)) return m;
              return { ...m, citations: [...citations, citation] };
            }),
          onCard: (card) =>
            patch(assistantId, (m) => ({ ...m, cards: [...(m.cards ?? []), card] })),
          onSuggestions: (items) => patch(assistantId, (m) => ({ ...m, suggestions: items })),
          onDone: () => {
            patch(assistantId, (m) => ({ ...m, phase: "done" }));
            setPending(false);
            abortRef.current = null;
          },
          onError: (err) => {
            patch(assistantId, (m) => ({ ...m, phase: "done", error: err }));
            setPending(false);
            abortRef.current = null;
          },
        },
        controller.signal,
      ).catch((e) => {
        // AbortError is an expected user action; everything else surfaces on the message.
        if ((e as Error)?.name !== "AbortError") {
          patch(assistantId, (m) => ({
            ...m,
            phase: "done",
            error: { code: "network", message: (e as Error)?.message ?? String(e) },
          }));
        } else {
          patch(assistantId, (m) => ({ ...m, phase: "done" }));
        }
        setPending(false);
        abortRef.current = null;
      });
    },
    [brand, messages, pending, patch],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPending(false);
  }, []);

  return { messages, pending, send, stop };
}
