import type { PrismCard, PrismChatBody, PrismCitation, PrismSource } from "@/types/prism";

export interface PrismStreamHandlers {
  onThinking?: (delta: string) => void;
  onSearch?: (query: string) => void;
  onSource?: (source: PrismSource) => void;
  onToken?: (delta: string) => void;
  onCitation?: (citation: PrismCitation) => void;
  onCard?: (card: PrismCard) => void;
  onSuggestions?: (items: string[]) => void;
  onDone?: (info: { stop_reason?: string }) => void;
  onError?: (err: { code?: string; message?: string }) => void;
}

/**
 * POST to the Prism SSE endpoint and dispatch each frame to a handler.
 * EventSource can't issue POST bodies, so we read the streamed body and parse
 * `event:` / `data:` frames by hand. Pass an AbortSignal to stop mid-stream.
 */
export async function streamPrismChat(
  body: PrismChatBody,
  handlers: PrismStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/v1/prism/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    handlers.onError?.({ code: "http_error", message: `API ${res.status}` });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      dispatchFrame(frame, handlers);
    }
  }
  if (buffer.trim()) dispatchFrame(buffer, handlers);
}

function dispatchFrame(raw: string, h: PrismStreamHandlers): void {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
  }
  if (!dataLines.length) return;

  let data: any;
  try {
    data = JSON.parse(dataLines.join("\n"));
  } catch {
    return;
  }

  switch (event) {
    case "thinking":
      h.onThinking?.(data.delta ?? "");
      break;
    case "search":
      h.onSearch?.(data.query ?? "");
      break;
    case "source":
      h.onSource?.(data as PrismSource);
      break;
    case "token":
      h.onToken?.(data.delta ?? "");
      break;
    case "citation":
      h.onCitation?.(data as PrismCitation);
      break;
    case "card":
      h.onCard?.(data as PrismCard);
      break;
    case "suggestions":
      h.onSuggestions?.(data.items ?? []);
      break;
    case "done":
      h.onDone?.(data ?? {});
      break;
    case "error":
      h.onError?.(data ?? {});
      break;
  }
}
