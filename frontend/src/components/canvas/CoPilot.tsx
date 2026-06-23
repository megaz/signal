"use client";
import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCanvasStore } from "@/stores/canvasStore";

interface Props {
  adId: string;
}

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
        className="absolute bottom-6 right-6 z-10 flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-full text-sm font-medium transition-colors shadow-lg"
      >
        <span className="w-2 h-2 rounded-full bg-orange-500" />
        Co-pilot
      </button>

      <AnimatePresence>
        {copilotOpen && (
          <motion.aside
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute right-0 top-0 h-full w-80 bg-gray-900 border-l border-gray-800 flex flex-col z-20 shadow-2xl"
          >
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <span className="font-medium text-sm">AI Co-pilot</span>
              <button onClick={toggleCopilot} className="text-gray-500 hover:text-gray-300 text-xs">close</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
              {copilotMessages.length === 0 && (
                <p className="text-gray-500 text-xs">Ask anything about this ad — its creative choices, why beats are weak, or what the fix targets.</p>
              )}
              {copilotMessages.map((msg, i) => (
                <div key={i} className={msg.role === "user" ? "text-right" : "text-left"}>
                  <span
                    className={`inline-block px-3 py-2 rounded-xl max-w-[90%] text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-orange-700/40 text-orange-100"
                        : "bg-gray-800 text-gray-200"
                    }`}
                  >
                    {msg.content}
                  </span>
                </div>
              ))}
              {copilotLoading && (
                <div className="text-xs text-gray-500 animate-pulse">Thinking...</div>
              )}
            </div>

            <div className="p-3 border-t border-gray-800 flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask..."
                className="flex-1 text-xs bg-gray-800 rounded-lg px-3 py-2 outline-none placeholder:text-gray-600 focus:ring-1 focus:ring-orange-500"
              />
              <button
                onClick={handleSend}
                disabled={copilotLoading}
                className="text-xs px-3 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white rounded-lg transition-colors"
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
