"use client";
import { useEffect } from "react";
import { useReviewStore } from "@/stores/reviewStore";
import { VideoComparison } from "./VideoComparison";
import { ApprovalPanel } from "./ApprovalPanel";
import { BriefSummary } from "./BriefSummary";

export function ReviewDrop() {
  const { refresh, pollRefresh } = useReviewStore();

  useEffect(() => {
    if (!refresh || refresh.status !== "generating") return;
    const id = setInterval(() => pollRefresh(refresh.ad_id), 5000);
    return () => clearInterval(id);
  }, [refresh, pollRefresh]);

  if (!refresh) {
    return (
      <div className="text-gray-500 text-sm text-center py-24">
        No refreshed cuts pending review. Generate one from the Canvas or Web screen.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {refresh.brief && <BriefSummary brief={refresh.brief} />}
      <VideoComparison refresh={refresh} />
      <ApprovalPanel refresh={refresh} />
    </div>
  );
}
