"use client";
import { useReviewStore } from "@/stores/reviewStore";
import { VideoComparison } from "./VideoComparison";
import { ApprovalPanel } from "./ApprovalPanel";

export function ReviewDrop() {
  const { refresh } = useReviewStore();

  if (!refresh) {
    return (
      <div className="text-gray-500 text-sm text-center py-24">
        No refreshed cuts pending review. Accept fixes on the Canvas to generate one.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <VideoComparison refresh={refresh} />
      <ApprovalPanel refresh={refresh} />
    </div>
  );
}
