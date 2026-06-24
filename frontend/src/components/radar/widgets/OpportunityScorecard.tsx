import { WidgetFrame, StrategyList, Narrative, SectionLabel, WIDGET_LABEL, parseMetric } from "./parts";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { FONT, BORDER, MUTED } from "@/lib/ui";
import type { RadarBrief } from "@/types/radar";

function scoreColor(v: number): string {
  if (v >= 75) return "#66A737";
  if (v >= 50) return "#E28929";
  return "#C9391A";
}

export function OpportunityScorecard({ brief }: { brief: RadarBrief }) {
  return (
    <WidgetFrame label={WIDGET_LABEL.opportunity_scorecard} title={brief.title}>
      <Narrative text={brief.narrative} />
      <SectionLabel>Scorecard</SectionLabel>
      <div className="flex flex-wrap" style={{ gap: 12 }}>
        {brief.metrics.map((m, i) => {
          const v = parseMetric(m.value);
          return (
            <div
              key={i}
              className="flex items-center"
              style={{ gap: 12, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "12px 14px", minWidth: 200, flex: "1 1 200px" }}
            >
              <ScoreRing value={v / 100} color={scoreColor(v)} size={48} />
              <span style={{ fontFamily: FONT, fontSize: 13, color: "#000" }}>{m.label}</span>
            </div>
          );
        })}
      </div>
      <SectionLabel>Next moves</SectionLabel>
      <StrategyList strategy={brief.strategy} />
    </WidgetFrame>
  );
}
