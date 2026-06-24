import { WidgetFrame, AlertList, Narrative, SectionLabel, WIDGET_LABEL, parseMetric } from "./parts";
import { FONT, MUTED } from "@/lib/ui";
import type { RadarBrief } from "@/types/radar";

export function SaturationChart({ brief }: { brief: RadarBrief }) {
  const max = Math.max(100, ...brief.metrics.map((m) => parseMetric(m.value)));
  return (
    <WidgetFrame label={WIDGET_LABEL.saturation_chart} title={brief.title}>
      <Narrative text={brief.narrative} />
      <SectionLabel>Score breakdown</SectionLabel>
      <div className="flex flex-col" style={{ gap: 10 }}>
        {brief.metrics.map((m, i) => {
          const v = parseMetric(m.value);
          const pct = (v / max) * 100;
          // Higher = more saturated/risk for "Fatigue", else opportunity-positive; color by label.
          const isRisk = /fatigue|saturat|risk/i.test(m.label);
          const color = isRisk ? "#C9391A" : "#66A737";
          return (
            <div key={i}>
              <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                <span style={{ fontFamily: FONT, fontSize: 13, color: "#000" }}>{m.label}</span>
                <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: "#000" }}>{m.value}</span>
              </div>
              <div style={{ height: 10, borderRadius: 6, background: "#f0f0f0", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 6 }} />
              </div>
            </div>
          );
        })}
      </div>
      <SectionLabel>Saturation vs opportunity</SectionLabel>
      <AlertList alerts={brief.alerts} />
    </WidgetFrame>
  );
}
