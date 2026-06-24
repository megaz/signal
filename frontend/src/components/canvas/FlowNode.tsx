"use client";

import { useState } from "react";
import { FONT, MUTED, INK } from "@/lib/ui";
import { BEAT_LABELS } from "@/lib/constants";
import type { BeatHealth } from "@/types/beat";

const BEAT_LIGHT: Record<BeatHealth, string> = {
  strong: "#66A737",
  weak: "#E28929",
  critical: "#C9391A",
};
const ORANGE = "#E28929";
const GREEN = "#66A737";

export type NodeVariant = "original" | "unchanged" | "patch" | "rebuilt" | "v2";

interface FlowNodeProps {
  id: string;
  label: string;
  health?: BeatHealth;
  actionText: string;
  variant: NodeVariant;
  badge?: string;
  editable?: boolean;
  accepted?: boolean;          // fix already accepted
  fixLoading?: boolean;        // requestFix in-flight
  onEdit?: (id: string, text: string) => void;
  onRequestFix?: (id: string) => void;   // "patch" nodes with no fix yet
  onAcceptFix?: (id: string) => void;    // "v2" nodes ready to accept
}

const NODE_W = 148;
const NODE_H = 90;

export function FlowNode({
  id, label, health, actionText, variant, badge,
  editable, accepted, fixLoading,
  onEdit, onRequestFix, onAcceptFix,
}: FlowNodeProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(actionText);

  const isOriginal = variant === "original";
  const isUnchanged = variant === "unchanged";
  const dim = isOriginal || isUnchanged;

  const dotColor = health
    ? BEAT_LIGHT[health]
    : variant === "rebuilt" || variant === "v2" ? ORANGE : "#aaa";

  const borderColor = accepted
    ? GREEN
    : variant === "patch" ? ORANGE
    : variant === "rebuilt" ? "#8a8bc7"
    : variant === "v2" ? ORANGE
    : "#ddd";

  function handleBlur() {
    setEditing(false);
    onEdit?.(id, draft);
  }

  const showGetFix = variant === "patch" && !!onRequestFix && !fixLoading;
  const showFixLoading = variant === "patch" && fixLoading;
  const showAccept = variant === "v2" && !!onAcceptFix && !accepted;
  const showAccepted = accepted;

  return (
    <div
      style={{
        width: NODE_W,
        minHeight: NODE_H,
        borderRadius: 14,
        border: `2px solid ${borderColor}`,
        background: dim ? "#f7f7f7" : "#fff",
        opacity: dim ? 0.45 : 1,
        padding: "9px 11px 10px",
        position: "relative",
        cursor: editable && !editing ? "pointer" : "default",
        boxShadow: accepted
          ? `0 0 0 3px ${GREEN}30`
          : !dim ? "0 1px 4px rgba(0,0,0,0.07)"
          : "none",
        flexShrink: 0,
        transition: "box-shadow 0.2s, border-color 0.2s",
      }}
      onClick={() => editable && !editing && !showGetFix && setEditing(true)}
    >
      {/* Label + health dot */}
      <div className="flex items-center justify-between" style={{ marginBottom: 5 }}>
        <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: dim ? "#aaa" : INK }}>
          {label}
        </span>
        <span style={{ width: 7, height: 7, borderRadius: 4, background: dotColor, flexShrink: 0 }} />
      </div>

      {/* Action text / edit */}
      {editing ? (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          style={{
            fontFamily: FONT, fontSize: 11, color: INK, width: "100%",
            border: "none", outline: "none", resize: "none", background: "transparent", lineHeight: 1.45,
          }}
          rows={3}
        />
      ) : (
        <p style={{
          fontFamily: FONT, fontSize: 11, color: dim ? "#bbb" : MUTED, lineHeight: 1.45,
          margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {draft || actionText || "—"}
        </p>
      )}

      {/* Get AI fix button (patch nodes without a fix yet) */}
      {showGetFix && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRequestFix(id); }}
          style={{
            marginTop: 7, width: "100%", padding: "5px 0",
            fontFamily: FONT, fontWeight: 600, fontSize: 10,
            color: ORANGE, background: `${ORANGE}12`,
            border: `1.5px solid ${ORANGE}50`,
            borderRadius: 8, cursor: "pointer",
          }}
        >
          Get AI fix →
        </button>
      )}
      {showFixLoading && (
        <p style={{ fontFamily: FONT, fontSize: 10, color: ORANGE, marginTop: 7, textAlign: "center" }}>
          Fixing…
        </p>
      )}

      {/* Accept button (v2 nodes) */}
      {showAccept && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAcceptFix(id); }}
          style={{
            marginTop: 7, width: "100%", padding: "5px 0",
            fontFamily: FONT, fontWeight: 600, fontSize: 10,
            color: GREEN, background: `${GREEN}12`,
            border: `1.5px solid ${GREEN}50`,
            borderRadius: 8, cursor: "pointer",
          }}
        >
          Accept fix ✓
        </button>
      )}
      {showAccepted && (
        <p style={{ fontFamily: FONT, fontSize: 10, color: GREEN, marginTop: 7, textAlign: "center", fontWeight: 600 }}>
          ✓ Accepted
        </p>
      )}

      {/* Badge */}
      {badge && (
        <span style={{
          position: "absolute", top: -9, right: 10,
          fontFamily: FONT, fontWeight: 600, fontSize: 9, letterSpacing: "0.05em",
          color: borderColor, background: "#fff", border: `1.5px solid ${borderColor}`,
          borderRadius: 8, padding: "1px 6px",
        }}>
          {badge}
        </span>
      )}
    </div>
  );
}

export { NODE_W, NODE_H, BEAT_LIGHT };
