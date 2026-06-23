"use client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { BEAT_HEALTH_COLORS, BEAT_LABELS } from "@/lib/constants";
import type { Beat } from "@/types/beat";

interface Props {
  beat: Beat;
  onRequestFix: () => void;
  onAcceptFix: () => void;
}

export function BeatCard({ beat, onRequestFix, onAcceptFix }: Props) {
  const color = BEAT_HEALTH_COLORS[beat.health];
  const isWeak = beat.health !== "strong";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border p-4 bg-gray-900 transition-colors",
        beat.fix_accepted ? "border-green-600/60" : "border-gray-800"
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: beat.fix_accepted ? "#22c55e" : color }}
        />
        <span className="text-sm font-medium tracking-wide">
          {BEAT_LABELS[beat.beat_type]}
        </span>
        <span className="ml-auto text-xs text-gray-500">
          {(beat.health_score * 100).toFixed(0)}%
        </span>
        {beat.fix_accepted && (
          <span className="text-xs text-green-400 font-medium">kept</span>
        )}
      </div>

      {beat.diagnosis && (
        <p className="mt-2 text-xs text-gray-400 pl-5">{beat.diagnosis}</p>
      )}

      <AnimatePresence>
        {isWeak && !beat.fix_accepted && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="pl-5 mt-3 overflow-hidden"
          >
            {!beat.proposed_fix ? (
              <button
                onClick={onRequestFix}
                className="text-xs px-3 py-1.5 border border-orange-600/50 text-orange-400 hover:bg-orange-600/10 rounded-lg transition-colors"
              >
                Propose fix
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-300">{beat.proposed_fix.description}</p>
                <p className="text-xs text-gray-500 italic">"{beat.proposed_fix.script_delta}"</p>
                <p className="text-xs text-blue-400">Trend: {beat.proposed_fix.trend_hook}</p>
                <button
                  onClick={onAcceptFix}
                  className="mt-1 text-xs px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                  Accept fix
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
