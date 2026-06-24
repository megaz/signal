import { FONT, BORDER, MUTED } from "@/lib/ui";
import type { RadarMetric, RadarAlert, WidgetType } from "@/types/radar";

export const WIDGET_LABEL: Record<WidgetType, string> = {
  genome_map: "Genome Map",
  saturation_chart: "Saturation",
  opportunity_scorecard: "Opportunity Scorecard",
  competitor_matrix: "Competitor Matrix",
  creative_brief: "Creative Brief",
  luma_concepts: "Luma Concepts",
};

export function parseMetric(value: string): number {
  const n = parseFloat(value.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

const ALERT_COLOR: Record<string, string> = {
  saturation: "#C9391A",
  opportunity: "#66A737",
  risk: "#D9531F",
};
export function alertColor(level: string): string {
  return ALERT_COLOR[level.toLowerCase()] ?? "#D9531F";
}

/** Card frame shared by all widgets. */
export function WidgetFrame({
  label,
  title,
  children,
}: {
  label: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ border: `2px solid ${BORDER}`, borderRadius: 16, padding: 16, background: "#fff" }}>
      <div className="flex items-center" style={{ gap: 8, marginBottom: title ? 4 : 12 }}>
        <span
          style={{
            fontFamily: FONT, fontSize: 11, fontWeight: 500, color: "#fff", background: "#000",
            borderRadius: 12, padding: "3px 10px", letterSpacing: "0.02em",
          }}
        >
          {label}
        </span>
      </div>
      {title && (
        <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 18, color: "#000", marginBottom: 12 }}>{title}</div>
      )}
      {children}
    </div>
  );
}

export function MetricChips({ metrics }: { metrics: RadarMetric[] }) {
  return (
    <div className="flex flex-wrap" style={{ gap: 8 }}>
      {metrics.map((m, i) => (
        <div
          key={i}
          className="flex flex-col"
          style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: "8px 12px", minWidth: 110 }}
        >
          <span style={{ fontFamily: FONT, fontSize: 11, color: MUTED }}>{m.label}</span>
          <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 20, color: "#000" }}>{m.value}</span>
        </div>
      ))}
    </div>
  );
}

export function AlertList({ alerts }: { alerts: RadarAlert[] }) {
  if (!alerts.length) return null;
  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      {alerts.map((a, i) => {
        const color = alertColor(a.level);
        return (
          <div key={i} className="flex items-start" style={{ gap: 10 }}>
            <span
              style={{
                fontFamily: FONT, fontSize: 11, fontWeight: 600, color, border: `1px solid ${color}`,
                borderRadius: 10, padding: "2px 8px", flexShrink: 0, marginTop: 1,
              }}
            >
              {a.level}
            </span>
            <span style={{ fontFamily: FONT, fontSize: 13, color: "#000", lineHeight: 1.45 }}>{a.text}</span>
          </div>
        );
      })}
    </div>
  );
}

export function StrategyList({ strategy }: { strategy: string[] }) {
  if (!strategy.length) return null;
  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      {strategy.map((s, i) => (
        <div key={i} className="flex items-start" style={{ gap: 10 }}>
          <span
            className="flex items-center justify-center flex-none"
            style={{ width: 20, height: 20, borderRadius: 10, background: "#000", color: "#fff", fontFamily: FONT, fontSize: 11, marginTop: 1 }}
          >
            {i + 1}
          </span>
          <span style={{ fontFamily: FONT, fontSize: 14, color: "#000", lineHeight: 1.45 }}>{s}</span>
        </div>
      ))}
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: MUTED, margin: "14px 0 8px" }}>{children}</div>
  );
}

export function Narrative({ text }: { text: string }) {
  return <p style={{ fontFamily: FONT, fontSize: 14, color: "#000", lineHeight: 1.5, margin: 0 }}>{text}</p>;
}
