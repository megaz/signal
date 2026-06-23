"use client";
import { useAdStore } from "@/stores/adStore";
import { HEALTH_COLORS } from "@/lib/constants";
import type { AdHealth } from "@/types/ad";

const LABELS: Record<AdHealth, string> = {
  thriving: "Thriving",
  aging: "Aging",
  fatiguing: "Fatiguing",
  declining: "Declining",
};

interface Props {
  brandId: string;
}

export function StatsBar({ brandId }: Props) {
  const { stats, toggleCompetitors, showCompetitors } = useAdStore();

  if (!stats) return null;

  return (
    <header className="flex items-center gap-6 px-6 py-3 border-b border-gray-800 bg-gray-950/80 backdrop-blur">
      <span className="font-semibold tracking-wider text-sm uppercase text-gray-400">PULSE</span>
      <div className="flex gap-4 ml-2">
        {(Object.entries(stats.health_breakdown) as [AdHealth, number][]).map(([health, count]) => (
          <div key={health} className="flex items-center gap-1.5 text-sm">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ background: HEALTH_COLORS[health] }}
            />
            <span className="text-gray-400">{LABELS[health]}</span>
            <span className="font-medium">{count}</span>
          </div>
        ))}
      </div>
      <div className="ml-auto">
        <button
          onClick={() => toggleCompetitors(brandId)}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            showCompetitors
              ? "border-orange-500 text-orange-400"
              : "border-gray-700 text-gray-500 hover:border-gray-500"
          }`}
        >
          {showCompetitors ? "Hide competitors" : "Show competitors"}
        </button>
      </div>
    </header>
  );
}
