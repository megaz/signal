"use client";

import { ThinkingTrace } from "./ThinkingTrace";
import { WidgetRenderer } from "./widgets/WidgetRenderer";
import { SuggestionChips } from "./SuggestionChips";
import { FONT, BORDER, MUTED } from "@/lib/ui";
import type { ChatMessage } from "@/hooks/useRadarChat";

export function MessageBubble({
  message,
  onPick,
  disabled,
}: {
  message: ChatMessage;
  onPick: (p: string) => void;
  disabled?: boolean;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end" style={{ marginBottom: 18 }}>
        <div
          style={{
            background: "#000", color: "#fff", fontFamily: FONT, fontSize: 14, lineHeight: 1.45,
            borderRadius: 18, borderBottomRightRadius: 4, padding: "10px 14px", maxWidth: "80%",
          }}
        >
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 24 }}>
      {message.error ? (
        <div style={{ fontFamily: FONT, fontSize: 14, color: "#C9391A" }}>Radar error: {message.error}</div>
      ) : message.loading && !message.result ? (
        <>
          <ThinkingTrace steps={[]} loading />
          <div style={{ border: `2px solid ${BORDER}`, borderRadius: 16, padding: 16 }}>
            {[80, 100, 60].map((w, i) => (
              <div key={i} style={{ height: 12, width: `${w}%`, background: "#f0f0f0", borderRadius: 6, marginBottom: 10 }} />
            ))}
          </div>
        </>
      ) : message.result ? (
        <>
          <ThinkingTrace steps={message.result.thinking} trace={message.result.backendTrace} />
          <WidgetRenderer widget={message.result.widget} brief={message.result.brief} />
          {message.result.text && (
            <p style={{ fontFamily: FONT, fontSize: 14, color: "#000", lineHeight: 1.5, marginTop: 12 }}>{message.result.text}</p>
          )}
          <SuggestionChips
            suggestions={message.result.suggestions}
            editSuggestions={message.result.editSuggestions}
            onPick={onPick}
            disabled={disabled}
          />
          {message.mode === "fallback" && (
            <div style={{ fontFamily: FONT, fontSize: 11, color: MUTED, marginTop: 10 }}>
              Demo mode (no live model key) — structured fallback response.
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
