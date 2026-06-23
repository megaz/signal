"use client";
import { useEffect, useRef, useCallback } from "react";
import { WS_BASE } from "@/lib/constants";

export function useCanvasWebSocket(adId: string, onMessage: (data: unknown) => void) {
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    ws.current = new WebSocket(`${WS_BASE}/ws/canvas/${adId}`);
    ws.current.onmessage = (e) => onMessage(JSON.parse(e.data));
    return () => ws.current?.close();
  }, [adId, onMessage]);

  const send = useCallback((data: unknown) => {
    ws.current?.readyState === WebSocket.OPEN &&
      ws.current.send(JSON.stringify(data));
  }, []);

  return { send };
}
