"use client";
import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCanvasStore } from "@/stores/canvasStore";
import { FONT, INK, MUTED, BORDER } from "@/lib/ui";

interface Props {
  adId: string;
}

const ACCENT = "#8a8bc7"; // periwinkle from the logo gradient — the "AI" accent

export function CoPilot({ adId }: Props) {
  const { copilotOpen, copilotMessages, copilotLoading, toggleCopilot, askCopilot } = useCanvasStore();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    const q = input.trim();
    if (!q) return;
    setInput("");
    await askCopilot(adId, q);
  };

  return (
    <>
      {/* Pill trigger */}
      <button
        onClick={toggleCopilot}
        className="absolute z-10 flex items-center transition-transform hover:scale-[1.03]"
        style={{
          bottom: 24,
          right: 24,
          gap: 8,
          padding: "10px 16px",
          background: "#fff",
          border: `1.5px solid ${INK}`,
          borderRadius: 30,
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: 14,
          color: INK,
          boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: 4, background: ACCENT }} />
        Co-pilot
      </button>

      <AnimatePresence>
        {copilotOpen && (
          <motion.aside
            initial={{ x: 340, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 340, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute right-0 top-0 h-full flex flex-col z-20"
            style={{ width: 340, background: "#fff", borderLeft: `1.5px solid ${BORDER}`, boxShadow: "-12px 0 32px rgba(0,0,0,0.08)" }}
          >
            <div className="flex items-center justify-between" style={{ padding: 16, borderBottom: `1.5px solid ${BORDER}` }}>
              <div className="flex items-center" style={{ gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: ACCENT }} />
                <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14, color: INK }}>AI Co-pilot</span>
              </div>
              <button
                onClick={toggleCopilot}
                style={{ fontFamily: FONT, fontSize: 12, color: MUTED }}
                className="hover:opacity-70 transition-opacity"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {copilotMessages.length === 0 && (
                <p style={{ fontFamily: FONT, fontSize: 13, lineHeight: 1.55, color: MUTED }}>
                  Ask anything about this creative — why a beat is weak, what the fix targets, or what trend to lean into.
                </p>
              )}
              {copilotMessages.map((msg, i) => {
                const isUser = msg.role === "user";
                return (
                  <div key={i} className={isUser ? "self-end" : "self-start"} style={{ maxWidth: "90%" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "9px 12px",
                        borderRadius: 14,
                        fontFamily: FONT,
                        fontSize: 13,
                        lineHeight: 1.5,
                        background: isUser ? INK : "#f4f4f5",
                        color: isUser ? "#fff" : INK,
                      }}
                    >
                      {msg.content}
                    </span>
                  </div>
                );
              })}
              {copilotLoading && (
                <span style={{ fontFamily: FONT, fontSize: 12, color: MUTED }} className="animate-pulse">
                  Thinking…
                </span>
              )}
            </div>

            <div className="flex" style={{ gap: 8, padding: 12, borderTop: `1.5px solid ${BORDER}` }}>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask about this creative…"
                className="flex-1 min-w-0 outline-none"
                style={{
                  fontFamily: FONT,
                  fontSize: 13,
                  color: INK,
                  background: "#f4f4f5",
                  borderRadius: 10,
                  padding: "9px 12px",
                  border: `1.5px solid transparent`,
                }}
              />
              <button
                onClick={handleSend}
                disabled={copilotLoading}
                className="transition-transform hover:scale-[1.03] disabled:opacity-40"
                style={{
                  fontFamily: FONT,
                  fontWeight: 600,
                  fontSize: 13,
                  color: "#fff",
                  background: INK,
                  borderRadius: 10,
                  padding: "0 16px",
                }}
              >
                Send
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
