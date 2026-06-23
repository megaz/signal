"use client";
import { useCanvas } from "@/hooks/useCanvas";
import { BeatCard } from "./BeatCard";
import { GenerateButton } from "./GenerateButton";

interface Props {
  adId: string;
}

export function BeatCanvas({ adId }: Props) {
  const { beats, loading, teardownRunning, runTeardown, requestFix, acceptFix } = useCanvas(adId);

  const allAccepted = beats.filter((b) => b.health !== "strong").every((b) => b.fix_accepted);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-gray-500">Loading beats...</div>;
  }

  if (beats.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500 text-sm">No beat analysis yet.</p>
        <button
          onClick={() => runTeardown(adId)}
          disabled={teardownRunning}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          {teardownRunning ? "Analyzing..." : "Run teardown"}
        </button>
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
