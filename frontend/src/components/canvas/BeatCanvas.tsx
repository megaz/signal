"use client";
import { useEffect, useRef, useState } from "react";
import { useCanvas } from "@/hooks/useCanvas";
import { PlanStage } from "./PlanStage";
import { FlowCanvas } from "./FlowCanvas";
import { GenerateButton } from "./GenerateButton";
import { FONT, INK, MUTED, BORDER } from "@/lib/ui";
import type { Beat, BeatHealth } from "@/types/beat";

interface Props {
  adId: string;
  adTitle?: string;
  adVideoUrl?: string | null;
  onAnalysisComplete?: () => void;
}

const GREEN = "#66A737";
const ORANGE = "#E28929";
const RED = "#C9391A";
const PURPLE = "#8a8bc7";
const TRACK = "#e4e4e4";

// ─── 4-stage decision flow header ────────────────────────────────────────────
type StageState = "done" | "active" | "pending";

function DecisionFlow({ beats, planDone, allFixed }: {
  beats: Beat[];
  planDone: boolean;
  allFixed: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const diagnoseDone = beats.length > 0;
  const weakBeats = beats.filter((b) => b.health !== "strong");
  const accepted = weakBeats.filter((b) => b.fix_accepted);

  const stages = [
    {
      label: "Analyze",
      sub: diagnoseDone ? `${beats.length} beats` : "…",
      state: (diagnoseDone ? "done" : "active") as StageState,
      accent: GREEN,
    },
    {
      label: "Plan",
      sub: planDone ? "strategy set" : diagnoseDone ? "planning…" : "after analyze",
      state: (planDone ? "done" : diagnoseDone ? "active" : "pending") as StageState,
      accent: PURPLE,
    },
    {
      label: "Fix",
      sub: weakBeats.length === 0 ? "none weak" : `${accepted.length}/${weakBeats.length} fixed`,
      state: (allFixed || weakBeats.length === 0 ? "done" : planDone ? "active" : "pending") as StageState,
      accent: ORANGE,
    },
    {
      label: "Generate",
      sub: allFixed ? "ready" : "after fixes",
      state: (allFixed ? "active" : "pending") as StageState,
      accent: RED,
    },
  ];

  const H = 76;
  const cy = 26;
  const r = 13;
  const n = stages.length;

  // X positions for n nodes evenly across width
  const xs = w > 0
    ? stages.map((_, i) => Math.round(50 + (i * (w - 100)) / (n - 1)))
    : stages.map(() => 0);

  return (
    <div style={{ background: "#fafafa", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "10px 8px 4px" }}>
      <div ref={containerRef} style={{ width: "100%" }}>
        {w > 0 && (
          <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} fill="none" style={{ display: "block" }}>
            {/* base rail */}
            <line x1={xs[0]} y1={cy} x2={xs[n - 1]} y2={cy} stroke={TRACK} strokeWidth={2.5} strokeLinecap="round" />
            {/* progress segments */}
            {stages.slice(0, -1).map((s, i) =>
              s.state === "done" ? (
                <line key={i} x1={xs[i]} y1={cy} x2={xs[i + 1]} y2={cy} stroke={GREEN} strokeWidth={2.5} strokeLinecap="round" />
              ) : null
            )}
            {/* arrowheads */}
            {stages.slice(0, -1).map((s, i) => {
              const mx = (xs[i] + xs[i + 1]) / 2;
              const c = s.state === "done" ? GREEN : "#cdcdcd";
              return (
                <path key={`a${i}`} d={`M ${mx - 3} ${cy - 5} L ${mx + 4} ${cy} L ${mx - 3} ${cy + 5}`}
                  stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              );
            })}
            {/* nodes + labels */}
            {stages.map((s, i) => {
              const color = s.state === "pending" ? "#c4c4c4" : s.accent;
              const filled = s.state === "done";
              return (
                <g key={i}>
                  <circle cx={xs[i]} cy={cy} r={r} fill={filled ? color : "#fff"} stroke={color} strokeWidth={2.5} />
                  <text x={xs[i]} y={cy + 0.5} textAnchor="middle" dominantBaseline="central"
                    style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12, fill: filled ? "#fff" : color }}>
                    {filled ? "✓" : i + 1}
                  </text>
                  <text x={xs[i]} y={cy + r + 16} textAnchor="middle"
                    style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, fill: s.state === "pending" ? MUTED : INK }}>
                    {s.label}
                  </text>
                  <text x={xs[i]} y={cy + r + 29} textAnchor="middle"
                    style={{ fontFamily: FONT, fontWeight: 400, fontSize: 10, fill: s.state === "pending" ? "#c4c4c4" : color }}>
                    {s.sub}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export function BeatCanvas({ adId, adTitle, adVideoUrl, onAnalysisComplete }: Props) {
  const {
    beats, loading, teardownRunning,
    canvasStage, planData, planLoading,
    nodeEdits, brandKit,
    setNodeEdit, setBrandKit,
    requestFix, acceptFix,
  } = useCanvas(adId, onAnalysisComplete);

  const weakBeats = beats.filter((b) => b.health !== "strong");
  const allFixed = weakBeats.length === 0 || weakBeats.every((b) => b.fix_accepted);
  const planDone = !!planData;

  if (loading || teardownRunning) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center" style={{ gap: 14, background: "#fff" }}>
        <div className="flex" style={{ gap: 8 }}>
          {[GREEN, ORANGE, ORANGE, ORANGE, RED].map((c, i) => (
            <span key={i} style={{
              width: 9, height: 9, borderRadius: 5, background: c,
              animation: `beatpulse 1.2s ease-in-out ${i * 0.16}s infinite`, opacity: 0.3,
            }} />
          ))}
        </div>
        <p style={{ fontFamily: FONT, fontSize: 14, color: MUTED }}>
          {teardownRunning ? "Analyzing the creative beats…" : "Loading…"}
        </p>
        <style>{`@keyframes beatpulse { 0%,100%{opacity:0.25;transform:translateY(0)} 50%{opacity:1;transform:translateY(-3px)} }`}</style>
      </div>
    );
  }

  if (beats.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: "#fff" }}>
        <p style={{ fontFamily: FONT, fontSize: 14, color: MUTED }}>No beat data available.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "#fff", padding: "28px 32px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <DecisionFlow beats={beats} planDone={planDone} allFixed={allFixed} />

        <div style={{ marginTop: 20 }}>
          {/* Stage 1: Plan — always shown once beats are available */}
          {(planData || planLoading) && (
            <PlanStage
              planData={planData!}
              beats={beats}
              planLoading={planLoading && !planData}
            />
          )}

          {/* Stage 2: Flow canvas — shown once plan is ready */}
          {planData && (
            <FlowCanvas
              beats={beats}
              planData={planData}
              nodeEdits={nodeEdits}
              onNodeEdit={setNodeEdit}
              onRequestFix={requestFix}
              onAcceptFix={acceptFix}
              brandKit={brandKit}
              onBrandKitChange={setBrandKit}
            />
          )}

          {/* Stage 3: Generate — shown when all weak beats fixed */}
          {allFixed && weakBeats.length > 0 && planData && (
            <GenerateButton adId={adId} adTitle={adTitle} adVideoUrl={adVideoUrl} />
          )}
        </div>
      </div>
    </div>
  );
}
