"use client";
import { useEffect } from "react";
import { useCanvasStore } from "@/stores/canvasStore";

export function useCanvas(adId: string, onAnalysisComplete?: () => void) {
  const store = useCanvasStore();

  useEffect(() => {
    store.loadBeats(adId, onAnalysisComplete);
  }, [adId]);

  return store;
}
