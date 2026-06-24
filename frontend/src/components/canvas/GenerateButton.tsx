"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useReviewStore } from "@/stores/reviewStore";
import { briefService } from "@/services/briefService";
import type { CreativeBrief } from "@/types/brief";
import { BriefSummary } from "@/components/review/BriefSummary";

interface Props {
  adId: string;
}

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
    <div className="mt-8 max-w-2xl mx-auto space-y-4">
      {showBrief && brief && <BriefSummary brief={brief} />}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handlePreviewBrief}
          disabled={previewLoading}
          className="flex-1 py-3 border border-gray-700 hover:border-gray-500 disabled:opacity-50 text-gray-200 font-medium rounded-xl transition-colors"
        >
          {previewLoading ? "Building brief..." : "Preview performance brief"}
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
        >
          {loading ? "Generating..." : "Generate with Luma"}
        </button>
      </div>
    </div>
  );
}
