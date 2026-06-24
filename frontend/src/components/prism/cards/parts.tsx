import { FONT, BORDER, MUTED } from "@/lib/ui";
import type { BarTone, CardSeverity } from "@/types/prism";

export const SEVERITY: Record<CardSeverity, { color: string; label: string }> = {
  info: { color: "#3D6FB4", label: "Insight" },
  opportunity: { color: "#66A737", label: "Opportunity" },
  risk: { color: "#C9391A", label: "Risk" },
};

export const TONE_COLOR: Record<BarTone, string> = {
  good: "#66A737",
  warn: "#E28929",
  bad: "#C9391A",
  neutral: "#8a8bc7",
};

/** Outer card frame shared by every Prism card. */
export function CardFrame({
  label,
  labelColor = "#000",
  title,
  children,
}: {
  label?: string;
  labelColor?: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: 16, background: "#fff" }}>
      {label && (
        <div className="flex items-center" style={{ marginBottom: title ? 6 : 12 }}>
          <span
            style={{
              fontFamily: FONT,
              fontSize: 10.5,
              fontWeight: 600,
              color: "#fff",
              background: labelColor,
              borderRadius: 12,
              padding: "3px 10px",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {label}
          </span>
        </div>
      )}
      {title && (
        <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 17, color: "#000", marginBottom: 12, lineHeight: 1.3 }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

export function num(value: string | number): number {
  if (typeof value === "number") return value;
  const n = parseFloat(String(value).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export { FONT, BORDER, MUTED };
