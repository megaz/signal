import { BriefCard } from "./BriefCard";
import { SaturationChart } from "./SaturationChart";
import { OpportunityScorecard } from "./OpportunityScorecard";
import { CompetitorMatrix } from "./CompetitorMatrix";
import { GenomeMap } from "./GenomeMap";
import { LumaConcepts } from "./LumaConcepts";
import type { RadarBrief, WidgetType } from "@/types/radar";

/** Maps a widget type to its renderer. All are brief-driven (the envelope's only structured payload). */
export function WidgetRenderer({ widget, brief }: { widget: WidgetType; brief: RadarBrief }) {
  switch (widget) {
    case "saturation_chart":
      return <SaturationChart brief={brief} />;
    case "opportunity_scorecard":
      return <OpportunityScorecard brief={brief} />;
    case "competitor_matrix":
      return <CompetitorMatrix brief={brief} />;
    case "genome_map":
      return <GenomeMap brief={brief} />;
    case "luma_concepts":
      return <LumaConcepts brief={brief} />;
    case "creative_brief":
    default:
      return <BriefCard brief={brief} />;
  }
}
