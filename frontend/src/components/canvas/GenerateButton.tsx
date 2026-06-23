"use client";
import { useRouter } from "next/navigation";
import { useReviewStore } from "@/stores/reviewStore";

interface Props {
  adId: string;
}

export function GenerateButton({ adId }: Props) {
  const { startGeneration, loading } = useReviewStore();
  const router = useRouter();

  const handleGenerate = async () => {
    await startGeneration(adId);
    router.push("/review");
  };

  return (
    <div className="mt-8 max-w-2xl mx-auto">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
      >
        {loading ? "Generating refreshed cut..." : "Generate refreshed cut with Luma"}
      </button>
    </div>
  );
}
