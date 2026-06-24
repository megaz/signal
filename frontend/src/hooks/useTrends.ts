"use client";

import { useCallback, useEffect, useState } from "react";
import { trendsService, normalizeTrends } from "@/services/trendsService";
import type { TrendSeries } from "@/types/trends";

const DEFAULT_KEYWORDS = ["celsius", "energy drink"];

export function useTrends() {
  const [keywords, setKeywords] = useState<string[]>(DEFAULT_KEYWORDS);
  const [geo, setGeo] = useState("US");
  const [series, setSeries] = useState<TrendSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNow = useCallback((kw: string[], g: string) => {
    if (!kw.length) {
      setSeries([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    trendsService
      .getTrends(kw, g)
      .then((r) => {
        if (!active) return;
        setSeries(normalizeTrends(r.data));
        setError(null);
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    fetchNow(keywords, geo);
  }, [keywords, geo, fetchNow]);

  const addKeyword = (k: string) => {
    const t = k.trim();
    if (t && keywords.length < 5 && !keywords.some((x) => x.toLowerCase() === t.toLowerCase())) {
      setKeywords([...keywords, t]);
    }
  };
  const removeKeyword = (k: string) => setKeywords(keywords.filter((x) => x !== k));

  return { keywords, geo, setGeo, series, loading, error, addKeyword, removeKeyword };
}
