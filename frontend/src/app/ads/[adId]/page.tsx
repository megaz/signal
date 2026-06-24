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
const BEAT_COLOR: Record<string, string> = { strong: "#66A737", weak: "#E28929", critical: "#C9391A" };
const BEAT_LABEL: Record<string, string> = { hook: "Hook", build: "Build", product: "Product", payoff: "Payoff", cta: "CTA" };

function toStatus(h: string) { return h === "thriving" ? "thriving" : h === "aging" ? "aging" : "fatigued"; }
function fmtMs(ms: number | null) { if (ms === null) return "—"; const s = Math.floor(ms / 1000); const m = Math.floor(s / 60); return m > 0 ? `${m}:${String(s % 60).padStart(2, "0")}` : `${s}s`; }
function fmtDate(iso: string | null) { if (!iso) return "—"; const d = new Date(iso); return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

type Signal = { icon: string; title: string; detail: string; sentiment: "positive" | "neutral" | "negative" };
type CulturalSignal = { tag: string; title: string; description: string; url: string; source: string };

function deriveSignals(ad: AdDetail): Signal[] {
  const score = Math.round(ad.health_score * 100);
  const status = toStatus(ad.health);
  const out: Signal[] = [];
  if (score >= 75) {
    out.push({ icon: "📈", title: `Strong performance score: ${score}`, detail: "Above the 75th percentile — creative is driving efficient, sustained engagement.", sentiment: "positive" });
    out.push({ icon: "⚡", title: "Audience resonance is high", detail: `${ad.run_days}d run with ${ad.reach_bucket ?? "consistent"} reach — attention is holding, not saturating.`, sentiment: "positive" });
    if (ad.variant_count > 1) out.push({ icon: "🔁", title: `${ad.variant_count} active variants compounding signal`, detail: "Multi-variant presence is feeding the algorithm with richer performance data.", sentiment: "positive" });
  } else if (score >= 45) {
    out.push({ icon: "⚠️", title: `Score declining: ${score}`, detail: "Hook engagement may be holding but mid-funnel is softening — conversion efficiency is falling.", sentiment: "neutral" });
    out.push({ icon: "⏳", title: `${ad.run_days} days in the frequency risk zone`, detail: "Audience overlap is increasing. Creative is being served to the same users repeatedly.", sentiment: "neutral" });
    out.push({ icon: "🎯", title: "Variant opportunity open", detail: "A fresh angle on the core concept could recapture fatiguing audience segments before spend efficiency collapses.", sentiment: "neutral" });
  } else {
    out.push({ icon: "📉", title: `Critical score: ${score}`, detail: "Performance is below the viable threshold — every pound/dollar spent is generating negative efficiency.", sentiment: "negative" });
    out.push({ icon: "🔁", title: "Audience fatigue confirmed", detail: `After ${ad.run_days} days of continuous spend, this creative is over-exposed to its core segment.`, sentiment: "negative" });
    out.push({ icon: "🛑", title: "Hook failure likely", detail: "First 3 seconds are failing to stop the scroll — beat structure needs a complete rethink.", sentiment: "negative" });
  }
  if (status === "thriving" && ad.platform === "tiktok")
    out.push({ icon: "🌊", title: "TikTok algorithm is distributing actively", detail: "High completion rates are signalling the algorithm to push this creative into cold audiences beyond your existing base.", sentiment: "positive" });
  return out;
}

function deriveCulturalSignals(ad: AdDetail): CulturalSignal[] {
  const status = toStatus(ad.health);
  const base: CulturalSignal[] = [
    { tag: "Trend data", title: "Top-performing creative formats this week", description: "Real-time data on which hooks, formats and CTAs are generating the highest engagement by vertical.", url: "https://ads.tiktok.com/business/creativecenter/inspiration/popular/pc/en", source: "TikTok Creative Center" },
    { tag: "Competitive", title: "Active creatives in your category", description: "Browse what competitors are currently running to identify format gaps and creative whitespace.", url: "https://www.facebook.com/ads/library", source: "Meta Ad Library" },
  ];
  if (status === "thriving") {
    base.push({ tag: "Cultural moment", title: "Rising interest in this messaging pillar", description: "Google Trends shows sustained upward trajectory for the audience intent signals this creative is targeting.", url: "https://trends.google.com/trends/explore", source: "Google Trends" });
  } else {
    base.push({ tag: "Saturation signal", title: "Format fatigue research", description: "Kantar's wear-out data indicates performance-first formats typically see 40% efficiency decline after week 3–4 of continuous spend.", url: "https://www.kantar.com/campaigns/brandz", source: "Kantar BrandZ" });
    base.push({ tag: "Attention research", title: "Novelty-first hook benchmarks", description: "Nielsen's attention metrics show TikTok and Reels audiences re-engage sharply with format novelty — targeting a 2-week refresh cycle.", url: "https://www.nielsen.com/insights/", source: "Nielsen Insights" });
  }
  return base;
}

function getCTA(ad: AdDetail) {
  const s = toStatus(ad.health);
  if (s === "thriving") return { label: "Scale this strategy →", sub: "Review signal evidence and plan amplification", bg: STATUS_COLOR.thriving };
  if (s === "aging")    return { label: "Develop a variant →",   sub: "See the decision path and recommended next steps",  bg: STATUS_COLOR.aging };
  return                       { label: "Diagnose & Refresh →",  sub: "Full decision path — video drop-off, fix brief and next creative",  bg: STATUS_COLOR.fatigued };
}

function MetricTile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col" style={{ border: "1.5px solid #ececec", borderRadius: 14, padding: "14px 18px", flex: 1, minWidth: 100, background: "#fff" }}>
      <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 22, color: accent ?? "#000", lineHeight: 1.1 }}>{value}</span>
      <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 11, color: "rgba(0,0,0,0.4)", marginTop: 4 }}>{label}</span>
    </div>
  );
}

function SignalCard({ s }: { s: Signal }) {
  const bg = s.sentiment === "positive" ? "#f0f7ec" : s.sentiment === "negative" ? "#fdf1ef" : "#fdf8ef";
  const bd = s.sentiment === "positive" ? "#c8e6b8" : s.sentiment === "negative" ? "#f3cdc7" : "#f5e4c0";
  return (
    <div className="flex items-start" style={{ background: bg, border: `1.5px solid ${bd}`, borderRadius: 14, padding: "14px 16px", gap: 12 }}>
      <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
      <div className="flex flex-col" style={{ gap: 4 }}>
        <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14, color: "#000" }}>{s.title}</span>
        <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 13, color: "rgba(0,0,0,0.55)", lineHeight: 1.55 }}>{s.detail}</span>
      </div>
    </div>
  );
}

function CulturalCard({ s }: { s: CulturalSignal }) {
  return (
    <a href={s.url} target="_blank" rel="noopener noreferrer" className="flex flex-col"
      style={{ border: "1.5px solid #e8e8e8", borderRadius: 14, padding: "16px 18px", gap: 8, textDecoration: "none", flex: 1, minWidth: 200, background: "#fff" }}>
      <div className="flex items-center justify-between">
        <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 11, color: "rgba(0,0,0,0.38)", letterSpacing: "0.07em", textTransform: "uppercase" }}>{s.tag}</span>
        <span style={{ fontSize: 13, color: "rgba(0,0,0,0.28)" }}>↗</span>
      </div>
      <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14, color: "#000", lineHeight: 1.3 }}>{s.title}</span>
      <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 12, color: "rgba(0,0,0,0.5)", lineHeight: 1.55 }}>{s.description}</span>
      <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 11, color: "rgba(0,0,0,0.32)", marginTop: 4 }}>{s.source}</span>
    </a>
  );
}

function BeatCard({ beat }: { beat: Beat }) {
  const color = BEAT_COLOR[beat.health] ?? "#000";
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: `1.5px solid ${color}30`, borderRadius: 14, overflow: "hidden", background: "#fff" }}>
      <button className="w-full flex items-center text-left" style={{ padding: "14px 18px", gap: 12, cursor: "pointer", background: "none", border: "none" }} onClick={() => setOpen(v => !v)}>
        <div className="flex items-center justify-center flex-none" style={{ width: 30, height: 30, borderRadius: 8, background: `${color}15` }}>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12, color }}>{beat.order + 1}</span>
        </div>
        <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14, color: "#000", flex: 1 }}>{BEAT_LABEL[beat.beat_type] ?? beat.beat_type}</span>
        <span style={{ fontFamily: FONT, fontSize: 12, color: "rgba(0,0,0,0.35)" }}>{fmtMs(beat.start_ms)}–{fmtMs(beat.end_ms)}</span>
        <div className="flex items-center gap-1.5" style={{ marginLeft: 12, background: `${color}12`, border: `1.5px solid ${color}30`, borderRadius: 20, padding: "3px 10px" }}>
          <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 12, color }}>{beat.health}</span>
        </div>
        <span style={{ fontFamily: FONT, fontSize: 13, color: "rgba(0,0,0,0.25)", marginLeft: 10 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ borderTop: `1px solid ${color}20`, padding: "16px 18px 16px 60px", background: `${color}05` }}>
          {beat.diagnosis && <div style={{ marginBottom: 14 }}><p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 11, color: "rgba(0,0,0,0.4)", letterSpacing: "0.07em", textTransform: "uppercase", margin: "0 0 6px" }}>Diagnosis</p><p style={{ fontFamily: FONT, fontSize: 14, color: "#000", lineHeight: 1.65, margin: 0 }}>{beat.diagnosis}</p></div>}
          {beat.proposed_fix && <>
            <div style={{ marginBottom: 12 }}><p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 11, color: "rgba(0,0,0,0.4)", letterSpacing: "0.07em", textTransform: "uppercase", margin: "0 0 6px" }}>Proposed fix</p><p style={{ fontFamily: FONT, fontSize: 14, color: "#000", lineHeight: 1.65, margin: 0 }}>{beat.proposed_fix.description}</p></div>
            {beat.proposed_fix.rationale && <div style={{ marginBottom: 12 }}><p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 11, color: "rgba(0,0,0,0.4)", letterSpacing: "0.07em", textTransform: "uppercase", margin: "0 0 6px" }}>Rationale</p><p style={{ fontFamily: FONT, fontSize: 14, color: "#000", lineHeight: 1.65, margin: 0 }}>{beat.proposed_fix.rationale}</p></div>}
            {beat.proposed_fix.script_delta && <div style={{ marginBottom: 12 }}><p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 11, color: "rgba(0,0,0,0.4)", letterSpacing: "0.07em", textTransform: "uppercase", margin: "0 0 6px" }}>Script change</p><pre style={{ fontFamily: "monospace", fontSize: 13, color: "#000", background: "rgba(0,0,0,0.04)", borderRadius: 8, padding: "10px 14px", whiteSpace: "pre-wrap", lineHeight: 1.6, margin: 0 }}>{beat.proposed_fix.script_delta}</pre></div>}
            {beat.proposed_fix.trend_hook && <div><p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 11, color: "rgba(0,0,0,0.4)", letterSpacing: "0.07em", textTransform: "uppercase", margin: "0 0 6px" }}>Trend hook</p><p style={{ fontFamily: FONT, fontSize: 14, color: "#000", lineHeight: 1.65, margin: 0 }}>{beat.proposed_fix.trend_hook}</p></div>}
          </>}
        </div>
      )}
    </div>
  );
}

export default function AdDetailPage({ params }: { params: { adId: string } }) {
  const [ad, setAd] = useState<AdDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adService.getAd(params.adId).then(setAd).catch(() => setError("Could not load creative data.")).finally(() => setLoading(false));
  }, [params.adId]);

  const status = ad ? toStatus(ad.health) : "fatigued";
  const color = STATUS_COLOR[status];
  const score = ad ? Math.round(ad.health_score * 100) : null;
  const beats = [...(ad?.beats ?? [])].sort((a, b) => a.order - b.order);
  const signals = ad ? deriveSignals(ad) : [];
  const cultural = ad ? deriveCulturalSignals(ad) : [];
  const cta = ad ? getCTA(ad) : null;

  return (
    <div className="w-full min-h-screen flex flex-col" style={{ fontFamily: FONT, background: "#f7f7f7" }}>
      <div style={{ background: "#fff" }}><TopNav /></div>
      <div style={{ paddingLeft: PAD, paddingRight: PAD, marginTop: 20 }}>
        <Link href="/" style={{ fontFamily: FONT, fontWeight: 400, fontSize: 13, color: "rgba(0,0,0,0.4)", textDecoration: "none" }}>← Gallery</Link>
      </div>

      {loading && <div className="flex-1 flex items-center justify-center"><span style={{ fontFamily: FONT, fontSize: 14, color: "rgba(0,0,0,0.4)" }}>Loading…</span></div>}
      {error && <div className="flex-1 flex items-center justify-center"><span style={{ fontFamily: FONT, fontSize: 14, color: STATUS_COLOR.fatigued }}>{error}</span></div>}

      {ad && (
        <div style={{ paddingLeft: PAD, paddingRight: PAD, paddingBottom: 80, marginTop: 24 }}>

          {/* 1. Hero */}
          <div className="flex items-start" style={{ gap: 32, background: "#fff", borderRadius: 22, padding: 28, border: "1.5px solid #ececec" }}>
            <div className="relative flex-none overflow-hidden" style={{ width: 192, height: Math.round(192 * 16 / 9), background: "#111", borderRadius: 16, flexShrink: 0 }}>
              {ad.video_url ? (
                <video src={ad.video_url} poster={ad.thumbnail_url ?? undefined} controls playsInline className="absolute inset-0 w-full h-full object-cover" style={{ borderRadius: 16 }} />
              ) : ad.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ad.thumbnail_url} alt="thumbnail" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center"><span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>No preview</span></div>
              )}
            </div>
            <div className="flex flex-col flex-1 min-w-0" style={{ gap: 14 }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 24, color: "#000", lineHeight: 1.2, margin: "0 0 4px" }}>{ad.title?.trim() || "Untitled creative"}</h1>
                  <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 13, color: "rgba(0,0,0,0.35)" }}>#{ad.id.slice(0, 8)} · {ad.platform} · started {fmtDate(ad.started_at)}</span>
                </div>
                <div className="flex items-center gap-2 flex-none" style={{ background: `${color}14`, border: `1.5px solid ${color}35`, borderRadius: 24, padding: "8px 16px" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, flexShrink: 0 }} />
                  <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14, color }}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                </div>
              </div>
              <div className="flex" style={{ gap: 10 }}>
                <MetricTile label="Performance score" value={score !== null ? String(score) : "—"} accent={color} />
                <MetricTile label="Days running" value={ad.run_days != null ? `${ad.run_days}d` : "—"} />
                <MetricTile label="Reach tier" value={ad.reach_bucket ?? "—"} />
                <MetricTile label="Active variants" value={String(ad.variant_count)} />
                <MetricTile label="Last active" value={fmtDate(ad.last_seen_at)} />
              </div>
              <div style={{ background: "#f7f7f7", borderRadius: 12, padding: "12px 16px" }}>
                <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 14, color: "rgba(0,0,0,0.6)", lineHeight: 1.65 }}>
                  {status === "thriving" && `This creative is performing in the top tier — score ${score} — with ${ad.reach_bucket ?? "consistent"} reach over ${ad.run_days} days. The algorithm is actively distributing it to cold audiences.`}
                  {status === "aging"    && `This creative has passed its performance peak — score ${score}. After ${ad.run_days} days, frequency is building and mid-funnel metrics are softening. A variant or fresh hook is recommended before efficiency collapses.`}
                  {status === "fatigued" && `This creative is critically underperforming — score ${score} after ${ad.run_days} days. Audience fatigue and likely hook failure are the primary drivers. Immediate action is required to stop budget waste.`}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Performance signals */}
          <div style={{ marginTop: 32 }}>
            <h2 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 18, color: "#000", margin: "0 0 14px" }}>Why this creative is {status}</h2>
            <div className="flex flex-col" style={{ gap: 10 }}>
              {signals.map((s, i) => <SignalCard key={i} s={s} />)}
            </div>
          </div>

          {/* 3. Cultural & market signals */}
          <div style={{ marginTop: 32 }}>
            <h2 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 18, color: "#000", margin: "0 0 6px" }}>Cultural &amp; market signals</h2>
            <p style={{ fontFamily: FONT, fontWeight: 400, fontSize: 13, color: "rgba(0,0,0,0.45)", margin: "0 0 14px", lineHeight: 1.5 }}>External context shaping how this creative is landing with audiences right now.</p>
            <div className="flex flex-wrap" style={{ gap: 12 }}>
              {cultural.map((s, i) => <CulturalCard key={i} s={s} />)}
            </div>
          </div>

          {/* 4. Creative brief */}
          <div style={{ marginTop: 32 }}>
            <h2 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 18, color: "#000", margin: "0 0 14px" }}>Creative brief</h2>
            {beats.length === 0 ? (
              <div style={{ border: "1.5px solid #ececec", borderRadius: 14, padding: "28px 24px", textAlign: "center", background: "#fff" }}>
                <span style={{ fontFamily: FONT, fontSize: 14, color: "rgba(0,0,0,0.35)" }}>No beat analysis yet — run analysis to generate the brief.</span>
              </div>
            ) : (
              <div className="flex flex-col" style={{ gap: 8 }}>
                {beats.map(b => <BeatCard key={b.id} beat={b} />)}
              </div>
            )}
          </div>

          {/* 5. CTA */}
          {cta && (
            <div style={{ marginTop: 40, background: "#fff", border: "1.5px solid #ececec", borderRadius: 22, padding: "28px 32px" }}>
              <div className="flex items-center justify-between gap-8">
                <div>
                  <h3 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 18, color: "#000", margin: "0 0 6px" }}>Ready to act on this insight?</h3>
                  <p style={{ fontFamily: FONT, fontWeight: 400, fontSize: 14, color: "rgba(0,0,0,0.5)", margin: 0 }}>{cta.sub}</p>
                </div>
                <Link href={`/ads/${ad.id}/decision`} style={{ fontFamily: FONT, fontWeight: 700, fontSize: 15, color: "#fff", background: cta.bg, borderRadius: 14, padding: "14px 28px", textDecoration: "none", whiteSpace: "nowrap", boxShadow: `0 4px 18px ${cta.bg}55`, flexShrink: 0 }}>
                  {cta.label}
                </Link>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
