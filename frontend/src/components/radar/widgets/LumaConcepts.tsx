import { WidgetFrame, Narrative, SectionLabel, WIDGET_LABEL } from "./parts";
import { FONT, BORDER, MUTED } from "@/lib/ui";
import type { RadarBrief } from "@/types/radar";

export function LumaConcepts({ brief }: { brief: RadarBrief }) {
  const concepts = brief.strategy.length ? brief.strategy : ["Concept direction pending."];
  return (
    <WidgetFrame label={WIDGET_LABEL.luma_concepts} title={brief.title}>
      <Narrative text={brief.narrative} />
      <SectionLabel>Luma-ready concepts</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {concepts.map((c, i) => (
          <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
            <div
              className="flex items-end"
              style={{ height: 96, background: `linear-gradient(135deg, #bcbce5, #8a8bc7)`, padding: 10 }}
            >
              <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: "#fff" }}>Concept {i + 1}</span>
            </div>
            <div style={{ padding: 12 }}>
              <span style={{ fontFamily: FONT, fontSize: 13, color: "#000", lineHeight: 1.45 }}>{c}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: FONT, fontSize: 12, color: MUTED, marginTop: 10 }}>
        Concepts are generation-ready prompts for Luma.
      </div>
    </WidgetFrame>
  );
}
