"use client";
import { useState } from "react";
import { useReviewStore } from "@/stores/reviewStore";
import type { Refresh } from "@/types/review";

interface Props {
  refresh: Refresh;
}

export function ApprovalPanel({ refresh }: Props) {
  const { approve, reject } = useReviewStore();
  const [notes, setNotes] = useState("");

  if (refresh.status === "approved" || refresh.status === "shipped") {
    return (
      <div className="p-4 rounded-xl bg-green-900/30 border border-green-700/50 text-sm text-green-300">
        Approved {refresh.status === "shipped" && "and sent to Slack"}. Notes: {refresh.reviewer_notes || "—"}
      </div>
    );
  }

  if (refresh.status === "rejected") {
    return (
      <div className="p-4 rounded-xl bg-red-900/30 border border-red-700/50 text-sm text-red-300">
        Rejected. Notes: {refresh.reviewer_notes}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Reviewer notes (optional)..."
        rows={3}
        className="w-full bg-gray-800 text-sm rounded-xl px-4 py-3 placeholder:text-gray-600 outline-none focus:ring-1 focus:ring-orange-500 resize-none"
      />
      <div className="flex gap-3">
        <button
          onClick={() => approve(notes)}
          disabled={refresh.status !== "ready"}
          className="flex-1 py-2.5 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
        >
          Approve &amp; send to Slack
        </button>
        <button
          onClick={() => reject(notes || "Rejected")}
          disabled={refresh.status !== "ready"}
          className="flex-1 py-2.5 border border-red-700/60 hover:bg-red-900/30 disabled:opacity-40 text-red-400 text-sm font-medium rounded-xl transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
