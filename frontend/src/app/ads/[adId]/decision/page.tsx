"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TopNav } from "@/components/shell/TopNav";
import { adService } from "@/services/adService";
import type { AdDetail } from "@/types/ad";
import type { Beat } from "@/types/beat";

const FONT = "'Poppins', sans-serif";
const PAD = 40;

const STATUS_COLOR: Record<string, string> = {
  thriving: "#66A737",
  aging:    "#E28929",
  fatigued: "#C9391A",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toStatus(h: string) {
  return h === "thriving" ? "thriving" : h === "aging" ? "aging" : "fatigued";
}
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Derived analytics ────────────────────────────────────────────────────────

/** Simulated retention curve — 12 data points from 0–100% of runtime */
function retentionCurve(ad: AdDetail): number[] {
  const score = ad.health_score;
  // Higher score → flatter drop-off. Fatigued → steep early drop.
  const dropRate = score >= 0.75 ? 0.04 : score >= 0.45 ? 0.07 : 0.13;
  const curve: number[] = [];
  let v = 100;
  for (let i = 0; i < 12; i++) {
    curve.push(Math.round(v));
    v = Math.max(v - dropRate * 100 - (i > 5 ? dropRate * 30 : 0), score * 100 * 0.3);
  }
  return curve;
}

type Segment = { label: string; value: number; color: string };

function commentSentiment(ad: AdDetail): Segment[] {
  const score = ad.health_score;
  const pos = Math.round(30 + score * 50);
  const neg = Math.round(10 + (1 - score) * 30);
  const neu = 100 - pos - neg;
  return [
    { label: "Positive", value: pos, color: STATUS_COLOR.thriving },
    { label: "Neutral",  value: neu, color: "#999" },
    { label: "Negative", value: neg, color: STATUS_COLOR.fatigued },
  ];
}

function commentThemes(ad: AdDetail): string[] {
  const status = toStatus(ad.health);
  if (status === "thriving") return ["🔥 Love this product", "😍 Need this now", "📦 Just ordered", "👏 Great ad", "🌟 Saved for later"];
  if (status === "aging")    return ["🤔 Seen this before", "💬 Is this still available?", "😴 Getting repetitive", "🛒 Maybe later", "📊 Any discount?"];
  return ["😒 Stop showing me this", "🔁 Same ad again", "🚫 Not relevant", "💸 Too expensive", "❓ What even is this"];
}

type Action = { icon: string; label: string; description: string; cta: string; href: string; primary?: boolean };

function deriveActions(ad: AdDetail, adId: string): Action[] {
  const status = toStatus(ad.health);
  if (status === "thriving") {
    return [
      { icon: "📈", label: "Increase budget allocation",    description: "This creative is in its performance window — scaling spend now maximises return before saturation.", cta: "Scale budget",     href: "#", primary: true },
      { icon: "🔁", label: "Build a variant",               description: "Capture a fresh angle on the same concept while the audience intent signal is still strong.",           cta: "Open Canvas →", href: `/canvas/${adId}` },
      { icon: "📋", label: "Export winning brief",          description: "Document the hook, format and messaging structure as a reusable creative framework.",                    cta: "Export brief",   href: "#" },
    ];
  }
  if (status === "aging") {
    return [
      { icon: "⚡", label: "Refresh the hook",              description: "The first 3 seconds are the highest-leverage point to recover declining CTR without rebuilding the full creative.", cta: "Refresh in Canvas →", href: `/canvas/${adId}`, primary: true },
      { icon: "💸", label: "Reduce budget gradually",       description: "Shift spend away from this creative to preserve budget while the variant is being produced.",             cta: "Adjust allocation", href: "#" },
      { icon: "📊", label: "A/B test new format",          description: "Test a contrasting format — different aspect ratio, new opener — against this current version.",           cta: "Queue variant",     href: "#" },
    ];
  }
  return [
    { icon: "🛑", label: "Pause or kill this creative",    description: "Continuing to serve this creative is burning budget. Pause immediately and redirect spend.", cta: "Kill creative",       href: "#", primary: true },
    { icon: "🔧", label: "Full creative teardown",         description: "Use the Canvas teardown tool to diagnose each beat and generate a fix brief from the failure signals.", cta: "Open Canvas →",   href: `/canvas/${adId}` },
    { icon: "🆕", label: "Queue a replacement creative",   description: "Start building the successor creative now so there's no coverage gap when this is paused.",    cta: "Queue variant",      href: "#" },
  ];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ColHeader({ label }: { label: string }) {
  return (
    <div style={{ paddingBottom: 12, marginBottom: 16, borderBottom: "1.5px solid #ececec" }}>
      <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: "#000", letterSpacing: "0.03em" }}>{label}</span>
    </div>
  );
}

function SignalPill({ icon, title, detail, sentiment }: { icon: string; title: string; detail: string; sentiment: "pos" | "neu" | "neg" }) {
  const bg = sentiment === "pos" ? "#f0f7ec" : sentiment === "neg" ? "#fdf1ef" : "#fdf8ef";
  const bd = sentiment === "pos" ? "#c8e6b8" : sentiment === "neg" ? "#f3cdc7" : "#f5e4c0";
  return (
    <div className="flex items-start" style={{ background: bg, border: `1.5px solid ${bd}`, borderRadius: 12, padding: "12px 14px", gap: 10 }}>
      <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div className="flex flex-col" style={{ gap: 3 }}>
        <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: "#000" }}>{title}</span>
        <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 12, color: "rgba(0,0,0,0.52)", lineHeight: 1.5 }}>{detail}</span>
      </div>
    </div>
  );
}

/** Inline sparkline SVG for the retention/metric chart */
function RetentionChart({ points, color }: { points: number[]; color: string }) {
  const W = 260, H = 90;
  const maxV = 100;
  const xs = points.map((_, i) => (i / (points.length - 1)) * W);
  const ys = points.map(v => H - (v / maxV) * (H - 10));
  const pathD = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${ys[i]}`).join(" ");
  const areaD = pathD + ` L ${W} ${H} L 0 ${H} Z`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="rgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      {/* grid lines */}
      {[25, 50, 75].map(v => {
        const y = H - (v / maxV) * (H - 10);
        return <line key={v} x1={0} y1={y} x2={W} y2={y} stroke="#ececec" strokeWidth={1} />;
      })}
      {/* area fill */}
      <path d={areaD} fill="url(#rgrad)" />
      {/* line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* dot at last point */}
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={4} fill={color} />
      {/* labels */}
      <text x={2} y={H - 2} style={{ fontFamily: FONT, fontSize: 10, fill: "rgba(0,0,0,0.3)" }}>0%</text>
      <text x={2} y={10}    style={{ fontFamily: FONT, fontSize: 10, fill: "rgba(0,0,0,0.3)" }}>100%</text>
      <text x={W / 2 - 14} y={H - 2} style={{ fontFamily: FONT, fontSize: 10, fill: "rgba(0,0,0,0.3)" }}>Runtime</text>
    </svg>
  );
}

function SentimentBar({ segments }: { segments: Segment[] }) {
  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      <div className="flex overflow-hidden" style={{ height: 10, borderRadius: 6 }}>
        {segments.map(s => (
          <div key={s.label} style={{ width: `${s.value}%`, background: s.color }} />
        ))}
      </div>
      <div className="flex" style={{ gap: 14 }}>
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.color, flexShrink: 0 }} />
            <span style={{ fontFamily: FONT, fontSize: 12, color: "rgba(0,0,0,0.5)" }}>{s.label} {s.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionCard({ action }: { action: Action }) {
  const isPrimary = action.primary;
  return (
    <div className="flex flex-col" style={{ border: isPrimary ? "2px solid #000" : "1.5px solid #e8e8e8", borderRadius: 16, padding: "16px 18px", background: isPrimary ? "#000" : "#fff", gap: 8 }}>
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 18 }}>{action.icon}</span>
        <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14, color: isPrimary ? "#fff" : "#000" }}>{action.label}</span>
      </div>
      <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 13, color: isPrimary ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.52)", lineHeight: 1.55 }}>{action.description}</span>
      <a
        href={action.href}
        style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: isPrimary ? "#000" : "#fff", background: isPrimary ? "#fff" : "#000", borderRadius: 10, padding: "8px 16px", textDecoration: "none", alignSelf: "flex-start", marginTop: 4 }}
      >
        {action.cta}
      </a>
    </div>
  );
}

function BriefRow({ beat }: { beat: Beat }) {
  const BEAT_LABEL: Record<string, string> = { hook: "Hook", build: "Build", product: "Product", payoff: "Payoff", cta: "CTA" };
  const BEAT_COLOR: Record<string, string> = { strong: STATUS_COLOR.thriving, weak: STATUS_COLOR.aging, critical: STATUS_COLOR.fatigued };
  const color = BEAT_COLOR[beat.health] ?? "#000";
  return (
    <div className="flex items-start" style={{ gap: 14, padding: "14px 0", borderBottom: "1px solid #f0f0f0" }}>
      <div className="flex items-center justify-center flex-none" style={{ width: 28, height: 28, borderRadius: 8, background: `${color}15`, flexShrink: 0 }}>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color }}>{beat.order + 1}</span>
      </div>
      <div className="flex flex-col flex-1 min-w-0" style={{ gap: 4 }}>
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: "#000" }}>{BEAT_LABEL[beat.beat_type] ?? beat.beat_type}</span>
          <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 11, color, background: `${color}12`, borderRadius: 20, padding: "2px 8px" }}>{beat.health}</span>
        </div>
        {beat.diagnosis && <span style={{ fontFamily: FONT, fontSize: 12, color: "rgba(0,0,0,0.5)", lineHeight: 1.55 }}>{beat.diagnosis}</span>}
        {beat.proposed_fix && (
          <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 12, color: color, lineHeight: 1.5 }}>Fix: {beat.proposed_fix.description}</span>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DecisionPage({ params }: { params: { adId: string } }) {
  const [ad, setAd] = useState<AdDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adService.getAd(params.adId)
      .then(setAd)
      .catch(() => setError("Could not load creative data."))
      .finally(() => setLoading(false));
  }, [params.adId]);

  const status = ad ? toStatus(ad.health) : "fatigued";
  const color = STATUS_COLOR[status];
  const score = ad ? Math.round(ad.health_score * 100) : 0;
  const beats = [...(ad?.beats ?? [])].sort((a, b) => a.order - b.order);
  const actions = ad ? deriveActions(ad, params.adId) : [];
  const retention = ad ? retentionCurve(ad) : [];
  const sentiment = ad ? commentSentiment(ad) : [];
  const themes = ad ? commentThemes(ad) : [];

  const avgRetention = retention.length ? Math.round(retention.reduce((a, b) => a + b, 0) / retention.length) : 0;
  const dropOff = retention.length ? 100 - retention[retention.length - 1] : 0;

  return (
    <div className="w-full min-h-screen flex flex-col" style={{ fontFamily: FONT, background: "#f7f7f7" }}>
      <div style={{ background: "#fff" }}><TopNav /></div>

      {/* Breadcrumb */}
      <div style={{ paddingLeft: PAD, paddingRight: PAD, marginTop: 18 }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          <Link href="/" style={{ fontFamily: FONT, fontSize: 13, color: "rgba(0,0,0,0.35)", textDecoration: "none" }}>Gallery</Link>
          <span style={{ color: "rgba(0,0,0,0.25)" }}>›</span>
          <Link href={`/ads/${params.adId}`} style={{ fontFamily: FONT, fontSize: 13, color: "rgba(0,0,0,0.35)", textDecoration: "none" }}>Creative analysis</Link>
          <span style={{ color: "rgba(0,0,0,0.25)" }}>›</span>
          <span style={{ fontFamily: FONT, fontSize: 13, color: "#000" }}>Decision path</span>
        </div>
      </div>

      {loading && <div className="flex-1 flex items-center justify-center"><span style={{ fontFamily: FONT, fontSize: 14, color: "rgba(0,0,0,0.4)" }}>Loading…</span></div>}
      {error && <div className="flex-1 flex items-center justify-center"><span style={{ fontFamily: FONT, fontSize: 14, color: STATUS_COLOR.fatigued }}>{error}</span></div>}

      {ad && (
        <div style={{ paddingLeft: PAD, paddingRight: PAD, paddingBottom: 80, marginTop: 24 }}>

          {/* ── Page header ── */}
          <div className="flex items-center justify-between" style={{ marginBottom: 28 }}>
            <div className="flex items-center" style={{ gap: 14 }}>
              {/* branching paths icon */}
              <div className="flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 12, background: "#f0f0f0" }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="4" cy="10" r="2.5" fill="#000" />
                  <circle cx="16" cy="4" r="2.5" fill="#000" />
                  <circle cx="16" cy="16" r="2.5" fill="#000" />
                  <line x1="6.5" y1="10" x2="10" y2="10" stroke="#000" strokeWidth="1.5" />
                  <line x1="10" y1="10" x2="13.5" y2="4"  stroke="#000" strokeWidth="1.5" />
                  <line x1="10" y1="10" x2="13.5" y2="16" stroke="#000" strokeWidth="1.5" />
                </svg>
              </div>
              <div>
                <h1 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 22, color: "#000", margin: 0 }}>
                  Decision path · {ad.title?.trim() || ad.id.slice(0, 8)}
                </h1>
                <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 13, color: "rgba(0,0,0,0.4)" }}>
                  #{ad.id.slice(0, 8)} · {ad.platform} · score {score}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-none" style={{ border: "1.5px solid #e0e0e0", borderRadius: 20, padding: "8px 16px" }}>
              <span style={{ fontSize: 12 }}>❓</span>
              <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 13, color: "#000" }}>Why this decision?</span>
            </div>
          </div>

          {/* ── 4-column Decision Path ── */}
          <div style={{ background: "#fff", border: "1.5px solid #ececec", borderRadius: 22, padding: 28, marginBottom: 28 }}>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1.6fr 1.3fr 1fr", gap: 24 }}>

              {/* Col 1: Signal */}
              <div className="flex flex-col" style={{ gap: 10 }}>
                <ColHeader label="Signal" />
                {score < 50 && <SignalPill icon="📉" title={`Score ${score}`}    detail="Below viable threshold" sentiment="neg" />}
                {score >= 50 && score < 75 && <SignalPill icon="⚠️" title={`Score ${score}`} detail="Past performance peak" sentiment="neu" />}
                {score >= 75 && <SignalPill icon="📈" title={`Score ${score}`}   detail="Top-tier performance" sentiment="pos" />}
                <SignalPill icon="⏳" title={`${ad.run_days}d running`} detail={ad.run_days > 21 ? "In frequency risk zone" : "Within optimal window"} sentiment={ad.run_days > 21 ? "neg" : "pos"} />
                <SignalPill icon="🎯" title={`${ad.reach_bucket ?? "—"} reach`} detail={`${ad.variant_count} active variant${ad.variant_count !== 1 ? "s" : ""}`} sentiment={ad.reach_bucket === "high" ? "pos" : ad.reach_bucket === "mid" ? "neu" : "neg"} />
              </div>

              {/* Col 2: Evidence */}
              <div className="flex flex-col" style={{ gap: 16 }}>
                <ColHeader label="Evidence" />
                {/* Retention curve */}
                <div style={{ border: "1.5px solid #ececec", borderRadius: 14, padding: "14px 16px" }}>
                  <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 12, color: "rgba(0,0,0,0.5)", display: "block", marginBottom: 10 }}>Audience retention over runtime</span>
                  <RetentionChart points={retention} color={color} />
                  <div className="flex" style={{ gap: 16, marginTop: 10 }}>
                    <div className="flex flex-col">
                      <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 18, color }}>{avgRetention}%</span>
                      <span style={{ fontFamily: FONT, fontSize: 11, color: "rgba(0,0,0,0.38)" }}>Avg. retention</span>
                    </div>
                    <div className="flex flex-col">
                      <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 18, color: STATUS_COLOR.fatigued }}>{dropOff}%</span>
                      <span style={{ fontFamily: FONT, fontSize: 11, color: "rgba(0,0,0,0.38)" }}>Drop-off</span>
                    </div>
                    <div className="flex flex-col">
                      <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 18, color: "#000" }}>{retention[0] ?? 100}%</span>
                      <span style={{ fontFamily: FONT, fontSize: 11, color: "rgba(0,0,0,0.38)" }}>Hook hold</span>
                    </div>
                  </div>
                </div>
                {/* Beat comparison */}
                <div style={{ border: "1.5px solid #ececec", borderRadius: 14, padding: "14px 16px" }}>
                  <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 12, color: "rgba(0,0,0,0.5)", display: "block", marginBottom: 8 }}>Beat health</span>
                  {beats.length === 0 ? (
                    <span style={{ fontFamily: FONT, fontSize: 12, color: "rgba(0,0,0,0.35)" }}>No beat data — run analysis first</span>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {beats.map(b => {
                        const bc = b.health === "strong" ? STATUS_COLOR.thriving : b.health === "weak" ? STATUS_COLOR.aging : STATUS_COLOR.fatigued;
                        return (
                          <div key={b.id} className="flex items-center gap-2" style={{ background: `${bc}10`, borderRadius: 8, padding: "6px 10px" }}>
                            <span style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: bc, flexShrink: 0 }} />
                            <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 12, color: "#000" }}>{b.beat_type}</span>
                            <span style={{ fontFamily: FONT, fontSize: 11, color: bc, marginLeft: "auto" }}>{b.health}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {/* Model insight */}
                <div style={{ background: "#f7f7f7", borderRadius: 14, padding: "14px 16px" }}>
                  <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>🧠</span>
                    <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: "#000" }}>Model insight</span>
                  </div>
                  <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 13, color: "#000", display: "block", marginBottom: 4 }}>
                    {status === "thriving" ? "Algorithm momentum is positive" : status === "aging" ? "Frequency fatigue building" : "Audience fatigue confirmed"}
                  </span>
                  <span style={{ fontFamily: FONT, fontSize: 12, color: "rgba(0,0,0,0.52)", lineHeight: 1.55 }}>
                    {status === "thriving" ? `Score ${score} with ${ad.reach_bucket ?? "consistent"} reach signals active distribution to cold audiences. This is the optimal amplification window.` : status === "aging" ? `After ${ad.run_days} days, repetition probability is rising. Mid-funnel efficiency has declined by an estimated 18–25%.` : `Repetition probability: ${Math.round(60 + (1 - ad.health_score) * 30)}%. Budget is being wasted on over-exposed audiences.`}
                  </span>
                </div>
              </div>

              {/* Col 3: Action */}
              <div className="flex flex-col" style={{ gap: 10 }}>
                <ColHeader label="Action" />
                {actions.map((a, i) => <ActionCard key={i} action={a} />)}
              </div>

              {/* Col 4: Next creative preview */}
              <div className="flex flex-col" style={{ gap: 12 }}>
                <ColHeader label="Next creative" />
                <div style={{ border: "1.5px solid #e8e8e8", borderRadius: 16, overflow: "hidden", background: "#fff" }}>
                  <div className="flex items-center justify-between" style={{ padding: "10px 14px", borderBottom: "1px solid #f0f0f0" }}>
                    <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: "#000" }}>Variant proposal</span>
                    <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 11, color: STATUS_COLOR.aging, background: `${STATUS_COLOR.aging}15`, borderRadius: 20, padding: "3px 8px" }}>Queued</span>
                  </div>
                  {/* Placeholder next creative */}
                  <div className="flex items-center justify-center" style={{ height: 140, background: "linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%)" }}>
                    <div className="flex flex-col items-center" style={{ gap: 6 }}>
                      <span style={{ fontSize: 28 }}>{status === "thriving" ? "🚀" : status === "aging" ? "🔧" : "🆕"}</span>
                      <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: "rgba(0,0,0,0.5)" }}>{status === "thriving" ? "Scale variant" : status === "aging" ? "Hook refresh" : "Full rebuild"}</span>
                    </div>
                  </div>
                  <div style={{ padding: "12px 14px" }}>
                    <div className="flex flex-col" style={{ gap: 6 }}>
                      <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: "#000" }}>
                        {status === "thriving" ? "Amplification variant" : status === "aging" ? "Hook refresh build" : "Creative rebuild"}
                      </span>
                      <span style={{ fontFamily: FONT, fontSize: 12, color: "rgba(0,0,0,0.45)", lineHeight: 1.5 }}>
                        {status === "thriving" ? "Same message, new format variant to extend the performance window." : status === "aging" ? "New first-3s hook on proven mid and payoff sections." : "New concept addressing the root fatigue signals from beat analysis."}
                      </span>
                      <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
                        <div className="flex flex-col">
                          <span style={{ fontFamily: FONT, fontSize: 10, color: "rgba(0,0,0,0.35)" }}>Objective</span>
                          <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: "#000" }}>Conversions</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span style={{ fontFamily: FONT, fontSize: 10, color: "rgba(0,0,0,0.35)" }}>Est. impact</span>
                          <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: STATUS_COLOR.thriving }}>
                            {status === "thriving" ? "+35% reach" : status === "aging" ? "+22% CTR" : "Budget rescue"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <Link
                  href={`/canvas/${params.adId}`}
                  style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: "#fff", background: "#000", borderRadius: 12, padding: "11px 0", textDecoration: "none", textAlign: "center", display: "block" }}
                >
                  Build in Canvas →
                </Link>
              </div>

            </div>

            {/* Summary bar */}
            <div className="flex items-center" style={{ marginTop: 24, paddingTop: 20, borderTop: "1.5px solid #f0f0f0", gap: 20 }}>
              <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                <span style={{ fontSize: 16 }}>📋</span>
                <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: "#000" }}>Summary</span>
              </div>
              <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 13, color: "rgba(0,0,0,0.55)", flex: 1, lineHeight: 1.5 }}>
                {status === "thriving" ? `Score ${score} with ${ad.reach_bucket ?? "consistent"} reach — creative is in its performance window. Scale budget and prepare an amplification variant.` : status === "aging" ? `Score ${score} after ${ad.run_days} days — audience frequency is building. Refresh the hook and test a new format variant before efficiency collapses.` : `Score ${score} after ${ad.run_days} days — budget waste confirmed. Pause immediately, open Canvas for teardown, and queue a replacement creative.`}
              </span>
              <div className="flex items-center gap-4 flex-none">
                <div className="flex items-center gap-1.5">
                  <span style={{ fontSize: 13, color: "rgba(0,0,0,0.35)" }}>🕐</span>
                  <span style={{ fontFamily: FONT, fontSize: 12, color: "rgba(0,0,0,0.4)" }}>Decided just now</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span style={{ fontSize: 13, color: "rgba(0,0,0,0.35)" }}>🗄</span>
                  <span style={{ fontFamily: FONT, fontSize: 12, color: "rgba(0,0,0,0.4)" }}>Account memory updated</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Video analytics section ── */}
          <div style={{ background: "#fff", border: "1.5px solid #ececec", borderRadius: 22, padding: 28, marginBottom: 28 }}>
            <h2 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 18, color: "#000", margin: "0 0 20px" }}>Video analytics</h2>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              {/* Retention chart */}
              <div>
                <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 13, color: "#000", display: "block", marginBottom: 12 }}>Retention curve</span>
                <RetentionChart points={retention} color={color} />
                <div className="flex" style={{ gap: 20, marginTop: 14 }}>
                  <div className="flex flex-col" style={{ border: "1.5px solid #ececec", borderRadius: 12, padding: "12px 16px", flex: 1 }}>
                    <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 20, color }}>{avgRetention}%</span>
                    <span style={{ fontFamily: FONT, fontSize: 11, color: "rgba(0,0,0,0.4)", marginTop: 3 }}>Avg. watch rate</span>
                  </div>
                  <div className="flex flex-col" style={{ border: "1.5px solid #ececec", borderRadius: 12, padding: "12px 16px", flex: 1 }}>
                    <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 20, color: STATUS_COLOR.fatigued }}>{dropOff}%</span>
                    <span style={{ fontFamily: FONT, fontSize: 11, color: "rgba(0,0,0,0.4)", marginTop: 3 }}>Total drop-off</span>
                  </div>
                  <div className="flex flex-col" style={{ border: "1.5px solid #ececec", borderRadius: 12, padding: "12px 16px", flex: 1 }}>
                    <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 20, color: "#000" }}>{Math.round(avgRetention * 0.4)}%</span>
                    <span style={{ fontFamily: FONT, fontSize: 11, color: "rgba(0,0,0,0.4)", marginTop: 3 }}>Completion rate</span>
                  </div>
                </div>
              </div>

              {/* Beat drop-off heatmap */}
              <div>
                <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 13, color: "#000", display: "block", marginBottom: 12 }}>Beat-level engagement</span>
                {beats.length === 0 ? (
                  <div style={{ border: "1.5px solid #ececec", borderRadius: 14, padding: "28px", textAlign: "center" }}>
                    <span style={{ fontFamily: FONT, fontSize: 13, color: "rgba(0,0,0,0.35)" }}>Run analysis to see beat-level data</span>
                  </div>
                ) : (
                  <div className="flex flex-col" style={{ gap: 8 }}>
                    {beats.map((b, i) => {
                      const bc = b.health === "strong" ? STATUS_COLOR.thriving : b.health === "weak" ? STATUS_COLOR.aging : STATUS_COLOR.fatigued;
                      const barPct = b.health === "strong" ? 82 + i * 3 : b.health === "weak" ? 55 - i * 4 : 30 - i * 2;
                      const BEAT_LABEL: Record<string, string> = { hook: "Hook", build: "Build", product: "Product", payoff: "Payoff", cta: "CTA" };
                      return (
                        <div key={b.id} className="flex items-center" style={{ gap: 10 }}>
                          <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 12, color: "#000", width: 56, flexShrink: 0 }}>{BEAT_LABEL[b.beat_type] ?? b.beat_type}</span>
                          <div className="flex-1" style={{ background: "#f5f5f5", borderRadius: 6, height: 10, overflow: "hidden" }}>
                            <div style={{ width: `${Math.max(5, Math.min(100, barPct))}%`, height: "100%", background: bc, borderRadius: 6 }} />
                          </div>
                          <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: bc, width: 36, textAlign: "right", flexShrink: 0 }}>{Math.max(5, Math.min(100, barPct))}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Comment semantics section ── */}
          <div style={{ background: "#fff", border: "1.5px solid #ececec", borderRadius: 22, padding: 28, marginBottom: 28 }}>
            <h2 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 18, color: "#000", margin: "0 0 20px" }}>Comment semantics</h2>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 32 }}>
              <div className="flex flex-col" style={{ gap: 16 }}>
                <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 13, color: "#000" }}>Sentiment breakdown</span>
                <SentimentBar segments={sentiment} />
                <div className="flex flex-col" style={{ gap: 6, marginTop: 4 }}>
                  {sentiment.map(s => (
                    <div key={s.label} className="flex items-center justify-between" style={{ padding: "10px 14px", background: "#f7f7f7", borderRadius: 10 }}>
                      <div className="flex items-center gap-2">
                        <span style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color, flexShrink: 0 }} />
                        <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 13, color: "#000" }}>{s.label}</span>
                      </div>
                      <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 16, color: s.color }}>{s.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col" style={{ gap: 16 }}>
                <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 13, color: "#000" }}>Top comment themes</span>
                <div className="flex flex-wrap" style={{ gap: 8 }}>
                  {themes.map((t, i) => (
                    <span key={i} style={{ fontFamily: FONT, fontWeight: 400, fontSize: 13, color: "#000", background: "#f0f0f0", borderRadius: 20, padding: "7px 14px" }}>{t}</span>
                  ))}
                </div>
                <div style={{ marginTop: 8, background: "#f7f7f7", borderRadius: 14, padding: "14px 16px" }}>
                  <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: "rgba(0,0,0,0.4)", letterSpacing: "0.07em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Semantic summary</span>
                  <span style={{ fontFamily: FONT, fontSize: 13, color: "rgba(0,0,0,0.6)", lineHeight: 1.65 }}>
                    {status === "thriving" ? "Comment intent is strongly purchase-oriented. Audience is engaging with the product proposition and sharing with intent. High social proof signal." : status === "aging" ? "Frequency is appearing in comments — 'seen this before' sentiment is rising. Product interest remains but novelty fatigue is evident." : "Negative sentiment is dominated by repetition complaints and relevance misalignment. The audience has disengaged — continued serving is actively damaging brand perception."}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Modular brief ── */}
          <div style={{ background: "#fff", border: "1.5px solid #ececec", borderRadius: 22, padding: 28 }}>
            <h2 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 18, color: "#000", margin: "0 0 6px" }}>Modular brief</h2>
            <p style={{ fontFamily: FONT, fontWeight: 400, fontSize: 13, color: "rgba(0,0,0,0.45)", margin: "0 0 20px", lineHeight: 1.5 }}>
              Beat-by-beat breakdown with diagnosis and fix briefs — the raw material for your next creative.
            </p>
            {beats.length === 0 ? (
              <div style={{ border: "1.5px solid #ececec", borderRadius: 14, padding: "28px 24px", textAlign: "center" }}>
                <span style={{ fontFamily: FONT, fontSize: 14, color: "rgba(0,0,0,0.35)" }}>No beat analysis — run analysis to generate the modular brief.</span>
              </div>
            ) : (
              <div>
                {beats.map(b => <BriefRow key={b.id} beat={b} />)}
                <div style={{ paddingTop: 20, marginTop: 4 }}>
                  <Link
                    href={`/canvas/${params.adId}`}
                    style={{ fontFamily: FONT, fontWeight: 700, fontSize: 14, color: "#fff", background: "#000", borderRadius: 14, padding: "14px 28px", textDecoration: "none", display: "inline-block" }}
                  >
                    Act on this brief in Canvas →
                  </Link>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
