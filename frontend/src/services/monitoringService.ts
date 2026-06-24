import { api } from "./api";
import type { MonitoringOverview, TimeseriesOut, CreativesOut } from "@/types/monitoring";

export const monitoringService = {
  getOverview: (brandId: string, range = "30d") =>
    api.get<MonitoringOverview>(`/monitoring/${brandId}/overview?range=${range}`),

  getTimeseries: (brandId: string, range = "30d") =>
    api.get<TimeseriesOut>(`/monitoring/${brandId}/timeseries?range=${range}`),

  getCreatives: (brandId: string, range = "30d") =>
    api.get<CreativesOut>(`/monitoring/${brandId}/creatives?range=${range}`),
};
