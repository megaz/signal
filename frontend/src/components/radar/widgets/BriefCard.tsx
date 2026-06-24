import { WidgetFrame, MetricChips, AlertList, StrategyList, SectionLabel, Narrative, WIDGET_LABEL } from "./parts";
import type { RadarBrief } from "@/types/radar";

export function BriefCard({ brief }: { brief: RadarBrief }) {
  return (
    <WidgetFrame label={WIDGET_LABEL.creative_brief} title={brief.title}>
      <Narrative text={brief.narrative} />
      <SectionLabel>Signals</SectionLabel>
      <MetricChips metrics={brief.metrics} />
      <SectionLabel>What we’re seeing</SectionLabel>
      <AlertList alerts={brief.alerts} />
      <SectionLabel>Recommended strategy</SectionLabel>
      <StrategyList strategy={brief.strategy} />
    </WidgetFrame>
  );
}
