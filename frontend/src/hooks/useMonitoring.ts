"use client";

import { useEffect, useState } from "react";
import { monitoringService } from "@/services/monitoringService";
import { DEFAULT_BRAND_ID } from "@/lib/constants";
import type { MonitoringOverview, TimeseriesOut, CreativesOut } from "@/types/monitoring";

export function useMonitoring(range: string, brandId: string = DEFAULT_BRAND_ID) {
  const [overview, setOverview] = useState<MonitoringOverview | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesOut | null>(null);
  const [creatives, setCreatives] = useState<CreativesOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      monitoringService.getOverview(brandId, range),
      monitoringService.getTimeseries(brandId, range),
      monitoringService.getCreatives(brandId, range),
    ])
      .then(([o, t, c]) => {
        if (!active) return;
        setOverview(o);
        setTimeseries(t);
        setCreatives(c);
        setError(null);
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [range, brandId]);

  return { overview, timeseries, creatives, loading, error };
}
