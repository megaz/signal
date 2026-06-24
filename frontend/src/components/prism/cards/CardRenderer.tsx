"use client";

import Link from "next/link";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { SourceChip } from "@/components/prism/SourceChip";
import { CardFrame, FONT, BORDER, MUTED, SEVERITY, TONE_COLOR, num } from "./parts";
import type {
  ActionCard,
  BriefCardData,
  ChartCard,
  ComparisonCard,
  ConceptsCard,
  ImageCard,
  InsightCard,
  MetricItem,
  MetricsCard,
  PrismCard,
  SourcesCard,
} from "@/types/prism";

const ALERT_COLOR: Record<string, string> = {
  saturation: "#C9391A",
  opportunity: "#66A737",
  risk: "#D9531F",
  warning: "#E28929",
};
const alertColor = (level: string) => ALERT_COLOR[level.toLowerCase()] ?? "#3D6FB4";

function MetricGrid({ items }: { items: MetricItem[] }) {
  return (
    <div className="flex flex-wrap" style={{ gap: 8 }}>
      {items.map((m, i) => (
        <div
          key={i}
          className="flex flex-col"
          style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: "8px 12px", minWidth: 104 }}
        >
          <span style={{ fontFamily: FONT, fontSize: 11, color: MUTED }}>{m.label}</span>
          <span className="flex items-baseline" style={{ gap: 6 }}>
            <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 20, color: "#000" }}>{m.value}</span>
            {m.delta && (
              <span style={{ fontFamily: FONT, fontSize: 12, color: m.delta.trim().startsWith("-") ? "#C9391A" : "#66A737" }}>
                {m.delta}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

function Insight({ card }: { card: InsightCard }) {
  const sev = SEVERITY[card.severity ?? "info"];
  return (
    <CardFrame label={sev.label} labelColor={sev.color} title={card.title}>
      {card.body && <p style={{ fontFamily: FONT, fontSize: 14, color: "#000", lineHeight: 1.55, margin: 0 }}>{card.body}</p>}
    </CardFrame>
  );
}

function Metrics({ card }: { card: MetricsCard }) {
  return (
    <CardFrame label="Metrics" title={card.title}>
      <MetricGrid items={card.items ?? []} />
    </CardFrame>
  );
}

function Chart({ card }: { card: ChartCard }) {
  const bars = card.bars ?? [];
  return (
    <CardFrame label="Signal" title={card.title}>
      <div className="flex flex-col" style={{ gap: 10 }}>
        {bars.map((b, i) => {
          const v = Math.max(0, Math.min(100, num(b.value)));
          const color = TONE_COLOR[b.tone ?? "neutral"];
          return (
            <div key={i}>
              <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                <span style={{ fontFamily: FONT, fontSize: 13, color: "#000" }}>{b.label}</span>
                <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color }}>{v}</span>
              </div>
              <div style={{ height: 8, borderRadius: 6, background: "#f0f0f0", overflow: "hidden" }}>
                <div style={{ width: `${v}%`, height: "100%", background: color, borderRadius: 6, transition: "width 0.4s ease" }} />
              </div>
            </div>
          );
        })}
      </div>
    </CardFrame>
  );
}

function Comparison({ card }: { card: ComparisonCard }) {
  const columns = card.columns ?? [];
  const rows = card.rows ?? [];
  return (
    <CardFrame label="Comparison" title={card.title}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: FONT, fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "6px 10px", borderBottom: `1.5px solid ${BORDER}` }} />
              {columns.map((c, i) => (
                <th key={i} style={{ textAlign: "left", padding: "6px 10px", borderBottom: `1.5px solid ${BORDER}`, fontWeight: 600 }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={{ padding: "6px 10px", borderBottom: `1px solid ${BORDER}`, fontWeight: 500 }}>{r.name}</td>
                {(r.cells ?? []).map((cell, j) => (
                  <td key={j} style={{ padding: "6px 10px", borderBottom: `1px solid ${BORDER}`, color: "rgba(0,0,0,0.7)" }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardFrame>
  );
}

function Action({ card, onAsk }: { card: ActionCard; onAsk: (p: string) => void }) {
  const { payload } = card;
  const btnStyle: React.CSSProperties = {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: 500,
    color: "#fff",
    background: "#000",
    borderRadius: 20,
    padding: "8px 16px",
    border: "none",
    cursor: "pointer",
    display: "inline-block",
    textDecoration: "none",
  };
  return (
    <CardFrame label="Action" labelColor="#3D6FB4" title={card.title}>
      {card.description && (
        <p style={{ fontFamily: FONT, fontSize: 14, color: "rgba(0,0,0,0.7)", lineHeight: 1.5, margin: "0 0 12px" }}>
          {card.description}
        </p>
      )}
      {card.cta &&
        (payload?.href ? (
          <Link href={payload.href} style={btnStyle}>
            {card.cta} →
          </Link>
        ) : (
          <button style={btnStyle} onClick={() => payload?.prompt && onAsk(payload.prompt)}>
            {card.cta} →
          </button>
        ))}
    </CardFrame>
  );
}

function Image({ card }: { card: ImageCard }) {
  return (
    <CardFrame label="Reference">
      <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${BORDER}` }}>
        <ImageWithFallback src={card.url} alt={card.caption ?? "reference"} style={{ width: "100%", display: "block", objectFit: "cover" }} />
      </div>
      {(card.caption || card.source) && (
        <div style={{ fontFamily: FONT, fontSize: 12, color: MUTED, marginTop: 8 }}>
          {card.caption}
          {card.source && <span style={{ marginLeft: 6, opacity: 0.7 }}>· {card.source}</span>}
        </div>
      )}
    </CardFrame>
  );
}

function Brief({ card }: { card: BriefCardData }) {
  return (
    <CardFrame label="Creative Brief" title={card.title}>
      {card.narrative && (
        <p style={{ fontFamily: FONT, fontSize: 14, color: "#000", lineHeight: 1.5, margin: "0 0 12px" }}>{card.narrative}</p>
      )}
      {card.metrics?.length ? (
        <div style={{ marginBottom: 12 }}>
          <MetricGrid items={card.metrics} />
        </div>
      ) : null}
      {card.alerts?.length ? (
        <div className="flex flex-col" style={{ gap: 8, marginBottom: 12 }}>
          {card.alerts.map((a, i) => {
            const color = alertColor(a.level);
            return (
              <div key={i} className="flex items-start" style={{ gap: 10 }}>
                <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color, border: `1px solid ${color}`, borderRadius: 10, padding: "2px 8px", flexShrink: 0, marginTop: 1 }}>
                  {a.level}
                </span>
                <span style={{ fontFamily: FONT, fontSize: 13, color: "#000", lineHeight: 1.45 }}>{a.text}</span>
              </div>
            );
          })}
        </div>
      ) : null}
      {card.strategy?.length ? (
        <div className="flex flex-col" style={{ gap: 8 }}>
          {card.strategy.map((s, i) => (
            <div key={i} className="flex items-start" style={{ gap: 10 }}>
              <span className="flex items-center justify-center flex-none" style={{ width: 20, height: 20, borderRadius: 10, background: "#000", color: "#fff", fontFamily: FONT, fontSize: 11, marginTop: 1 }}>
                {i + 1}
              </span>
              <span style={{ fontFamily: FONT, fontSize: 14, color: "#000", lineHeight: 1.45 }}>{s}</span>
            </div>
          ))}
        </div>
      ) : null}
    </CardFrame>
  );
}

function Concepts({ card }: { card: ConceptsCard }) {
  const items = card.items ?? [];
  return (
    <CardFrame label="Concepts" labelColor="#8a8bc7" title={card.title}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        {items.map((c, i) => (
          <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ height: 56, background: c.gradient || "linear-gradient(180deg, #bcbce5 0%, #8a8bc7 100%)" }} />
            <div style={{ padding: 12 }}>
              <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14, color: "#000", marginBottom: 4 }}>{c.title}</div>
              <div style={{ fontFamily: FONT, fontSize: 12.5, color: "rgba(0,0,0,0.65)", lineHeight: 1.45 }}>{c.description}</div>
            </div>
          </div>
        ))}
      </div>
    </CardFrame>
  );
}

function Sources({ card }: { card: SourcesCard }) {
  const items = card.items ?? [];
  return (
    <CardFrame label="Sources" title={card.title}>
      <div className="flex flex-wrap" style={{ gap: 8 }}>
        {items.map((s, i) => (
          <SourceChip key={i} source={s} index={i + 1} />
        ))}
      </div>
    </CardFrame>
  );
}

export function CardRenderer({ card, onAsk }: { card: PrismCard; onAsk: (p: string) => void }) {
  switch (card.type) {
    case "insight":
      return <Insight card={card} />;
    case "metrics":
      return <Metrics card={card} />;
    case "chart":
      return <Chart card={card} />;
    case "comparison":
      return <Comparison card={card} />;
    case "action":
      return <Action card={card} onAsk={onAsk} />;
    case "image":
      return <Image card={card} />;
    case "brief":
      return <Brief card={card} />;
    case "concepts":
      return <Concepts card={card} />;
    case "sources":
      return <Sources card={card} />;
    default:
      return null;
  }
}
