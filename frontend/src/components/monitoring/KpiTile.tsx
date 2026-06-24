import { Sparkline } from "./Sparkline";
import { FONT, BORDER, MUTED } from "@/lib/ui";
import { formatCompact } from "@/lib/format";
import type { KpiTile as KpiTileT } from "@/types/monitoring";

const GREEN = "#66A737";
const RED = "#C9391A";

function formatValue(t: KpiTileT): string {
  if (t.unit === "$") return "$" + formatCompact(t.value);
  if (t.unit === "%") return `${t.value}%`;
  if (t.unit === "x") return `${t.value}x`;
  return formatCompact(t.value);
}

/** goodDirection: which way is "good" for the delta to color it. undefined = neutral. */
export function KpiTile({ tile, goodDirection }: { tile: KpiTileT; goodDirection?: "up" | "down" }) {
  const delta = tile.delta_pct;
  let deltaColor = MUTED;
  if (delta != null && goodDirection) {
    const isUp = delta >= 0;
    const good = (isUp && goodDirection === "up") || (!isUp && goodDirection === "down");
    deltaColor = good ? GREEN : RED;
  }

  return (
    <div
      className="flex flex-col"
      style={{ border: `2px solid ${BORDER}`, borderRadius: 18, padding: 16, background: "#fff", minWidth: 0 }}
    >
      <span style={{ fontFamily: FONT, fontSize: 13, color: MUTED }}>{tile.label}</span>
      <div className="flex items-baseline" style={{ gap: 8, marginTop: 4 }}>
        <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 28, color: "#000", lineHeight: 1 }}>
          {formatValue(tile)}
        </span>
        {delta != null && (
          <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 13, color: deltaColor }}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
          </span>
        )}
      </div>
      <div style={{ marginTop: 12 }}>
        <Sparkline values={tile.sparkline} width={180} height={30} color={deltaColor === MUTED ? "#9aa0a6" : deltaColor} />
      </div>
    </div>
  );
}
