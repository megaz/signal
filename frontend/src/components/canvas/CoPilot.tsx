"use client";
import { useState, useRef, useEffect } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { FONT, INK, MUTED, BORDER } from "@/lib/ui";

interface Props {
  adId: string;
}

const ACCENT = "#8a8bc7";
const PILL_H = 48;
const PANEL_H = 320;
const PILL_W = 280;

export function CoPilot({ adId }: Props) {
  const { copilotOpen, copilotMessages, copilotLoading, toggleCopilot, askCopilot } = useCanvasStore();
  const [input, setInput] = useState("");
  const pillRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of thread when new messages arrive
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [copilotMessages]);

  // Collapse on outside click
  useEffect(() => {
    if (!copilotOpen) return;
    function handleClick(e: MouseEvent) {
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) {
        toggleCopilot();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [copilotOpen, toggleCopilot]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || copilotLoading) return;
    setInput("");
    await askCopilot(adId, q);
  };

  const expanded = copilotOpen;
  const currentH = expanded ? PANEL_H : PILL_H;

  return (
    <div
      ref={pillRef}
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        width: PILL_W,
        height: currentH,
        borderRadius: expanded ? 20 : 30,
        background: "#fff",
        border: `1.5px solid ${expanded ? BORDER : INK}`,
        boxShadow: "0 6px 24px rgba(0,0,0,0.13)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "height 0.22s cubic-bezier(0.4,0,0.2,1), border-radius 0.22s",
        zIndex: 50,
      }}
    >
      {/* Collapsed pill / clickable header */}
      <div
        onClick={toggleCopilot}
        className="flex items-center"
        style={{
          gap: 8,
          padding: expanded ? "10px 16px" : "0 16px",
          height: PILL_H,
          cursor: "pointer",
          flexShrink: 0,
          borderBottom: expanded ? `1.5px solid ${BORDER}` : "none",
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: 4, background: ACCENT, flexShrink: 0 }} />
        <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14, color: INK, flex: 1 }}>
          {expanded ? "AI Co-pilot" : "Ask co-pilot…"}
        </span>
        {expanded && (
          <span style={{ fontFamily: FONT, fontSize: 12, color: MUTED }}>↓</span>
        )}
      </div>

      {/* Message thread — only rendered when expanded */}
      {expanded && (
        <>
          <div
            ref={threadRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "10px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 9,
            }}
          >
            {copilotMessages.length === 0 && (
              <p style={{ fontFamily: FONT, fontSize: 12, lineHeight: 1.55, color: MUTED, margin: 0 }}>
                Ask anything — why a beat is weak, what fix to target, what trend to lean into.
              </p>
            )}
            {copilotMessages.map((msg, i) => {
              const isUser = msg.role === "user";
              return (
                <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                  <span style={{
                    display: "inline-block",
                    padding: "7px 11px",
                    borderRadius: 12,
                    fontFamily: FONT,
                    fontSize: 12,
                    lineHeight: 1.5,
                    background: isUser ? INK : "#f2f2f4",
                    color: isUser ? "#fff" : INK,
                    maxWidth: "88%",
                  }}>
                    {msg.content}
                  </span>
                </div>
              );
            })}
            {copilotLoading && (
              <span style={{ fontFamily: FONT, fontSize: 12, color: MUTED, fontStyle: "italic" }}>
                Thinking…
              </span>
            )}
          </div>

          {/* Input row */}
          <div className="flex" style={{ gap: 7, padding: "8px 10px", borderTop: `1.5px solid ${BORDER}`, flexShrink: 0 }}>
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about this creative…"
              className="flex-1 min-w-0 outline-none"
              style={{
                fontFamily: FONT, fontSize: 12, color: INK,
                background: "#f4f4f5", borderRadius: 9, padding: "7px 10px",
                border: "1.5px solid transparent",
              }}
            />
            <button
              onClick={handleSend}
              disabled={copilotLoading || !input.trim()}
              style={{
                fontFamily: FONT, fontWeight: 600, fontSize: 12,
                color: "#fff", background: INK, borderRadius: 9,
                padding: "0 12px", border: "none",
                opacity: copilotLoading || !input.trim() ? 0.4 : 1,
                cursor: copilotLoading || !input.trim() ? "not-allowed" : "pointer",
              }}
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}
