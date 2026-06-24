import { WidgetFrame, MetricChips, Narrative, SectionLabel, WIDGET_LABEL, alertColor } from "./parts";
import { FONT, BORDER, MUTED } from "@/lib/ui";
import type { RadarBrief } from "@/types/radar";

export function CompetitorMatrix({ brief }: { brief: RadarBrief }) {
  return (
    <WidgetFrame label={WIDGET_LABEL.competitor_matrix} title={brief.title}>
      <Narrative text={brief.narrative} />
      <SectionLabel>Field map</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {brief.alerts.map((a, i) => {
          const color = alertColor(a.level);
          return (
            <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, borderTop: `4px solid ${color}` }}>
              <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color }}>{a.level}</span>
              <p style={{ fontFamily: FONT, fontSize: 13, color: "#000", lineHeight: 1.45, margin: "6px 0 0" }}>{a.text}</p>
            </div>
          );
        })}
      </div>
      <SectionLabel>Where we stand</SectionLabel>
      <MetricChips metrics={brief.metrics} />
    </WidgetFrame>
  );
}
