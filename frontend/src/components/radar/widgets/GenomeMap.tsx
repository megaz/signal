import { WidgetFrame, Narrative, SectionLabel, WIDGET_LABEL, parseMetric } from "./parts";
import { FONT, BORDER, MUTED } from "@/lib/ui";
import type { RadarBrief } from "@/types/radar";

/** Brief-driven creative-DNA cluster (no genome data in the envelope yet — visualizes metrics + strategy). */
export function GenomeMap({ brief }: { brief: RadarBrief }) {
  return (
    <WidgetFrame label={WIDGET_LABEL.genome_map} title={brief.title}>
      <Narrative text={brief.narrative} />
      <SectionLabel>Creative DNA</SectionLabel>
      <div className="flex items-center justify-center" style={{ position: "relative", minHeight: 180, flexWrap: "wrap", gap: 12, padding: 8 }}>
        <div
          className="flex items-center justify-center flex-none"
          style={{ width: 96, height: 96, borderRadius: 48, background: "#000", color: "#fff", fontFamily: FONT, fontWeight: 600, fontSize: 13, textAlign: "center", padding: 8 }}
        >
          Genome
        </div>
        {brief.strategy.map((s, i) => (
          <div
            key={i}
            className="flex items-center"
            style={{ border: `1px solid ${BORDER}`, borderRadius: 20, padding: "8px 14px", maxWidth: 260 }}
          >
            <span style={{ width: 7, height: 7, borderRadius: 4, background: "#8a8bc7", marginRight: 8, flexShrink: 0 }} />
            <span style={{ fontFamily: FONT, fontSize: 13, color: "#000" }}>{s}</span>
          </div>
        ))}
      </div>
      <SectionLabel>Strength signals</SectionLabel>
      <div className="flex flex-wrap" style={{ gap: 8 }}>
        {brief.metrics.map((m, i) => {
          const v = parseMetric(m.value);
          return (
            <span key={i} style={{ fontFamily: FONT, fontSize: 12, color: "#000", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "5px 10px" }}>
              {m.label}: <strong>{v}</strong>
            </span>
          );
        })}
      </div>
    </WidgetFrame>
  );
}
