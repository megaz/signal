"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useReviewStore } from "@/stores/reviewStore";
import { briefService } from "@/services/briefService";
import type { CreativeBrief } from "@/types/brief";
import { BriefSummary } from "@/components/review/BriefSummary";
import { FONT, INK, BORDER } from "@/lib/ui";

interface Props {
  adId: string;
}

const RED = "#C9391A";

export function GenerateButton({ adId }: Props) {
  const { startGeneration, loading } = useReviewStore();
  const router = useRouter();
  const [brief, setBrief] = useState<CreativeBrief | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showBrief, setShowBrief] = useState(false);

  const handlePreviewBrief = async () => {
    setPreviewLoading(true);
    try {
      const data = await briefService.getBrief(adId);
      setBrief(data);
      setShowBrief(true);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleGenerate = async () => {
    await startGeneration(adId);
    router.push("/review");
  };

  return (
    <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 16 }}>
      {showBrief && brief && <BriefSummary brief={brief} />}

      {/* All beats fixed — ready to ship the refresh */}
      <div
        className="flex items-center"
        style={{ gap: 8, padding: "10px 14px", background: `${"#66A737"}10`, border: `1.5px solid ${"#66A737"}40`, borderRadius: 12 }}
      >
        <span style={{ width: 7, height: 7, borderRadius: 4, background: "#66A737" }} />
        <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 13, color: INK }}>
          All weak beats fixed — ready to generate the refreshed creative.
        </span>
      </div>

      <div className="flex" style={{ gap: 12 }}>
        <button
          type="button"
          onClick={handlePreviewBrief}
          disabled={previewLoading}
          className="flex-1 transition-colors disabled:opacity-50"
          style={{
            padding: "12px 0",
            border: `1.5px solid ${BORDER}`,
            color: INK,
            background: "#fff",
            fontFamily: FONT,
            fontWeight: 600,
            fontSize: 14,
            borderRadius: 12,
          }}
        >
          {previewLoading ? "Building brief…" : "Preview performance brief"}
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="flex-1 transition-transform hover:scale-[1.01] disabled:opacity-50"
          style={{
            padding: "12px 0",
            border: "none",
            color: "#fff",
            background: RED,
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 14,
            borderRadius: 12,
            boxShadow: "0 4px 16px rgba(201,57,26,0.4)",
          }}
        >
          {loading ? "Generating…" : "Generate refresh →"}
        </button>
      </div>
    </div>
  );
}
