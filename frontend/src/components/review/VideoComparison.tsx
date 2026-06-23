"use client";
import type { Refresh } from "@/types/review";

interface Props {
  refresh: Refresh;
}

export function VideoComparison({ refresh }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Original</p>
        <div className="aspect-[9/16] bg-gray-800 rounded-xl flex items-center justify-center text-gray-600 text-sm">
          Original cut
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Refreshed</p>
        <div className="aspect-[9/16] bg-gray-800 rounded-xl flex items-center justify-center overflow-hidden">
          {refresh.video_url ? (
            <video src={refresh.video_url} controls className="w-full h-full object-cover rounded-xl" />
          ) : (
            <span className="text-gray-600 text-sm">
              {refresh.status === "generating" ? "Generating..." : "No video yet"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
