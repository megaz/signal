"use client";
import { useCanvas } from "@/hooks/useCanvas";
import { BeatCard } from "./BeatCard";
import { GenerateButton } from "./GenerateButton";
import { FONT, MUTED } from "@/lib/ui";

interface Props {
  adId: string;
  onAnalysisComplete?: () => void;
}

export function BeatCanvas({ adId, onAnalysisComplete }: Props) {
  const { beats, loading, teardownRunning, requestFix, acceptFix } = useCanvas(adId, onAnalysisComplete);

  const allAccepted = beats.filter((b) => b.health !== "strong").every((b) => b.fix_accepted);

  if (loading || teardownRunning) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: 8, height: 8, borderRadius: 4, background: "#000",
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                opacity: 0.2,
              }}
            />
          ))}
        </div>
        <p style={{ fontFamily: FONT, fontSize: 14, color: MUTED }}>
          {teardownRunning ? "Analyzing your creative…" : "Loading…"}
        </p>
        <style>{`@keyframes pulse { 0%,100%{opacity:0.2} 50%{opacity:1} }`}</style>
      </div>
    );
  }

  if (beats.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p style={{ fontFamily: FONT, fontSize: 14, color: MUTED }}>No beat data available.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="flex flex-col gap-3 max-w-2xl mx-auto">
        {beats.map((beat) => (
          <BeatCard
            key={beat.id}
            beat={beat}
            onRequestFix={() => requestFix(beat.id)}
            onAcceptFix={() => acceptFix(beat.id)}
          />
        ))}
      </div>
      {allAccepted && beats.length > 0 && <GenerateButton adId={adId} />}
    </div>
  );
}
