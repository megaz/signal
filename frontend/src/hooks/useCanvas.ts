"use client";
import { useEffect } from "react";
import { useCanvasStore } from "@/stores/canvasStore";

export function useCanvas(adId: string) {
  const store = useCanvasStore();

  useEffect(() => {
    store.loadBeats(adId);
  }, [adId]);

  return store;
}
