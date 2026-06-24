"use client";

import { ResearchTrace } from "./ResearchTrace";
import { StreamingMarkdown } from "./StreamingMarkdown";
import { Suggestions } from "./Suggestions";
import { SourceChip } from "./SourceChip";
import { CardRenderer } from "./cards/CardRenderer";
import { FONT, MUTED } from "@/lib/ui";
import type { PrismCitation, PrismMessage } from "@/types/prism";

function dedupeCitations(citations: PrismCitation[]): PrismCitation[] {
  const seen = new Set<string>();
  const out: PrismCitation[] = [];
  for (const c of citations) {
    const key = c.url ?? c.title ?? "";
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

export function MessageView({
  message,
  onPick,
  disabled,
}: {
  message: PrismMessage;
  onPick: (p: string) => void;
  disabled?: boolean;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end" style={{ marginBottom: 20 }}>
        <div
          style={{
            background: "#000",
            color: "#fff",
            fontFamily: FONT,
            fontSize: 14,
            lineHeight: 1.45,
            borderRadius: 18,
            borderBottomRightRadius: 4,
            padding: "10px 14px",
            maxWidth: "80%",
          }}
        >
          {message.text}
        </div>
      </div>
    );
  }

  // No-key error gets a dedicated, friendly state.
  if (message.error?.code === "no_api_key") {
    return (
      <div style={{ marginBottom: 28, border: "1.5px solid #ececec", borderRadius: 14, padding: 18, background: "#fafafa" }}>
        <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 15, color: "#000", marginBottom: 6 }}>
          Prism needs an API key
        </div>
        <div style={{ fontFamily: FONT, fontSize: 13.5, color: MUTED, lineHeight: 1.5 }}>
          Set <code style={{ background: "#fff", borderRadius: 5, padding: "1px 5px" }}>ANTHROPIC_API_KEY</code> on the
          backend and restart it to enable live research, thinking, and answers.
        </div>
      </div>
    );
  }

  const citations = dedupeCitations(message.citations ?? []);
  const cards = message.cards ?? [];

  return (
    <div style={{ marginBottom: 28 }}>
      <ResearchTrace message={message} />

      {message.text && <StreamingMarkdown text={message.text} />}

      {citations.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
            Citations
          </div>
          <div className="flex flex-wrap" style={{ gap: 8 }}>
            {citations.map((c, i) => (
              <SourceChip key={i} source={{ url: c.url ?? "#", title: c.title, domain: c.domain }} index={i + 1} />
            ))}
          </div>
        </div>
      )}

      {cards.length > 0 && (
        <div className="flex flex-col" style={{ gap: 12, marginTop: 16 }}>
          {cards.map((card, i) => (
            <CardRenderer key={i} card={card} onAsk={onPick} />
          ))}
        </div>
      )}

      {message.error && message.error.code !== "no_api_key" && (
        <div style={{ fontFamily: FONT, fontSize: 13, color: "#C9391A", marginTop: 10 }}>
          Prism error: {message.error.message ?? "something went wrong"}
        </div>
      )}

      <Suggestions items={message.suggestions ?? []} onPick={onPick} disabled={disabled} />
    </div>
  );
}
