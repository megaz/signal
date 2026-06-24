"use client";

import { useEffect, useState } from "react";
import { adService } from "@/services/adService";
import { engagementService } from "@/services/engagementService";
import { DEFAULT_BRAND_ID } from "@/lib/constants";
import type { AdNode } from "@/types/ad";
import type { Engagement } from "@/types/engagement";

/** Loads the brand's creatives (/web) plus real per-ad engagement (/engagement). */
export function useCreativeLibrary(brandId: string = DEFAULT_BRAND_ID) {
  const [nodes, setNodes] = useState<AdNode[]>([]);
  const [engagement, setEngagement] = useState<Record<string, Engagement>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      adService.getWebNodes(brandId),
      engagementService.getForBrand(brandId).catch(() => ({ items: [] as Engagement[] })),
    ])
      .then(([web, eng]) => {
        if (!active) return;
        setNodes(web.nodes);
        const map: Record<string, Engagement> = {};
        for (const e of eng.items) map[e.ad_id] = e;
        setEngagement(map);
        setError(null);
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [brandId]);

  return { nodes, engagement, loading, error };
}
