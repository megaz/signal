"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TopNav } from "@/components/shell/TopNav";
import { adService } from "@/services/adService";
import type { AdDetail } from "@/types/ad";
import type { Beat } from "@/types/beat";
import type { AdAnalytics, CulturalSignal as CulturalSignalT } from "@/types/analytics";
import { RetentionChart, GrowthChart, CultureMap } from "@/components/analytics";

const FONT = "'Poppins', sans-serif";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  thriving: "#22c55e",
  aging:    "#f59e0b",
  fatigued: "#ef4444",
  bg:       "#f4f5f7",
  card:     "#ffffff",
  border:   "#e5e7eb",
  muted:    "rgba(0,0,0,0.42)",
  subtle:   "rgba(0,0,0,0.22)",
};

const BEAT_HEALTH_COLOR: Record<string, string> = { strong: C.thriving, weak: C.aging, critical: C.fatigued };
const BEAT_LABEL: Record<string, string> = { hook: "Hook", build: "Build", product: "Product", payoff: "Payoff", cta: "CTA" };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toStatus(h: string) { return h === "thriving" ? "thriving" : h === "aging" ? "aging" : "fatigued"; }
function fmtMs(ms: number | null) { if (!ms) return "—"; const s = Math.floor(ms / 1000); const m = Math.floor(s / 60); return m > 0 ? `${m}:${String(s % 60).padStart(2, "0")}` : `${s}s`; }
function fmtDate(iso: string | null) { if (!iso) return "—"; const d = new Date(iso); return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ─── Derived data ─────────────────────────────────────────────────────────────
type Signal = { icon: string; title: string; detail: string; sentiment: "pos" | "neu" | "neg" };

function deriveSignals(ad: AdDetail): Signal[] {
  const sc = Math.round(ad.health_score * 100);
  const out: Signal[] = [];
  if (sc >= 75) {
    out.push({ icon: "↗", title: `Performance score ${sc} — top tier`, detail: "Above the 75th percentile. Creative is driving efficient, sustained engagement.", sentiment: "pos" });
    out.push({ icon: "◎", title: "Audience attention is holding", detail: `${ad.run_days}d run with ${ad.reach_bucket ?? "consistent"} reach — saturation has not set in.`, sentiment: "pos" });
    if (ad.variant_count > 1) out.push({ icon: "⊞", title: `${ad.variant_count} variants compounding signal`, detail: "Multi-variant presence is generating richer algorithm feedback, accelerating distribution.", sentiment: "pos" });
    if (ad.platform === "tiktok") out.push({ icon: "⟳", title: "Algorithm is actively distributing", detail: "High completion rates are signalling cold-audience distribution beyond your existing base.", sentiment: "pos" });
  } else if (sc >= 45) {
    out.push({ icon: "↘", title: `Score ${sc} — past peak`, detail: "Hook engagement may be holding but mid-funnel conversion efficiency is softening.", sentiment: "neu" });
    out.push({ icon: "⧖", title: `${ad.run_days} days — frequency risk building`, detail: "Audience overlap is increasing. Creative is being served repeatedly to the same users.", sentiment: "neu" });
    out.push({ icon: "◈", title: "Variant opportunity is open", detail: "A fresh angle on the same concept could recapture fatiguing segments before efficiency collapses.", sentiment: "neu" });
  } else {
    out.push({ icon: "↘", title: `Score ${sc} — below viable threshold`, detail: "Every impression served is generating negative spend efficiency.", sentiment: "neg" });
    out.push({ icon: "⊗", title: `${ad.run_days} days — audience fatigue confirmed`, detail: "This creative is over-exposed to its core segment. Frequency is well above optimal.", sentiment: "neg" });
    out.push({ icon: "✕", title: "Hook failure likely", detail: "First 3 seconds are failing to stop the scroll. Beat structure needs a complete rethink.", sentiment: "neg" });
  }
  return out;
}

function deriveCulturalRefs(ad: AdDetail): CulturalSignalT[] {
  const s = toStatus(ad.health);
  const out: CulturalSignalT[] = [
    { tag: "Trend", title: "Top creative formats this week", description: "Real-time data on which hooks, formats and CTAs are generating highest engagement by vertical.", url: "https://ads.tiktok.com/business/creativecenter/inspiration/popular/pc/en", source: "TikTok Creative Center" },
    { tag: "Competitive", title: "Active creatives in your category", description: "Browse what competitors are running to identify format gaps and creative whitespace.", url: "https://www.facebook.com/ads/library", source: "Meta Ad Library" },
  ];
  if (s === "thriving") {
    out.push({ tag: "Cultural moment", title: "Rising audience intent signal", description: "Google Trends shows a sustained upward trajectory for the messaging pillar this creative targets.", url: "https://trends.google.com/trends/explore", source: "Google Trends" });
  } else {
    out.push({ tag: "Wear-out research", title: "Format fatigue benchmarks", description: "Kantar data shows performance-first formats see ~40% efficiency decline after 3–4 weeks of continuous spend.", url: "https://www.kantar.com/campaigns/brandz", source: "Kantar BrandZ" });
    out.push({ tag: "Attention data", title: "Novelty-first hook benchmarks", description: "Nielsen attention metrics show TikTok/Reels audiences re-engage sharply with novelty — optimal refresh cadence is 2 weeks.", url: "https://www.nielsen.com/insights/", source: "Nielsen Insights" });
  }
  return out;
}

// ─── Score ring SVG ───────────────────────────────────────────────────────────
function ScoreRing({ score, color, size = 120 }: { score: number; color: string; size?: number }) {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (score / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#ececec" strokeWidth={7} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2 + 1} textAnchor="middle" dominantBaseline="middle"
        style={{ fontFamily: FONT, fontWeight: 800, fontSize: size * 0.27, fill: color }}>{score}</text>
      <text x={size/2} y={size/2 + size * 0.22} textAnchor="middle"
        style={{ fontFamily: FONT, fontWeight: 400, fontSize: size * 0.10, fill: C.muted }}>/ 100</text>
    </svg>
  );
}

// ─── Beat timeline ────────────────────────────────────────────────────────────
function BeatTimeline({ beats }: { beats: Beat[] }) {
  if (!beats.length) return null;
  return (
    <div className="flex items-center" style={{ height: 8, borderRadius: 6, overflow: "hidden", gap: 2 }}>
      {beats.map(b => (
        <div key={b.id} style={{ flex: 1, height: "100%", background: BEAT_HEALTH_COLOR[b.health] ?? "#ccc", borderRadius: 3 }} title={`${BEAT_LABEL[b.beat_type]}: ${b.health}`} />
      ))}
    </div>
  );
}

// ─── Stat pill row ────────────────────────────────────────────────────────────
function StatRow({ items }: { items: { label: string; value: string; accent?: string }[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)`, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      {items.map((it, i) => (
        <div key={i} className="flex flex-col items-center" style={{ padding: "12px 8px", borderRight: i < items.length - 1 ? `1px solid ${C.border}` : "none", background: C.card }}>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 18, color: it.accent ?? "#000", lineHeight: 1.1 }}>{it.value}</span>
          <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 10, color: C.muted, marginTop: 3, textAlign: "center" }}>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 15, color: "#000", margin: 0, letterSpacing: "-0.01em" }}>{title}</h2>
        {subtitle && <p style={{ fontFamily: FONT, fontWeight: 400, fontSize: 12, color: C.muted, margin: "4px 0 0", lineHeight: 1.5 }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Signal card ──────────────────────────────────────────────────────────────
function SignalCard({ s }: { s: Signal }) {
  const [bg, bd, iconColor] =
    s.sentiment === "pos" ? ["#f0fdf4", "#bbf7d0", C.thriving] :
    s.sentiment === "neg" ? ["#fff5f5", "#fecaca", C.fatigued] :
                            ["#fffbeb", "#fde68a", C.aging];
  return (
    <div style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: iconColor + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 14, color: iconColor, lineHeight: 1 }}>{s.icon}</span>
      </div>
      <div>
        <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: "#000", margin: "0 0 4px", lineHeight: 1.3 }}>{s.title}</p>
        <p style={{ fontFamily: FONT, fontWeight: 400, fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.6 }}>{s.detail}</p>
      </div>
    </div>
  );
}

// ─── Cultural ref card ────────────────────────────────────────────────────────
function CulturalCard({ s }: { s: CulturalSignalT }) {
  return (
    <a href={s.url} target="_blank" rel="noopener noreferrer"
      style={{ display: "flex", flexDirection: "column", gap: 6, padding: "14px 16px", border: `1px solid ${C.border}`, borderRadius: 12, textDecoration: "none", background: C.card, flex: 1, minWidth: 180 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 10, color: C.subtle, letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.tag}</span>
        <span style={{ fontSize: 11, color: C.subtle }}>↗</span>
      </div>
      <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: "#000", lineHeight: 1.35 }}>{s.title}</span>
      <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 12, color: C.muted, lineHeight: 1.55 }}>{s.description}</span>
      <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 11, color: C.subtle, marginTop: 2 }}>{s.source}</span>
    </a>
  );
}

// ─── Beat accordion ───────────────────────────────────────────────────────────
function BeatCard({ beat, index }: { beat: Beat; index: number }) {
  const [open, setOpen] = useState(false);
  const color = BEAT_HEALTH_COLOR[beat.health] ?? "#999";
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 10, color: C.subtle, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 5px" }}>{label}</p>
      {children}
    </div>
  );
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", background: C.card }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        {/* Step number */}
        <div style={{ width: 26, height: 26, borderRadius: 7, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color }}>{index + 1}</span>
        </div>
        {/* Beat type + time */}
        <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: "#000", flex: 1 }}>{BEAT_LABEL[beat.beat_type] ?? beat.beat_type}</span>
        <span style={{ fontFamily: FONT, fontSize: 11, color: C.subtle }}>{fmtMs(beat.start_ms)}–{fmtMs(beat.end_ms)}</span>
        {/* Health badge */}
        <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 11, color, background: color + "18", borderRadius: 20, padding: "3px 10px", marginLeft: 8 }}>{beat.health}</span>
        {/* Chevron */}
        <span style={{ fontFamily: FONT, fontSize: 11, color: C.subtle, marginLeft: 6, transform: open ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.15s" }}>▼</span>
      </button>
      {open && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "16px 16px 16px 54px", background: color + "04" }}>
          {beat.diagnosis && <Field label="Diagnosis"><p style={{ fontFamily: FONT, fontSize: 13, color: "#111", lineHeight: 1.7, margin: 0 }}>{beat.diagnosis}</p></Field>}
          {beat.proposed_fix && (
            <>
              <Field label="Proposed fix"><p style={{ fontFamily: FONT, fontSize: 13, color: "#111", lineHeight: 1.7, margin: 0 }}>{beat.proposed_fix.description}</p></Field>
              {beat.proposed_fix.rationale && <Field label="Rationale"><p style={{ fontFamily: FONT, fontSize: 13, color: "#111", lineHeight: 1.7, margin: 0 }}>{beat.proposed_fix.rationale}</p></Field>}
              {beat.proposed_fix.script_delta && <Field label="Script change"><pre style={{ fontFamily: "monospace", fontSize: 12, color: "#111", background: "#f4f5f7", borderRadius: 8, padding: "10px 12px", whiteSpace: "pre-wrap", lineHeight: 1.65, margin: 0 }}>{beat.proposed_fix.script_delta}</pre></Field>}
              {beat.proposed_fix.trend_hook && <Field label="Trend hook"><p style={{ fontFamily: FONT, fontSize: 13, color: "#111", lineHeight: 1.7, margin: 0 }}>{beat.proposed_fix.trend_hook}</p></Field>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdDetailPage({ params }: { params: { adId: string } }) {
  const [ad, setAd] = useState<AdDetail | null>(null);
  const [analytics, setAnalytics] = useState<AdAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    adService.getAd(params.adId).then(setAd).catch(() => setError("Could not load creative data.")).finally(() => setLoading(false));
    adService.getAnalytics(params.adId).then(setAnalytics).catch(() => {});
  }, [params.adId]);

  const status = ad ? toStatus(ad.health) : "fatigued";
  const statusColor = (C as Record<string, string>)[status] ?? C.fatigued;
  const score = ad ? Math.round(ad.health_score * 100) : 0;
  const beats = [...(ad?.beats ?? [])].sort((a, b) => a.order - b.order);
  const signals = ad ? deriveSignals(ad) : [];
  const cultural: CulturalSignalT[] = analytics?.cultural_signals ?? (ad ? deriveCulturalRefs(ad) : []);

  const ctaLabel   = status === "thriving" ? "Scale this strategy →" : status === "aging" ? "Develop a variant →" : "Diagnose & Refresh →";
  const ctaSub     = status === "thriving" ? "See signal evidence and plan amplification" : status === "aging" ? "View the decision path and next steps" : "Full decision path — drop-off, brief and next creative";

  return (
    <div style={{ fontFamily: FONT, background: C.bg, minHeight: "100vh" }}>
      {/* Sticky nav */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, background: "#fff", borderBottom: `1px solid ${C.border}` }}>
        <TopNav />
      </div>

      {/* Breadcrumb */}
      <div style={{ padding: "14px 40px", borderBottom: `1px solid ${C.border}`, background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/" style={{ fontFamily: FONT, fontSize: 13, color: C.muted, textDecoration: "none" }}>Gallery</Link>
          <span style={{ color: C.subtle }}>›</span>
          <span style={{ fontFamily: FONT, fontSize: 13, color: "#000" }}>{ad?.title?.trim() || params.adId.slice(0, 8)}</span>
        </div>
      </div>

      {loading && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}><span style={{ fontFamily: FONT, fontSize: 14, color: C.muted }}>Loading…</span></div>}
      {error && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}><span style={{ fontFamily: FONT, fontSize: 14, color: C.fatigued }}>{error}</span></div>}

      {ad && (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 0, maxWidth: 1280, margin: "0 auto", padding: "28px 32px 80px", alignItems: "start" }}>

          {/* ── LEFT SIDEBAR (sticky) ── */}
          <div style={{ position: "sticky", top: 80, display: "flex", flexDirection: "column", gap: 16, paddingRight: 24 }}>
            {/* Video / thumbnail */}
            <div style={{ position: "relative", width: "100%", paddingTop: "177%", background: "#111", borderRadius: 18, overflow: "hidden" }}>
              {ad.video_url ? (
                <video src={ad.video_url} poster={ad.thumbnail_url ?? undefined} controls playsInline
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: 18 }} />
              ) : ad.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ad.thumbnail_url} alt="thumbnail"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>No preview</span>
                </div>
              )}
            </div>

            {/* Score + status */}
            <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: "18px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <ScoreRing score={score} color={statusColor} size={108} />
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: statusColor + "14", border: `1px solid ${statusColor}30`, borderRadius: 20, padding: "6px 14px" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: statusColor, flexShrink: 0 }} />
                <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: statusColor }}>{capitalize(status)}</span>
              </div>
              <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 11, color: C.muted, textAlign: "center", lineHeight: 1.5 }}>
                #{ad.id.slice(0, 8)} · {ad.platform}<br />Started {fmtDate(ad.started_at)}
              </span>
            </div>

            {/* Quick stats */}
            <StatRow items={[
              { label: "Run days",  value: `${ad.run_days}d` },
              { label: "Reach",     value: ad.reach_bucket ?? "—" },
              { label: "Variants",  value: String(ad.variant_count) },
            ]} />

            {/* Beat timeline */}
            {beats.length > 0 && (
              <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: "14px 16px" }}>
                <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 11, color: C.muted, letterSpacing: "0.07em", textTransform: "uppercase", margin: "0 0 10px" }}>Beat health</p>
                <BeatTimeline beats={beats} />
                <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                  {beats.map(b => {
                    const bc = BEAT_HEALTH_COLOR[b.health] ?? "#999";
                    return (
                      <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: bc }} />
                        <span style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>{BEAT_LABEL[b.beat_type]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT CONTENT ── */}
          <div ref={scrollRef} style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            {/* Title block */}
            <div style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.border}`, padding: "24px 28px", marginBottom: 4 }}>
              <h1 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 22, color: "#000", margin: "0 0 6px", lineHeight: 1.25, letterSpacing: "-0.02em" }}>
                {ad.title?.trim() || "Untitled creative"}
              </h1>
              <p style={{ fontFamily: FONT, fontWeight: 400, fontSize: 12, color: C.muted, margin: "0 0 16px" }}>
                #{ad.id.slice(0, 8)} · {ad.platform} · started {fmtDate(ad.started_at)} · last seen {fmtDate(ad.last_seen_at)}
              </p>
              {/* Narrative */}
              <div style={{ borderLeft: `3px solid ${statusColor}`, paddingLeft: 14 }}>
                <p style={{ fontFamily: FONT, fontWeight: 400, fontSize: 14, color: "#1a1a1a", margin: 0, lineHeight: 1.75 }}>
                  {status === "thriving" && `This creative is performing in the top tier — score ${score} — with ${ad.reach_bucket ?? "consistent"} reach over ${ad.run_days} days. The algorithm is actively distributing it to cold audiences beyond the existing base.`}
                  {status === "aging"    && `This creative has passed its performance peak — score ${score}. After ${ad.run_days} days, frequency is building and mid-funnel metrics are softening. A variant or fresh hook is recommended before efficiency collapses.`}
                  {status === "fatigued" && `This creative is critically underperforming — score ${score} after ${ad.run_days} days. Audience fatigue and likely hook failure are the primary drivers. Immediate action is required to stop budget waste.`}
                </p>
              </div>
            </div>

            {/* Performance signals */}
            <div style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.border}`, padding: "22px 28px" }}>
              <Section title={`Why this creative is ${status}`}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {signals.map((s, i) => <SignalCard key={i} s={s} />)}
                </div>
              </Section>
            </div>

            {/* Performance trends — retention + growth graphs */}
            {analytics && (
              <div style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.border}`, padding: "22px 28px", marginTop: 4 }}>
                <Section title="Performance trends" subtitle="How attention holds across the runtime and how reach has compounded since launch.">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                    <div>
                      <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: "#000", margin: "0 0 12px" }}>Audience retention</p>
                      <RetentionChart points={analytics.retention} summary={analytics.retention_summary} color={statusColor} />
                    </div>
                    <div>
                      <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: "#000", margin: "0 0 12px" }}>Reach growth</p>
                      <GrowthChart points={analytics.growth} summary={analytics.growth_summary} color={statusColor} />
                    </div>
                  </div>
                </Section>
              </div>
            )}

            {/* Culture map — generated from the brand's real cultural footprint */}
            {analytics && (
              <div style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.border}`, padding: "22px 28px", marginTop: 4 }}>
                <Section title="Culture map" subtitle="Where this creative sits in the brand's cultural footprint — generated from real audience engagement across themes.">
                  <CultureMap data={analytics.culture_map} />
                </Section>
              </div>
            )}

            {/* Market & cultural context */}
            <div style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.border}`, padding: "22px 28px", marginTop: 4 }}>
              <Section title="Market & cultural context" subtitle="External signals shaping how this creative is landing with audiences right now.">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {cultural.map((s, i) => <CulturalCard key={i} s={s} />)}
                </div>
              </Section>
            </div>

            {/* Creative brief */}
            <div style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.border}`, padding: "22px 28px", marginTop: 4 }}>
              <Section title="Creative brief" subtitle="Beat-by-beat analysis. Click any beat to see the diagnosis and proposed fix.">
                {beats.length === 0 ? (
                  <div style={{ border: `1px dashed ${C.border}`, borderRadius: 12, padding: "32px 24px", textAlign: "center" }}>
                    <span style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>No beat analysis yet — run analysis to generate the brief.</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {beats.map((b, i) => <BeatCard key={b.id} beat={b} index={i} />)}
                  </div>
                )}
              </Section>
            </div>

            {/* CTA */}
            <div style={{ background: "#000", borderRadius: 18, padding: "26px 28px", marginTop: 4, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
              <div>
                <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: 17, color: "#fff", margin: "0 0 5px" }}>Ready to act on this insight?</p>
                <p style={{ fontFamily: FONT, fontWeight: 400, fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0 }}>{ctaSub}</p>
              </div>
              <Link href={`/ads/${ad.id}/decision`}
                style={{ fontFamily: FONT, fontWeight: 700, fontSize: 14, color: "#000", background: "#fff", borderRadius: 12, padding: "13px 24px", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
                {ctaLabel}
              </Link>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
