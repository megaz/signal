"use client";
import { useState, useEffect, useRef } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { reviewService } from "@/services/reviewService";
import { DeployScreen } from "./DeployScreen";
import type { Refresh } from "@/types/review";
import { FONT, INK, BORDER, MUTED } from "@/lib/ui";

interface Props {
  adId: string;
  adTitle?: string;
  adVideoUrl?: string | null;
}

const RED = "#C9391A";
const GREEN = "#66A737";

function buildExtraContext(
  planData: ReturnType<typeof useCanvasStore.getState>["planData"],
  nodeEdits: Record<string, string>,
  brandKit: string
): string {
  const parts: string[] = [];
  if (planData) {
    parts.push(`Strategy: ${planData.strategy}`);
    parts.push(`Rationale: ${planData.rationale}`);
    const edits = Object.entries(nodeEdits);
    if (edits.length > 0) {
      parts.push("Node edits:");
      for (const [id, text] of edits) parts.push(`  - ${id}: ${text}`);
    }
  }
  if (brandKit.trim()) parts.push(`Brand guidelines:\n${brandKit.trim()}`);
  return parts.join("\n");
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 4, borderRadius: 2, background: "#eee", overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${pct}%`, background: RED, borderRadius: 2,
        transition: "width 1.5s ease",
      }} />
    </div>
  );
}

function SideBySide({ adId, refresh, adTitle, adVideoUrl, onApprove, onReject }: {
  adId: string;
  refresh: Refresh;
  adTitle?: string;
  adVideoUrl?: string | null;
  onApprove: (approved: Refresh) => void;
  onReject: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [acting, setActing] = useState(false);

  const handleApprove = async () => {
    setActing(true);
    const updated = await reviewService.approve(refresh.id, notes || undefined);
    onApprove(updated);
  };

  const handleReject = async () => {
    if (!notes.trim()) return;
    setActing(true);
    await reviewService.reject(refresh.id, notes);
    onReject();
  };

  return (
    <div style={{ marginTop: 24 }}>
      <p style={{
        fontFamily: FONT, fontSize: 11, color: MUTED, marginBottom: 10,
        textTransform: "uppercase", letterSpacing: "0.04em",
      }}>
        Side-by-side comparison
      </p>

      <div className="flex" style={{ gap: 16, marginBottom: 16 }}>
        {/* Original video */}
        <div style={{
          flex: 1, borderRadius: 14, border: `1.5px solid ${BORDER}`,
          background: "#f6f6f6", height: 200, overflow: "hidden", position: "relative",
        }}>
          {adVideoUrl ? (
            <video
              src={adVideoUrl}
              controls
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div className="flex items-center justify-center" style={{ height: "100%" }}>
              <span style={{ fontFamily: FONT, fontSize: 12, color: MUTED }}>Original</span>
            </div>
          )}
          <span style={{
            position: "absolute", top: 8, left: 8,
            fontFamily: FONT, fontSize: 10, fontWeight: 700, color: MUTED,
            background: "#ebebeb", borderRadius: 6, padding: "2px 7px",
          }}>BEFORE</span>
        </div>

        {/* Generated video */}
        <div style={{
          flex: 1, borderRadius: 14, border: `1.5px solid ${BORDER}`,
          background: "#f0f5ff", height: 200, overflow: "hidden", position: "relative",
        }}>
          {refresh.video_url ? (
            <video
              src={refresh.video_url}
              controls
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div className="flex items-center justify-center" style={{ height: "100%" }}>
              <span style={{ fontFamily: FONT, fontSize: 12, color: MUTED }}>Rendering…</span>
            </div>
          )}
          <span style={{
            position: "absolute", top: 8, left: 8,
            fontFamily: FONT, fontSize: 10, fontWeight: 700, color: "#fff",
            background: RED, borderRadius: 6, padding: "2px 7px",
          }}>NEW</span>
        </div>
      </div>

      {/* Notes */}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Reviewer notes (required to reject)…"
        rows={2}
        style={{
          fontFamily: FONT, fontSize: 12, color: INK, width: "100%", marginBottom: 10,
          border: `1.5px solid ${BORDER}`, borderRadius: 10,
          padding: "8px 10px", resize: "none", outline: "none",
        }}
      />

      {/* Actions */}
      <div className="flex" style={{ gap: 10 }}>
        <button
          type="button"
          onClick={handleReject}
          disabled={acting || !notes.trim()}
          style={{
            flex: 1, padding: "11px 0", border: `1.5px solid ${BORDER}`,
            borderRadius: 10, fontFamily: FONT, fontWeight: 600, fontSize: 13,
            color: MUTED, background: "#fff",
            cursor: acting || !notes.trim() ? "not-allowed" : "pointer",
            opacity: acting || !notes.trim() ? 0.5 : 1,
          }}
        >
          Reject
        </button>
        <button
          type="button"
          onClick={handleApprove}
          disabled={acting}
          style={{
            flex: 2, padding: "11px 0", border: "none",
            borderRadius: 10, fontFamily: FONT, fontWeight: 700, fontSize: 13,
            color: "#fff", background: GREEN, cursor: acting ? "not-allowed" : "pointer",
            opacity: acting ? 0.5 : 1, boxShadow: "0 3px 12px rgba(102,167,55,0.35)",
          }}
        >
          {acting ? "Saving…" : "Approve →"}
        </button>
      </div>
    </div>
  );
}

export function GenerateButton({ adId, adTitle, adVideoUrl }: Props) {
  const { planData, nodeEdits, brandKit } = useCanvasStore();
  const [refresh, setRefresh] = useState<Refresh | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [approved, setApproved] = useState<Refresh | null>(null);

  // Clean up intervals on unmount
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => {
    if (progressRef.current) clearInterval(progressRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setRefresh(null);
    setProgress(5);

    progressRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 7 + 2, 88));
    }, 1800);

    const extraContext = buildExtraContext(planData, nodeEdits, brandKit);
    const result = await reviewService.triggerGeneration(adId, extraContext || undefined);
    setRefresh(result);

    // Poll until ready (max 90s = 45 × 2s)
    let ticks = 0;
    pollRef.current = setInterval(async () => {
      ticks++;
      try {
        const updated = await reviewService.getRefresh(adId);
        setRefresh(updated);
        if (
          updated.status === "ready" ||
          updated.status === "approved" ||
          updated.status === "rejected" ||
          ticks > 45
        ) {
          clearInterval(pollRef.current!);
          clearInterval(progressRef.current!);
          setProgress(100);
          setGenerating(false);
        }
      } catch {
        // ignore poll errors
      }
    }, 2000);
  };

  // Show deploy screen after approval
  if (approved) {
    return <DeployScreen refresh={approved} adTitle={adTitle ?? "Refreshed Creative"} />;
  }

  return (
    <div style={{ marginTop: 28 }}>
      {/* Ready banner */}
      <div className="flex items-center" style={{
        gap: 8, padding: "10px 14px",
        background: `${GREEN}10`, border: `1.5px solid ${GREEN}40`,
        borderRadius: 12, marginBottom: 14,
      }}>
        <span style={{ width: 7, height: 7, borderRadius: 4, background: GREEN }} />
        <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 13, color: INK }}>
          All weak beats fixed — ready to generate the refreshed creative.
        </span>
      </div>

      {!refresh && !generating && (
        <button
          type="button"
          onClick={handleGenerate}
          className="w-full transition-transform hover:scale-[1.01]"
          style={{
            padding: "14px 0", border: "none", color: "#fff", background: RED,
            fontFamily: FONT, fontWeight: 700, fontSize: 15, borderRadius: 12,
            boxShadow: "0 4px 18px rgba(201,57,26,0.38)", cursor: "pointer",
          }}
        >
          Generate refresh →
        </button>
      )}

      {generating && (
        <div style={{ marginBottom: refresh ? 0 : 12 }}>
          <p style={{ fontFamily: FONT, fontSize: 12, color: MUTED, marginBottom: 6 }}>
            Luma is generating your creative…
          </p>
          <ProgressBar pct={progress} />
        </div>
      )}

      {refresh && !generating && (
        <SideBySide
          adId={adId}
          refresh={refresh}
          adTitle={adTitle}
          adVideoUrl={adVideoUrl}
          onApprove={(updated) => setApproved(updated)}
          onReject={() => { setRefresh(null); setProgress(0); }}
        />
      )}
    </div>
  );
}
