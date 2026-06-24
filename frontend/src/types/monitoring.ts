import type { AdNode } from "@/types/ad";

export interface MetricPoint {
  date: string;
  health_score: number;
  spend: number;
  impressions: number;
  ctr: number;
  frequency: number;
  cpa: number;
}

export interface TimeseriesOut {
  range: string;
  points: MetricPoint[];
}

export interface KpiTile {
  key: string;
  label: string;
  value: number;
  unit: string;          // "$" | "%" | "x" | ""
  delta_pct: number | null;
  sparkline: number[];
}

export interface MonitoringAlert {
  ad_id: string;
  ad_title: string | null;
  severity: string;      // "warning" | "critical"
  health: string;
  text: string;
}

export interface MonitoringOverview {
  range: string;
  total: number;
  health_breakdown: Record<string, number>;
  kpis: KpiTile[];
  alerts: MonitoringAlert[];
}

export interface CreativeRow {
  ad: AdNode;
  spend: number;
  ctr: number;
  frequency: number;
  cpa: number;
  delta_pct: number | null;
  sparkline: number[];
}

export interface CreativesOut {
  range: string;
  creatives: CreativeRow[];
}
