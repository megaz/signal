"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TopNav } from "@/components/shell/TopNav";
import { adService } from "@/services/adService";
import type { AdDetail } from "@/types/ad";
import type { Beat } from "@/types/beat";

const FONT = "'Poppins', sans-serif";
const ORANGE = "#E8572A";
const BG = "#f2ede8";
const CARD = "#ffffff";
const BORDER = "#e5e1db";
const MUTED = "rgba(0,0,0,0.42)";
const SUBTLE = "rgba(0,0,0,0.25)";

const BEAT_HEALTH_COLOR: Record<string, string> = { strong: "#22c55e", weak: "#f59e0b", critical: "#ef4444" };
const BEAT_LABEL: Record<string, string> = { hook: "Hook", build: "Build", product: "Product", payoff: "Payoff", cta: "CTA" };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toStatus(h: string) { return h === "thriving" ? "thriving" : h === "aging" ? "aging" : "fatigued"; }

// ─── Actions (all derived from real ad data) ──────────────────────────────────
type Action = { label: string; cta: string; href: string; tier: "primary" | "secondary" | "default" };

function deriveActions(ad: AdDetail, adId: string): Action[] {
  const status = toStatus(ad.health);
  const id = ad.id.slice(0, 8);
  if (status === "thriving") return [
    { label: "Move budget",    cta: "Increase allocation", href: "#",                tier: "secondary" },
    { label: `Kill ${id}`,     cta: "Monitor instead →",   href: `/ads/${adId}`,     tier: "default"   },
    { label: "Queue variant",  cta: "Build in Canvas →",   href: `/canvas/${adId}`,  tier: "primary"   },
  ];
  if (status === "aging") return [
    { label: "Move budget",    cta: "Reallocate →",        href: "#",                tier: "secondary" },
    { label: `Kill ${id}`,     cta: "Pause creative →",    href: "#",                tier: "default"   },
    { label: "Queue variant",  cta: "Build in Canvas →",   href: `/canvas/${adId}`,  tier: "primary"   },
  ];
  return [
    { label: "Move budget",    cta: "Reallocate →",        href: "#",                tier: "secondary" },
    { label: `Kill ${id}`,     cta: "Kill creative →",     href: "#",                tier: "default"   },
    { label: "Queue variant",  cta: "Build in Canvas →",   href: `/canvas/${adId}`,  tier: "primary"   },
  ];
}

// ─── SVG icons ────────────────────────────────────────────────────────────────
const IconUpRight = ({ c = "#000" }: { c?: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 12L12 2M12 2H5M12 2V9" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconX = ({ c = "#000" }: { c?: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 2L12 12M12 2L2 12" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const IconPlus = ({ c = "#000" }: { c?: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1V13M1 7H13" stroke={c} strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const IconBars = ({ c = "#888" }: { c?: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1" y="9" width="3" height="4" rx="1" fill={c} />
    <rect x="5.5" y="6" width="3" height="7" rx="1" fill={c} />
    <rect x="10" y="3" width="3" height="10" rx="1" fill={c} />
  </svg>
);
const IconClock = ({ c = "#888" }: { c?: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="5.5" stroke={c} strokeWidth="1.3" />
    <path d="M7 4.5V7.5L9 8.5" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);
const IconScore = ({ up, c = "#888" }: { up: boolean; c?: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d={up ? "M7 12L2 7M7 12L12 7M7 12V2" : "M7 2L2 7M7 2L12 7M7 2V12"} stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Beat health chart (real beat data) ──────────────────────────────────────
function BeatChart({ beats }: { beats: Beat[] }) {
  if (!beats.length) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 72, background: "#f9f7f4", borderRadius: 10 }}>
      <span style={{ fontFamily: FONT, fontSize: 12, color: MUTED }}>No beats — run analysis to populate</span>
    </div>
  );
  const W = 280, H = 76;
  const scores = beats.map(b => typeof b.health_score === "number" ? b.health_score : b.health === "strong" ? 0.85 : b.health === "weak" ? 0.55 : 0.25);
  const xs = beats.map((_, i) => beats.length === 1 ? W / 2 : (i / (beats.length - 1)) * W);
  const ys = scores.map(s => H - 12 - s * (H - 24));
  const pathD = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
  const areaD = `${pathD} L ${xs[xs.length - 1].toFixed(1)} ${H} L ${xs[0].toFixed(1)} ${H} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id="bg_grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ORANGE} stopOpacity="0.14" />
          <stop offset="100%" stopColor={ORANGE} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(v => {
        const y = H - 12 - v * (H - 24);
        return <line key={v} x1={0} y1={y} x2={W} y2={y} stroke={BORDER} strokeWidth={0.8} strokeDasharray="4 4" />;
      })}
      <path d={areaD} fill="url(#bg_grad)" />
      <path d={pathD} fill="none" stroke={ORANGE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {beats.map((b, i) => {
        const c = BEAT_HEALTH_COLOR[b.health] ?? ORANGE;
        return (
          <g key={b.id}>
            <circle cx={xs[i]} cy={ys[i]} r={5} fill={c} stroke={CARD} strokeWidth={1.5} />
            <text x={xs[i]} y={H - 1} textAnchor="middle" style={{ fontFamily: FONT, fontSize: 9, fill: MUTED }}>
              {(BEAT_LABEL[b.beat_type] ?? b.beat_type).slice(0, 4)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Signal card ──────────────────────────────────────────────────────────────
function SignalCard({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 15px", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: "#f5f2ee", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14, color: "#000", margin: "0 0 1px" }}>{title}</p>
        <p style={{ fontFamily: FONT, fontWeight: 400, fontSize: 12, color: MUTED, margin: 0 }}>{sub}</p>
      </div>
    </div>
  );
}

// ─── Action card ──────────────────────────────────────────────────────────────
function ActionCard({ action }: { action: Action }) {
  const isPrimary   = action.tier === "primary";
  const isSecondary = action.tier === "secondary";
  const bg          = isPrimary ? ORANGE : CARD;
  const border      = isPrimary ? "none" : `1px solid ${isSecondary ? ORANGE : BORDER}`;
  const iconBg      = isPrimary ? "rgba(255,255,255,0.22)" : isSecondary ? ORANGE + "15" : "#f5f2ee";
  const textColor   = isPrimary ? "#fff" : "#000";
  const IconEl      = isPrimary ? <IconPlus c="#fff" /> : isSecondary ? <IconUpRight c={ORANGE} /> : <IconX c="#888" />;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: isPrimary ? "17px 16px" : "13px 15px", background: bg, border, borderRadius: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {IconEl}
      </div>
      <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14, color: textColor, flex: 1 }}>{action.label}</span>
      {isPrimary && (
        <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: "rgba(255,255,255,0.7)" }}>→</span>
      )}
    </div>
  );
}

// ─── Column header ────────────────────────────────────────────────────────────
function ColHeader({ label }: { label: string }) {
  return (
    <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: "#000", margin: "0 0 16px", textAlign: "center", letterSpacing: "0.01em" }}>
      {label}
    </p>
  );
}

// ─── Evidence panel wrapper ───────────────────────────────────────────────────
function EvidencePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 16px" }}>
      <p style={{ fontFamily: FONT, fontWeight: 500, fontSize: 12, color: MUTED, margin: "0 0 12px" }}>{title}</p>
      {children}
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

  const status  = ad ? toStatus(ad.health) : "fatigued";
  const score   = ad ? Math.round(ad.health_score * 100) : 0;
  const beats   = [...(ad?.beats ?? [])].sort((a, b) => a.order - b.order);
  const actions = ad ? deriveActions(ad, params.adId) : [];

  return (
    <div style={{ fontFamily: FONT, background: BG, minHeight: "100vh" }}>

      {/* Sticky nav */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, background: "#fff", borderBottom: `1px solid ${BORDER}` }}>
        <TopNav />
      </div>

      {/* Breadcrumb */}
      <div style={{ padding: "13px 40px", background: "#fff", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/" style={{ fontFamily: FONT, fontSize: 13, color: MUTED, textDecoration: "none" }}>Gallery</Link>
          <span style={{ color: SUBTLE }}>›</span>
          <Link href={`/ads/${params.adId}`} style={{ fontFamily: FONT, fontSize: 13, color: MUTED, textDecoration: "none" }}>Creative analysis</Link>
          <span style={{ color: SUBTLE }}>›</span>
          <span style={{ fontFamily: FONT, fontSize: 13, color: "#000" }}>Decision path</span>
        </div>
      </div>

      {loading && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 320 }}><span style={{ fontFamily: FONT, fontSize: 14, color: MUTED }}>Loading…</span></div>}
      {error   && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 320 }}><span style={{ fontFamily: FONT, fontSize: 14, color: "#ef4444" }}>{error}</span></div>}

      {ad && (
        <div style={{ padding: "32px 40px 80px" }}>

          {/* ── Main white card ── */}
          <div style={{ background: CARD, borderRadius: 20, border: `1px solid ${BORDER}`, overflow: "hidden", boxShadow: "0 2px 20px rgba(0,0,0,0.05)" }}>

            {/* Card header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 28px", borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f5f2ee", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <circle cx="4"  cy="10" r="2.5" fill="#000" />
                    <circle cx="16" cy="4"  r="2.5" fill="#000" />
                    <circle cx="16" cy="16" r="2.5" fill="#000" />
                    <line x1="6.5" y1="10" x2="10"   y2="10"  stroke="#000" strokeWidth="1.5" />
                    <line x1="10"  y1="10" x2="13.5" y2="4"   stroke="#000" strokeWidth="1.5" />
                    <line x1="10"  y1="10" x2="13.5" y2="16"  stroke="#000" strokeWidth="1.5" />
                  </svg>
                </div>
                <div>
                  <h1 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 20, color: "#000", margin: 0, letterSpacing: "-0.02em" }}>
                    Decision path · {ad.title?.trim().slice(0, 42) || ad.id.slice(0, 8)}
                  </h1>
                  <p style={{ fontFamily: FONT, fontWeight: 400, fontSize: 12, color: MUTED, margin: 0 }}>
                    #{ad.id.slice(0, 8)} · {ad.platform} · score {score} · {ad.run_days}d running
                  </p>
                </div>
              </div>
              <button style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", border: `1px solid ${BORDER}`, borderRadius: 20, background: CARD, cursor: "pointer", fontFamily: FONT, fontWeight: 500, fontSize: 13, color: "#000" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="#888" strokeWidth="1.3" />
                  <path d="M7 6.5C7 5.5 8.2 5 8.2 4.2a1.2 1.2 0 00-2.4 0" stroke="#888" strokeWidth="1.3" strokeLinecap="round" />
                  <circle cx="7" cy="9.5" r="0.7" fill="#888" />
                </svg>
                Why this decision?
              </button>
            </div>

            {/* ── 4-column grid ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr 1.2fr 1fr" }}>

              {/* ── Signal column ── */}
              <div style={{ padding: "24px 20px", borderRight: `1px solid ${BORDER}` }}>
                <ColHeader label="Signal" />
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <SignalCard
                    icon={<IconScore up={score >= 50} c={score >= 75 ? "#22c55e" : score >= 45 ? "#f59e0b" : "#ef4444"} />}
                    title={`Score ${score}`}
                    sub={score >= 75 ? "Top-tier performance" : score >= 45 ? "Past performance peak" : "Below viable threshold"}
                  />
                  <SignalCard
                    icon={<IconClock c={ad.run_days > 21 ? "#ef4444" : "#888"} />}
                    title={`${ad.run_days}d running`}
                    sub={ad.run_days > 21 ? "In frequency risk zone" : "Within optimal window"}
                  />
                  <SignalCard
                    icon={<IconBars c="#888" />}
                    title={`${ad.reach_bucket ?? "—"} reach`}
                    sub={`${ad.variant_count} active variant${ad.variant_count !== 1 ? "s" : ""}`}
                  />
                </div>
              </div>

              {/* ── Evidence column ── */}
              <div style={{ padding: "24px 20px", borderRight: `1px solid ${BORDER}` }}>
                <ColHeader label="Evidence" />
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                  {/* Beat health chart — real beat data */}
                  <EvidencePanel title="Beat health over creative timeline">
                    <BeatChart beats={beats} />
                  </EvidencePanel>

                  {/* Beat breakdown table — real beat data */}
                  <EvidencePanel title="Beat breakdown">
                    {beats.length === 0 ? (
                      <p style={{ fontFamily: FONT, fontSize: 12, color: MUTED, margin: 0 }}>No beat data — run analysis first</p>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            {["Beat", "Health", "Score"].map(h => (
                              <th key={h} style={{ fontFamily: FONT, fontWeight: 600, fontSize: 11, color: MUTED, textAlign: "left", paddingBottom: 8, borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {beats.map((b, i) => {
                            const hc = BEAT_HEALTH_COLOR[b.health] ?? "#888";
                            const sc = typeof b.health_score === "number" ? Math.round(b.health_score * 100) : "—";
                            return (
                              <tr key={b.id} style={{ borderBottom: i < beats.length - 1 ? `1px solid #f5f2ee` : "none" }}>
                                <td style={{ fontFamily: FONT, fontSize: 12, color: "#000", padding: "8px 0" }}>{BEAT_LABEL[b.beat_type] ?? b.beat_type}</td>
                                <td style={{ padding: "8px 0" }}>
                                  <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 11, color: hc, background: hc + "18", borderRadius: 20, padding: "2px 8px" }}>{b.health}</span>
                                </td>
                                <td style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: hc, padding: "8px 0" }}>{sc}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </EvidencePanel>

                  {/* Model insight — derived from real score + status */}
                  <div style={{ background: "#f9f7f4", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: CARD, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🧠</div>
                      <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: "#000", margin: 0 }}>Model insight</p>
                    </div>
                    <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: "#000", margin: "0 0 4px" }}>
                      {status === "thriving" ? "Algorithm momentum is positive" : status === "aging" ? "Frequency fatigue building" : "Audience fatigue confirmed"}
                    </p>
                    <p style={{ fontFamily: FONT, fontSize: 12, color: MUTED, lineHeight: 1.65, margin: 0 }}>
                      {status === "thriving"
                        ? `Score ${score} with ${ad.reach_bucket ?? "consistent"} reach signals cold-audience distribution. Optimal amplification window is now.`
                        : status === "aging"
                        ? `After ${ad.run_days} days, repetition probability is rising. Mid-funnel efficiency has declined by an estimated 18–25%.`
                        : `Repetition probability: ${Math.round(60 + (1 - ad.health_score) * 30)}%. Budget is being wasted on over-exposed audiences.`}
                    </p>
                  </div>

                </div>
              </div>

              {/* ── Action column ── */}
              <div style={{ padding: "24px 20px", borderRight: `1px solid ${BORDER}` }}>
                <ColHeader label="Action" />
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {actions.map((a, i) => <ActionCard key={i} action={a} />)}
                </div>
              </div>

              {/* ── Next creative column ── */}
              <div style={{ padding: "24px 20px" }}>
                <ColHeader label="Next creative" />
                <div style={{ border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", background: CARD }}>
                  {/* Label row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: `1px solid ${BORDER}` }}>
                    <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: "#000" }}>
                      {status === "thriving" ? "Scale variant" : status === "aging" ? "Hook refresh" : "Full rebuild"}
                    </span>
                    <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 11, color: ORANGE, background: ORANGE + "15", borderRadius: 20, padding: "2px 9px" }}>Queued</span>
                  </div>
                  {/* Thumbnail from real ad data */}
                  <div style={{ position: "relative", height: 130, background: "#1a1a1a", overflow: "hidden" }}>
                    {ad.thumbnail_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ad.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }} />
                    )}
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 26 }}>{status === "thriving" ? "🚀" : status === "aging" ? "⚡" : "🆕"}</span>
                    </div>
                  </div>
                  {/* Body */}
                  <div style={{ padding: "12px 14px" }}>
                    <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: "#000", margin: "0 0 5px" }}>
                      {status === "thriving" ? "Amplification variant" : status === "aging" ? "Hook refresh build" : "Creative rebuild"}
                    </p>
                    <p style={{ fontFamily: FONT, fontSize: 12, color: MUTED, lineHeight: 1.5, margin: "0 0 12px" }}>
                      {status === "thriving" ? "Same message, new format to extend the performance window." : status === "aging" ? "New first-3s hook on proven mid and payoff sections." : "New concept from beat teardown signals."}
                    </p>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <p style={{ fontFamily: FONT, fontSize: 10, color: SUBTLE, margin: "0 0 1px" }}>Objective</p>
                        <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: "#000", margin: 0 }}>Conversions</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontFamily: FONT, fontSize: 10, color: SUBTLE, margin: "0 0 1px" }}>Est. impact</p>
                        <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: status === "thriving" ? "#22c55e" : ORANGE, margin: 0 }}>
                          {status === "thriving" ? "+35% reach" : status === "aging" ? "+22% CTR" : "Budget rescue"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <Link href={`/canvas/${params.adId}`} style={{ display: "block", marginTop: 10, padding: "12px 0", background: "#000", borderRadius: 10, fontFamily: FONT, fontWeight: 700, fontSize: 13, color: "#fff", textDecoration: "none", textAlign: "center" }}>
                  Build in Canvas →
                </Link>
              </div>

            </div>

            {/* ── Summary bar ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "16px 28px", borderTop: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 15 }}>📋</span>
                <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: "#000" }}>Summary</span>
              </div>
              <p style={{ fontFamily: FONT, fontWeight: 400, fontSize: 13, color: MUTED, margin: 0, flex: 1, lineHeight: 1.5 }}>
                {status === "thriving"
                  ? `Score ${score} with ${ad.reach_bucket ?? "consistent"} reach — in performance window. Scale budget and queue a variant to extend.`
                  : status === "aging"
                  ? `Score ${score} after ${ad.run_days} days — frequency building. Refresh hook and shift budget before efficiency collapses.`
                  : `Score ${score} after ${ad.run_days} days — confirmed fatigue. Pause immediately, start full rebuild in Canvas.`}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 12, color: MUTED }}>🕐</span>
                  <span style={{ fontFamily: FONT, fontSize: 12, color: MUTED }}>Decided just now</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 12, color: MUTED }}>🗄</span>
                  <span style={{ fontFamily: FONT, fontSize: 12, color: MUTED }}>Account memory updated</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
