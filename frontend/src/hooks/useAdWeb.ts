"use client";
import { useEffect } from "react";
import { useAdStore } from "@/stores/adStore";

export function useAdWeb(brandId: string) {
  const store = useAdStore();

  useEffect(() => {
    store.fetchWeb(brandId);
    store.fetchStats(brandId);
  }, [brandId]);

  return store;
}
