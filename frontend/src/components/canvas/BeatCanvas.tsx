"use client";
import { useEffect, useRef, useState } from "react";
import { useCanvas } from "@/hooks/useCanvas";
import { BeatCard } from "./BeatCard";
import { GenerateButton } from "./GenerateButton";
import { FONT, INK, MUTED, BORDER } from "@/lib/ui";
import type { Beat, BeatHealth } from "@/types/beat";

interface Props {
  adId: string;
  onAnalysisComplete?: () => void;
}

const BEAT_LIGHT: Record<BeatHealth, string> = {
  strong: "#66A737",
  weak: "#E28929",
  critical: "#C9391A",
};
const GREEN = "#66A737";
const RED = "#C9391A";
const ORANGE = "#E28929";
const TRACK = "#e4e4e4";

const nodeColor = (b: Beat) => (b.fix_accepted ? GREEN : BEAT_LIGHT[b.health]);

// Measure a container's content width (re-measures on resize).
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

// ─── Decision flow header — a real connected SVG stepper ──────────────────────
type StageState = "done" | "active" | "pending";

function DecisionFlow({ beats }: { beats: Beat[] }) {
  const [ref, w] = useWidth();
  const weak = beats.filter((b) => b.health !== "strong");
  const accepted = weak.filter((b) => b.fix_accepted);
  const diagnoseDone = beats.length > 0;
  const allFixed = weak.length === 0 || accepted.length === weak.length;
  const fixState: StageState = weak.length === 0 || allFixed ? "done" : "active";
  const genState: StageState = allFixed ? "active" : "pending";

  const stages = [
    { label: "Diagnose", sub: `${beats.length} beats`, state: (diagnoseDone ? "done" : "pending") as StageState, accent: GREEN },
    { label: "Fix weak beats", sub: weak.length === 0 ? "none weak" : `${accepted.length}/${weak.length} fixed`, state: fixState, accent: ORANGE },
    { label: "Generate refresh", sub: genState === "active" ? "ready" : "after fixes", state: genState, accent: RED },
  ];

  const H = 76;
  const cy = 26;
  const padX = 54;
  const xs = w > 0 ? [padX, w / 2, w - padX] : [0, 0, 0];
  const segDone = [diagnoseDone, allFixed]; // seg between node0-1, node1-2

  const r = 15;

  return (
    <div
      style={{ background: "#fafafa", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "10px 8px 4px" }}
    >
      <div ref={ref} style={{ width: "100%" }}>
        {w > 0 && (
          <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} fill="none" style={{ display: "block" }}>
            {/* base rail */}
            <line x1={xs[0]} y1={cy} x2={xs[2]} y2={cy} stroke={TRACK} strokeWidth={2.5} strokeLinecap="round" />
            {/* progress segments */}
            {segDone.map((done, i) =>
              done ? (
                <line key={i} x1={xs[i]} y1={cy} x2={xs[i + 1]} y2={cy} stroke={GREEN} strokeWidth={2.5} strokeLinecap="round" />
              ) : null
            )}
            {/* arrowheads at segment midpoints */}
            {[0, 1].map((i) => {
              const mx = (xs[i] + xs[i + 1]) / 2;
              const c = segDone[i] ? GREEN : "#cdcdcd";
              return (
                <path
                  key={`a${i}`}
                  d={`M ${mx - 3} ${cy - 5} L ${mx + 4} ${cy} L ${mx - 3} ${cy + 5}`}
                  stroke={c}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              );
            })}
            {/* nodes + labels */}
            {stages.map((s, i) => {
              const color = s.state === "pending" ? "#c4c4c4" : s.accent;
              const filled = s.state === "done";
              return (
                <g key={i}>
                  <circle cx={xs[i]} cy={cy} r={r} fill={filled ? color : "#fff"} stroke={color} strokeWidth={2.5} />
                  <text
                    x={xs[i]}
                    y={cy + 0.5}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, fill: filled ? "#fff" : color }}
                  >
                    {filled ? "✓" : i + 1}
                  </text>
                  <text x={xs[i]} y={cy + r + 16} textAnchor="middle" style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, fill: s.state === "pending" ? MUTED : INK }}>
                    {s.label}
                  </text>
                  <text x={xs[i]} y={cy + r + 31} textAnchor="middle" style={{ fontFamily: FONT, fontWeight: 400, fontSize: 11, fill: s.state === "pending" ? "#c4c4c4" : color }}>
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

// ─── Beat spine — one measured SVG path threading the real node centers ───────
const GUTTER = 54;
const SPINE_X = 25;
const NODE_TOP = 30; // node center offset from each card's top (≈ card header center)

function BeatSpine({ beats, ys, height }: { beats: Beat[]; ys: number[]; height: number }) {
  if (ys.length === 0 || height === 0) return null;
  const top = ys[0];
  const bottom = ys[ys.length - 1];
  const span = Math.max(1, bottom - top);

  return (
    <svg
      width={GUTTER}
      height={height}
      viewBox={`0 0 ${GUTTER} ${height}`}
      fill="none"
      className="absolute left-0 top-0"
      style={{ overflow: "visible", pointerEvents: "none" }}
      aria-hidden
    >
      <defs>
        <linearGradient id="beatSpineGrad" x1="0" y1={top} x2="0" y2={bottom} gradientUnits="userSpaceOnUse">
          {beats.map((b, i) => (
            <stop key={i} offset={(ys[i] - top) / span} stopColor={nodeColor(b)} />
          ))}
        </linearGradient>
      </defs>

      {/* main spine: one continuous path through every node */}
      <path
        d={`M ${SPINE_X} ${top} L ${SPINE_X} ${bottom}`}
        stroke="url(#beatSpineGrad)"
        strokeWidth={3}
        strokeLinecap="round"
      />

      {/* per-node: curved branch into the card + node marker */}
      {beats.map((b, i) => {
        const y = ys[i];
        const c = nodeColor(b);
        return (
          <g key={b.id}>
            <path
              d={`M ${SPINE_X} ${y} C ${SPINE_X + 16} ${y}, ${GUTTER - 14} ${y}, ${GUTTER} ${y}`}
              stroke={c}
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.55}
            />
            <circle cx={SPINE_X} cy={y} r={11} fill="#fff" stroke={c} strokeWidth={2.5} />
            <circle cx={SPINE_X} cy={y} r={4.5} fill={c} />
          </g>
        );
      })}
    </svg>
  );
}

// ─── Root ────────────────────────────────────────────────────────────────────
export function BeatCanvas({ adId, onAnalysisComplete }: Props) {
  const { beats, loading, teardownRunning, requestFix, acceptFix } = useCanvas(adId, onAnalysisComplete);

  const weakBeats = beats.filter((b) => b.health !== "strong");
  const allAccepted = weakBeats.every((b) => b.fix_accepted);

  // Measure node Y-centers so the spine draws real connections through them.
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [geo, setGeo] = useState<{ ys: number[]; height: number }>({ ys: [], height: 0 });

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const ys = beats.map((_, i) => (rowRefs.current[i]?.offsetTop ?? 0) + NODE_TOP);
      setGeo({ ys, height: list.offsetHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    rowRefs.current.forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
  }, [beats]);

  if (loading || teardownRunning) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center" style={{ gap: 14, background: "#fff" }}>
        <div className="flex" style={{ gap: 8 }}>
          {[GREEN, ORANGE, ORANGE, ORANGE, RED].map((c, i) => (
            <span
              key={i}
              style={{
                width: 9,
                height: 9,
                borderRadius: 5,
                background: c,
                animation: `beatpulse 1.2s ease-in-out ${i * 0.16}s infinite`,
                opacity: 0.3,
              }}
            />
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
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <DecisionFlow beats={beats} />

        <div ref={listRef} className="relative" style={{ marginTop: 24 }}>
          <BeatSpine beats={beats} ys={geo.ys} height={geo.height} />
          <div className="flex flex-col">
            {beats.map((beat, i) => (
              <div
                key={beat.id}
                ref={(el) => {
                  rowRefs.current[i] = el;
                }}
                className="flex"
                style={{ paddingBottom: 14 }}
              >
                <div className="flex-none" style={{ width: GUTTER }} />
                <div className="flex-1 min-w-0">
                  <BeatCard
                    beat={beat}
                    onRequestFix={() => requestFix(beat.id)}
                    onAcceptFix={() => acceptFix(beat.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {allAccepted && weakBeats.length > 0 && <GenerateButton adId={adId} />}
      </div>
    </div>
  );
}
