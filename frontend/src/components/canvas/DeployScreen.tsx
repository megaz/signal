"use client";
import { useState } from "react";
import { FONT, INK, MUTED, BORDER } from "@/lib/ui";
import type { Refresh } from "@/types/review";

const GREEN = "#66A737";
const RED = "#C9391A";

type DeployStep = "configure" | "deploying" | "live";

interface Props {
  refresh: Refresh;
  adTitle: string;
}

const PLATFORMS = [
  { id: "tiktok", label: "TikTok Ads", icon: "♪" },
  { id: "meta", label: "Meta Ads", icon: "⬡" },
  { id: "both", label: "Both", icon: "⊕" },
];

function ProgressRing({ pct }: { pct: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={90} height={90} viewBox="0 0 90 90">
      <circle cx={45} cy={45} r={r} fill="none" stroke="#efefef" strokeWidth={6} />
      <circle
        cx={45} cy={45} r={r} fill="none"
        stroke={GREEN} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 45 45)"
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text x={45} y={49} textAnchor="middle" dominantBaseline="central"
        style={{ fontFamily: FONT, fontWeight: 700, fontSize: 14, fill: INK }}>
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

export function DeployScreen({ refresh, adTitle }: Props) {
  const [step, setStep] = useState<DeployStep>("configure");
  const [platform, setPlatform] = useState("tiktok");
  const [campaign, setCampaign] = useState(`${adTitle ?? "Creative"} — Refresh`);
  const [budget, setBudget] = useState("150");
  const [schedule, setSchedule] = useState("now");
  const [progress, setProgress] = useState(0);

  const handleDeploy = () => {
    setStep("deploying");
    // Fake deployment progress over ~4s
    let p = 0;
    const id = setInterval(() => {
      p += Math.random() * 22 + 8;
      if (p >= 100) {
        p = 100;
        clearInterval(id);
        setTimeout(() => setStep("live"), 400);
      }
      setProgress(p);
    }, 500);
  };

  if (step === "live") {
    return (
      <div style={{
        marginTop: 28, borderRadius: 20, border: `2px solid ${GREEN}`,
        background: `${GREEN}08`, padding: "28px 24px", textAlign: "center",
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🚀</div>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: 18, color: GREEN, marginBottom: 6 }}>
          Ad is live!
        </p>
        <p style={{ fontFamily: FONT, fontSize: 13, color: MUTED, marginBottom: 20 }}>
          {campaign} is now running on {PLATFORMS.find(p => p.id === platform)?.label ?? platform}.
        </p>
        <div
          style={{
            display: "inline-flex", gap: 24, padding: "14px 24px",
            background: "#fff", borderRadius: 14, border: `1.5px solid ${BORDER}`,
          }}
        >
          {[
            { label: "Impressions", value: "—" },
            { label: "Budget", value: `$${budget}/day` },
            { label: "Status", value: "Active" },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <p style={{ fontFamily: FONT, fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{label}</p>
              <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: 14, color: label === "Status" ? GREEN : INK }}>{value}</p>
            </div>
          ))}
        </div>
        <p style={{ fontFamily: FONT, fontSize: 11, color: MUTED, marginTop: 16 }}>
          Performance data will appear within 24 hours.
        </p>
      </div>
    );
  }

  if (step === "deploying") {
    return (
      <div style={{
        marginTop: 28, borderRadius: 20, border: `1.5px solid ${BORDER}`,
        background: "#fafafa", padding: "32px 24px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
      }}>
        <ProgressRing pct={progress} />
        <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14, color: INK }}>
          Deploying to {PLATFORMS.find(p => p.id === platform)?.label}…
        </p>
        <p style={{ fontFamily: FONT, fontSize: 12, color: MUTED }}>
          Uploading creative, setting targeting, scheduling budget.
        </p>
      </div>
    );
  }

  // Configure
  return (
    <div style={{
      marginTop: 28, borderRadius: 20,
      border: `2px solid ${RED}`, background: `${RED}06`, padding: "20px 22px",
    }}>
      <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: 15, color: INK, marginBottom: 18 }}>
        Deploy this refresh
      </p>

      {/* Platform */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontFamily: FONT, fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
          Platform
        </label>
        <div className="flex" style={{ gap: 8 }}>
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlatform(p.id)}
              style={{
                flex: 1, padding: "9px 0",
                fontFamily: FONT, fontSize: 12, fontWeight: platform === p.id ? 700 : 400,
                color: platform === p.id ? "#fff" : INK,
                background: platform === p.id ? INK : "#fff",
                border: `1.5px solid ${platform === p.id ? INK : BORDER}`,
                borderRadius: 10, cursor: "pointer",
              }}
            >
              {p.icon} {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign name */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontFamily: FONT, fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
          Campaign name
        </label>
        <input
          value={campaign}
          onChange={(e) => setCampaign(e.target.value)}
          style={{
            fontFamily: FONT, fontSize: 13, color: INK, width: "100%",
            border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "9px 12px", outline: "none", background: "#fff",
          }}
        />
      </div>

      {/* Budget + Schedule row */}
      <div className="flex" style={{ gap: 12, marginBottom: 22 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontFamily: FONT, fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
            Daily budget ($)
          </label>
          <input
            type="number"
            value={budget}
            min={10}
            onChange={(e) => setBudget(e.target.value)}
            style={{
              fontFamily: FONT, fontSize: 13, color: INK, width: "100%",
              border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "9px 12px", outline: "none", background: "#fff",
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontFamily: FONT, fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
            Schedule
          </label>
          <select
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            style={{
              fontFamily: FONT, fontSize: 13, color: INK, width: "100%",
              border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "9px 12px", outline: "none",
              background: "#fff", appearance: "none",
            }}
          >
            <option value="now">Launch now</option>
            <option value="tomorrow">Tomorrow 9am</option>
            <option value="custom">Custom date</option>
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDeploy}
        className="w-full transition-transform hover:scale-[1.01]"
        style={{
          padding: "14px 0", border: "none", color: "#fff", background: RED,
          fontFamily: FONT, fontWeight: 700, fontSize: 15, borderRadius: 12,
          boxShadow: "0 4px 18px rgba(201,57,26,0.38)", cursor: "pointer",
        }}
      >
        Deploy to {PLATFORMS.find(p => p.id === platform)?.label} →
      </button>
    </div>
  );
}
