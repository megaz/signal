export type WidgetType =
  | "genome_map"
  | "saturation_chart"
  | "opportunity_scorecard"
  | "competitor_matrix"
  | "creative_brief"
  | "luma_concepts";

export interface RadarMetric {
  label: string;
  value: string;
}

export interface RadarAlert {
  level: string;
  text: string;
}

export interface RadarActionPayload {
  widget: WidgetType;
}

export interface RadarAction {
  type: string;
  payload: RadarActionPayload;
}

export interface RadarEditSuggestion {
  id: string;
  title: string;
  description: string;
  action: RadarAction;
}

export interface RadarBrief {
  title: string;
  narrative: string;
  metrics: RadarMetric[];
  alerts: RadarAlert[];
  strategy: string[];
}

export interface RadarBackendTrace {
  mode: string;
  inputs: string[];
  pipeline: string[];
  assumptions: string[];
  confidence: string;
  output: string;
}

export interface RadarResponse {
  text: string;
  thinking: string[];
  widget: WidgetType;
  brief: RadarBrief;
  backendTrace: RadarBackendTrace;
  suggestions: string[];
  editSuggestions: RadarEditSuggestion[];
}

export interface RadarChatRequest {
  prompt: string;
  brand?: string;
  category?: string;
  meta_signals?: string[];
  campaign_context?: string;
}

export interface RadarChatEnvelope {
  ok: boolean;
  source: string;
  mode: "live" | "fallback";
  result: RadarResponse;
}
