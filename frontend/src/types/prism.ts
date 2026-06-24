// ─── Prism card contract (mirrors the backend render_cards tool schema) ───

export type CardSeverity = "info" | "opportunity" | "risk";
export type BarTone = "good" | "warn" | "bad" | "neutral";

export interface MetricItem {
  label: string;
  value: string | number;
  delta?: string;
}
export interface BarItem {
  label: string;
  value: number; // 0–100
  tone?: BarTone;
}
export interface ComparisonRow {
  name: string;
  cells: string[];
}
export interface BriefAlert {
  level: string;
  text: string;
}
export interface ConceptItem {
  title: string;
  description: string;
  gradient?: string;
}
export interface SourceItem {
  url: string;
  title?: string;
  domain?: string;
}
export interface ActionPayload {
  prompt?: string;
  href?: string;
}

export interface InsightCard {
  type: "insight";
  title?: string;
  body?: string;
  severity?: CardSeverity;
}
export interface MetricsCard {
  type: "metrics";
  title?: string;
  items: MetricItem[];
}
export interface ChartCard {
  type: "chart";
  title?: string;
  bars: BarItem[];
}
export interface ComparisonCard {
  type: "comparison";
  title?: string;
  columns: string[];
  rows: ComparisonRow[];
}
export interface ActionCard {
  type: "action";
  title?: string;
  description?: string;
  cta?: string;
  payload?: ActionPayload;
}
export interface ImageCard {
  type: "image";
  url: string;
  caption?: string;
  source?: string;
}
export interface BriefCardData {
  type: "brief";
  title?: string;
  narrative?: string;
  metrics?: MetricItem[];
  alerts?: BriefAlert[];
  strategy?: string[];
}
export interface ConceptsCard {
  type: "concepts";
  title?: string;
  items: ConceptItem[];
}
export interface SourcesCard {
  type: "sources";
  title?: string;
  items: SourceItem[];
}

export type PrismCard =
  | InsightCard
  | MetricsCard
  | ChartCard
  | ComparisonCard
  | ActionCard
  | ImageCard
  | BriefCardData
  | ConceptsCard
  | SourcesCard;

// ─── Streamed research signals ───

export interface PrismSource {
  url: string;
  title?: string;
  domain?: string;
  page_age?: string | null;
}
export interface PrismCitation {
  url?: string;
  title?: string;
  domain?: string;
  cited_text?: string;
}

// ─── Request + message state ───

export interface PrismTurn {
  role: "user" | "assistant";
  text: string;
}

export interface PrismChatBody {
  prompt: string;
  brand?: string;
  category?: string;
  campaign_context?: string;
  history?: PrismTurn[];
}

export type PrismPhase = "thinking" | "researching" | "writing" | "done";

export interface PrismMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  phase?: PrismPhase;
  thinking?: string;
  searches?: string[];
  sources?: PrismSource[];
  citations?: PrismCitation[];
  cards?: PrismCard[];
  suggestions?: string[];
  error?: { code?: string; message?: string };
}
