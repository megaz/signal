"use client";
import { motion, AnimatePresence } from "framer-motion";
import { BEAT_LABELS } from "@/lib/constants";
import { FONT, INK, MUTED, BORDER } from "@/lib/ui";
import type { Beat, BeatHealth } from "@/types/beat";

interface Props {
  beat: Beat;
  onRequestFix: () => void;
  onAcceptFix: () => void;
}

// Light status palette (matches the landing page / homepage)
const BEAT_LIGHT: Record<BeatHealth, string> = {
  strong: "#66A737",
  weak: "#E28929",
  critical: "#C9391A",
};
const HEALTH_TEXT: Record<BeatHealth, string> = {
  strong: "Strong",
  weak: "Weak",
  critical: "Critical",
};

export function BeatCard({ beat, onRequestFix, onAcceptFix }: Props) {
  const color = beat.fix_accepted ? BEAT_LIGHT.strong : BEAT_LIGHT[beat.health];
  const isWeak = beat.health !== "strong";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: "#fff",
        border: `1.5px solid ${beat.fix_accepted ? `${BEAT_LIGHT.strong}66` : BORDER}`,
        borderRadius: 16,
        padding: 16,
        fontFamily: FONT,
      }}
    >
      {/* Header */}
      <div className="flex items-center" style={{ gap: 10 }}>
        <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14, color: INK }}>
          {BEAT_LABELS[beat.beat_type]}
        </span>
        {/* health chip */}
        <span
          className="inline-flex items-center"
          style={{ gap: 5, background: `${color}14`, border: `1.5px solid ${color}40`, borderRadius: 20, padding: "2px 9px" }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 3, background: color }} />
          <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 11, color }}>
            {beat.fix_accepted ? "Fixed" : HEALTH_TEXT[beat.health]}
          </span>
        </span>
        <div className="flex-1" />
        <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color }}>
          {(beat.health_score * 100).toFixed(0)}
        </span>
        <span style={{ fontFamily: FONT, fontSize: 11, color: MUTED }}>/100</span>
      </div>

      {/* Diagnosis */}
      {beat.diagnosis && (
        <p style={{ fontFamily: FONT, fontSize: 13, lineHeight: 1.5, color: MUTED, marginTop: 8 }}>
          {beat.diagnosis}
        </p>
      )}

      {/* Fix flow */}
      <AnimatePresence initial={false}>
        {isWeak && !beat.fix_accepted && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden" }}
          >
            {!beat.proposed_fix ? (
              <button
                onClick={onRequestFix}
                className="transition-colors"
                style={{
                  marginTop: 12,
                  fontFamily: FONT,
                  fontWeight: 500,
                  fontSize: 13,
                  color,
                  background: `${color}12`,
                  border: `1.5px solid ${color}`,
                  borderRadius: 10,
                  padding: "7px 14px",
                }}
              >
                Propose fix →
              </button>
            ) : (
              <div
                style={{ marginTop: 12, background: "#fafafa", border: `1.5px solid ${BORDER}`, borderRadius: 12, padding: 14 }}
              >
                <p style={{ fontFamily: FONT, fontWeight: 500, fontSize: 13, color: INK, lineHeight: 1.5 }}>
                  {beat.proposed_fix.description}
                </p>
                <p style={{ fontFamily: FONT, fontSize: 12.5, color: MUTED, fontStyle: "italic", marginTop: 6, lineHeight: 1.5 }}>
                  “{beat.proposed_fix.script_delta}”
                </p>
                <div className="flex items-center" style={{ gap: 6, marginTop: 8 }}>
                  <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: "#8a8bc7", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Trend
                  </span>
                  <span style={{ fontFamily: FONT, fontSize: 12.5, color: INK }}>{beat.proposed_fix.trend_hook}</span>
                </div>
                <button
                  onClick={onAcceptFix}
                  className="transition-transform hover:scale-[1.02]"
                  style={{
                    marginTop: 12,
                    fontFamily: FONT,
                    fontWeight: 600,
                    fontSize: 13,
                    color: "#fff",
                    background: BEAT_LIGHT.strong,
                    border: "none",
                    borderRadius: 10,
                    padding: "8px 16px",
                  }}
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
