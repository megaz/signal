"use client";

import { useEffect, useState } from "react";
import { adService } from "@/services/adService";
import { DEFAULT_BRAND_ID } from "@/lib/constants";
import type { AdNode } from "@/types/ad";

/** Loads the brand's creatives (reuses the /web endpoint) for the library grid. */
export function useCreativeLibrary(brandId: string = DEFAULT_BRAND_ID) {
  const [nodes, setNodes] = useState<AdNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    adService
      .getWebNodes(brandId)
      .then((d) => {
        if (active) {
          setNodes(d.nodes);
          setError(null);
        }
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [brandId]);

  return { nodes, loading, error };
}
