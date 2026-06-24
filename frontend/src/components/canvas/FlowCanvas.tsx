"use client";

import { useState } from "react";
import { FONT, MUTED, INK, BORDER } from "@/lib/ui";
import { BEAT_LABELS } from "@/lib/constants";
import { FlowNode, NODE_W, NODE_H } from "./FlowNode";
import type { Beat } from "@/types/beat";
import type { PlanData } from "@/types/beat";

const GAP = 36;
const ARROW_W = GAP;
const ROW_GAP = 40;
const BRANCH_DROP = 32;

interface Props {
  beats: Beat[];
  planData: PlanData;
  nodeEdits: Record<string, string>;
  onNodeEdit: (id: string, text: string) => void;
  onRequestFix: (beatId: string) => Promise<void>;
  onAcceptFix: (beatId: string) => Promise<void>;
  brandKit: string;
  onBrandKitChange: (text: string) => void;
}

function HArrow({ color = "#ddd" }: { color?: string }) {
  return (
    <svg width={ARROW_W} height={NODE_H} viewBox={`0 0 ${ARROW_W} ${NODE_H}`} style={{ flexShrink: 0 }}>
      <line x1={4} y1={NODE_H / 2} x2={ARROW_W - 8} y2={NODE_H / 2}
        stroke={color} strokeWidth={2} strokeLinecap="round" />
      <path d={`M ${ARROW_W - 12} ${NODE_H / 2 - 5} L ${ARROW_W - 6} ${NODE_H / 2} L ${ARROW_W - 12} ${NODE_H / 2 + 5}`}
        stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BrandKitPill({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          fontFamily: FONT, fontSize: 12, color: open ? "#fff" : INK,
          background: open ? "#000" : "#f4f4f4",
          border: `1.5px solid ${open ? "#000" : BORDER}`,
          borderRadius: 20, padding: "5px 12px", cursor: "pointer",
        }}
      >
        ⊕ Brand kit
      </button>
      {open && (
        <div style={{
          position: "absolute", top: 38, right: 0, zIndex: 20,
          background: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 14,
          padding: 14, width: 280, boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        }}>
          <p style={{ fontFamily: FONT, fontSize: 12, color: MUTED, marginBottom: 8 }}>
            Paste brand guidelines, colors, tone of voice — injected into generation.
          </p>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. Brand colors: #FF6B35, #2C3E50. Tone: energetic, direct. No lifestyle imagery."
            rows={5}
            style={{
              fontFamily: FONT, fontSize: 12, color: INK, width: "100%",
              border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: 8,
              resize: "vertical", outline: "none",
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Variations flow ──────────────────────────────────────────────────────────
function VariationsFlow({ beats, planData, nodeEdits, onNodeEdit, onRequestFix, onAcceptFix }: {
  beats: Beat[];
  planData: PlanData;
  nodeEdits: Record<string, string>;
  onNodeEdit: (id: string, text: string) => void;
  onRequestFix: (beatId: string) => Promise<void>;
  onAcceptFix: (beatId: string) => Promise<void>;
}) {
  const affectedIds = new Set(planData.affected_beat_ids);
  const sorted = [...beats].sort((a, b) => a.order - b.order);
  const [fixing, setFixing] = useState<Set<string>>(new Set());

  async function handleRequestFix(beatId: string) {
    setFixing((s) => new Set(s).add(beatId));
    await onRequestFix(beatId);
    setFixing((s) => { const n = new Set(s); n.delete(beatId); return n; });
  }

  async function handleAcceptFix(beatId: string) {
    await onAcceptFix(beatId);
  }

  const hasBranches = sorted.some((b) => affectedIds.has(b.id) && b.proposed_fix);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Main row */}
      <div style={{ display: "flex", alignItems: "center" }}>
        {sorted.map((beat, i) => {
          const isAffected = affectedIds.has(beat.id);
          const arrowColor = isAffected ? "#E28929" : "#ddd";
          return (
            <div key={beat.id} style={{ display: "flex", alignItems: "center" }}>
              <FlowNode
                id={beat.id}
                label={BEAT_LABELS[beat.beat_type] ?? beat.beat_type}
                health={beat.health}
                actionText={nodeEdits[beat.id] ?? beat.diagnosis ?? ""}
                variant={isAffected ? "patch" : "unchanged"}
                badge={isAffected ? "Patch" : undefined}
                editable={isAffected && !beat.proposed_fix}
                fixLoading={fixing.has(beat.id)}
                onEdit={onNodeEdit}
                onRequestFix={isAffected && !beat.proposed_fix ? handleRequestFix : undefined}
              />
              {i < sorted.length - 1 && <HArrow color={isAffected ? arrowColor : "#ddd"} />}
            </div>
          );
        })}
      </div>

      {/* Branch row — v2 nodes with Accept buttons */}
      {hasBranches && (
        <div style={{ display: "flex", alignItems: "flex-start", marginTop: BRANCH_DROP }}>
          {sorted.map((beat) => {
            const isAffected = affectedIds.has(beat.id);
            const fix = beat.proposed_fix;
            const colW = NODE_W + GAP;
            if (!isAffected || !fix) {
              return <div key={beat.id} style={{ width: colW, flexShrink: 0 }} />;
            }
            const v2Id = `v2_${beat.id}`;
            return (
              <div key={beat.id} style={{ width: colW, flexShrink: 0, paddingRight: GAP }}>
                <FlowNode
                  id={v2Id}
                  label={`${BEAT_LABELS[beat.beat_type] ?? beat.beat_type} v2`}
                  actionText={nodeEdits[v2Id] ?? fix.script_delta}
                  variant="v2"
                  badge="v2"
                  accepted={beat.fix_accepted}
                  editable={!beat.fix_accepted}
                  onEdit={onNodeEdit}
                  onAcceptFix={!beat.fix_accepted ? () => handleAcceptFix(beat.id) : undefined}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Hint if no fixes requested yet */}
      {!hasBranches && affectedIds.size > 0 && (
        <p style={{ fontFamily: FONT, fontSize: 12, color: MUTED, marginTop: 10 }}>
          Click "Get AI fix →" on highlighted beats to generate alternate versions below.
        </p>
      )}
    </div>
  );
}

// ─── Full Recreate flow ───────────────────────────────────────────────────────
function RecreateFlow({ beats, planData, nodeEdits, onNodeEdit }: {
  beats: Beat[];
  planData: PlanData;
  nodeEdits: Record<string, string>;
  onNodeEdit: (id: string, text: string) => void;
}) {
  const sorted = [...beats].sort((a, b) => a.order - b.order);
  const rebuilt = [...planData.rebuilt_beats].sort((a, b) => a.order - b.order);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: ROW_GAP }}>
      {/* Original row (dim) */}
      <div>
        <span style={{ fontFamily: FONT, fontSize: 11, color: MUTED, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Original
        </span>
        <div style={{ display: "flex", alignItems: "center", marginTop: 6 }}>
          {sorted.map((beat, i) => (
            <div key={beat.id} style={{ display: "flex", alignItems: "center" }}>
              <FlowNode
                id={beat.id}
                label={BEAT_LABELS[beat.beat_type] ?? beat.beat_type}
                health={beat.health}
                actionText={beat.diagnosis ?? ""}
                variant="original"
              />
              {i < sorted.length - 1 && <HArrow />}
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: `1.5px dashed ${BORDER}`, width: "100%" }} />

      {/* Rebuilt row */}
      <div>
        <span style={{ fontFamily: FONT, fontSize: 11, color: "#8a8bc7", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Rebuilt from scratch
        </span>
        <div style={{ display: "flex", alignItems: "center", marginTop: 6 }}>
          {rebuilt.map((rb, i) => {
            const rbId = `rebuilt_${rb.beat_type}_${rb.order}`;
            return (
              <div key={rbId} style={{ display: "flex", alignItems: "center" }}>
                <FlowNode
                  id={rbId}
                  label={BEAT_LABELS[rb.beat_type] ?? rb.beat_type}
                  actionText={nodeEdits[rbId] ?? rb.action}
                  variant="rebuilt"
                  badge="New"
                  editable
                  onEdit={onNodeEdit}
                />
                {i < rebuilt.length - 1 && <HArrow color="#8a8bc7" />}
              </div>
            );
          })}
        </div>
        <p style={{ fontFamily: FONT, fontSize: 12, color: MUTED, marginTop: 10 }}>
          Edit any node's action text, then click Generate when ready.
        </p>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export function FlowCanvas({ beats, planData, nodeEdits, onNodeEdit, onRequestFix, onAcceptFix, brandKit, onBrandKitChange }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <span style={{ fontFamily: FONT, fontSize: 13, color: MUTED }}>
          {planData.strategy === "variations"
            ? 'Click "Get AI fix" on highlighted beats, then accept each proposed change.'
            : "Edit rebuilt nodes, then click Generate."}
        </span>
        <BrandKitPill value={brandKit} onChange={onBrandKitChange} />
      </div>

      <div style={{ overflowX: "auto", paddingBottom: 12 }}>
        {planData.strategy === "variations" ? (
          <VariationsFlow
            beats={beats}
            planData={planData}
            nodeEdits={nodeEdits}
            onNodeEdit={onNodeEdit}
            onRequestFix={onRequestFix}
            onAcceptFix={onAcceptFix}
          />
        ) : (
          <RecreateFlow
            beats={beats}
            planData={planData}
            nodeEdits={nodeEdits}
            onNodeEdit={onNodeEdit}
          />
        )}
      </div>
    </div>
  );
}
