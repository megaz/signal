import { healthToLight, HEALTH_LABELS } from "@/lib/constants";
import { FONT } from "@/lib/ui";
import type { AdHealth } from "@/types/ad";

/** Colored-dot + label health pill, light theme. */
export function HealthBadge({ health, size = "md" }: { health: AdHealth; size?: "sm" | "md" }) {
  const color = healthToLight(health);
  const fs = size === "sm" ? 11 : 13;
  const dot = size === "sm" ? 7 : 8;
  return (
    <span className="inline-flex items-center" style={{ gap: 6 }}>
      <span style={{ width: dot, height: dot, borderRadius: dot, background: color, flexShrink: 0 }} />
      <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: fs, color }}>{HEALTH_LABELS[health]}</span>
    </span>
  );
}
