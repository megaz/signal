"use client";

import { useEffect, useRef, useState } from "react";
import { usePrismChat } from "@/hooks/usePrismChat";
import { MessageView } from "./MessageView";
import { PromptStarters } from "./PromptStarters";
import { FONT, PAGE_PAD, BORDER } from "@/lib/ui";

export function PrismChat() {
  const { messages, pending, send, stop } = usePrismChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const submit = () => {
    if (!input.trim() || pending) return;
    send(input);
    setInput("");
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto" style={{ paddingLeft: PAGE_PAD, paddingRight: PAGE_PAD }}>
        <div style={{ maxWidth: 820, margin: "0 auto", paddingBottom: 24 }}>
          {messages.length === 0 ? (
            <PromptStarters onPick={send} disabled={pending} />
          ) : (
            messages.map((m) => <MessageView key={m.id} message={m} onPick={send} disabled={pending} />)
          )}
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${BORDER}`, padding: `12px ${PAGE_PAD}px 18px` }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }} className="flex items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ask Prism to research anything…"
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              fontFamily: FONT,
              fontSize: 15,
              color: "#000",
              border: "2px solid #000",
              borderRadius: 24,
              padding: "12px 18px",
              outline: "none",
              maxHeight: 160,
            }}
          />
          {pending ? (
            <button
              onClick={stop}
              style={{
                marginLeft: 10,
                fontFamily: FONT,
                fontSize: 15,
                fontWeight: 500,
                color: "#000",
                background: "#fff",
                borderRadius: 24,
                padding: "12px 22px",
                border: "2px solid #000",
                cursor: "pointer",
              }}
            >
              Stop
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!input.trim()}
              style={{
                marginLeft: 10,
                fontFamily: FONT,
                fontSize: 15,
                fontWeight: 500,
                color: "#fff",
                background: "#000",
                borderRadius: 24,
                padding: "12px 22px",
                border: "2px solid #000",
                cursor: !input.trim() ? "default" : "pointer",
                opacity: !input.trim() ? 0.5 : 1,
              }}
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
