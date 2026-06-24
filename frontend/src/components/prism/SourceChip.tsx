"use client";

import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { FONT, BORDER, MUTED } from "@/lib/ui";
import type { PrismSource } from "@/types/prism";

export function hostOf(url?: string): string {
  if (!url) return "";
  try {
    const h = new URL(url).hostname;
    return h.startsWith("www.") ? h.slice(4) : h;
  } catch {
    return "";
  }
}

export function faviconUrl(domain: string): string {
  return domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64` : "";
}

/** Favicon-only dot used in the research rail while sources stream in. */
export function FaviconDot({ source, index }: { source: PrismSource; index: number }) {
  const domain = source.domain || hostOf(source.url);
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      title={source.title || domain || source.url}
      className="inline-flex items-center justify-center flex-none"
      style={{
        width: 24,
        height: 24,
        borderRadius: 7,
        border: `1px solid ${BORDER}`,
        background: "#fff",
        overflow: "hidden",
        animation: "prismPop 0.25s ease",
      }}
    >
      <ImageWithFallback src={faviconUrl(domain)} alt={domain} style={{ width: 16, height: 16, objectFit: "cover" }} />
    </a>
  );
}

/** Full pill: favicon + domain (+ optional citation index). Used beneath answers. */
export function SourceChip({ source, index }: { source: PrismSource; index?: number }) {
  const domain = source.domain || hostOf(source.url);
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      title={source.title || source.url}
      className="inline-flex items-center"
      style={{
        gap: 7,
        border: `1px solid ${BORDER}`,
        borderRadius: 20,
        padding: "4px 11px 4px 6px",
        background: "#fff",
        textDecoration: "none",
        maxWidth: 240,
      }}
    >
      <span
        className="inline-flex items-center justify-center flex-none"
        style={{ width: 18, height: 18, borderRadius: 5, overflow: "hidden" }}
      >
        <ImageWithFallback src={faviconUrl(domain)} alt="" style={{ width: 16, height: 16, objectFit: "cover" }} />
      </span>
      {typeof index === "number" && (
        <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: MUTED }}>{index}</span>
      )}
      <span
        style={{
          fontFamily: FONT,
          fontSize: 12,
          color: "#000",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {domain || source.title || source.url}
      </span>
    </a>
  );
}
