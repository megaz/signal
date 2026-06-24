"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { adService } from "@/services/adService";
import type { AdHealth, AdNode } from "@/types/ad";
import svgPaths from "@/imports/MacBookPro142/svg-hc5vql6mh7";

const FONT = "'Poppins', sans-serif";
const BRAND_ID = process.env.NEXT_PUBLIC_DEMO_BRAND_ID ?? "celsius";

type Status = "thriving" | "aging" | "fatigued";
const STATUS_COLOR: Record<Status, string> = { thriving: "#66A737", aging: "#E28929", fatigued: "#C9391A" };
const STATUS_LABEL: Record<Status, string> = { thriving: "Thriving", aging: "Aging", fatigued: "Fatigued" };

function toStatus(h: AdHealth): Status {
  return h === "thriving" ? "thriving" : h === "aging" ? "aging" : "fatigued";
}
const adName = (a: AdNode) => a.title?.trim() || "Untitled creative";

const MAX_RESULTS = 7;

/** Search-as-you-type over the brand's creatives with a YouTube-style suggestions panel. */
export function SearchBox() {
  const router = useRouter();
  const [ads, setAds] = useState<AdNode[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    adService
      .getWebNodes(BRAND_ID)
      .then((r) => {
        if (alive) setAds(r.nodes);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const term = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (!term) {
      // Empty + focused → quick picks that need attention (fatigued first, most run days)
      return [...ads]
        .filter((a) => toStatus(a.health) === "fatigued")
        .sort((a, b) => (b.run_days ?? 0) - (a.run_days ?? 0))
        .slice(0, 6);
    }
    return ads
      .filter((a) => adName(a).toLowerCase().includes(term) || a.id.includes(term))
      .slice(0, MAX_RESULTS);
  }, [ads, term]);

  useEffect(() => {
    setActive(0);
  }, [term]);

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function go(ad: AdNode | undefined) {
    if (!ad) return;
    setOpen(false);
    setQ("");
    router.push(`/canvas/${ad.id}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      go(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
      (e.target as HTMLInputElement).blur();
    }
  }

  const noMatch = term.length > 0 && results.length === 0;
  const showPanel = open && (results.length > 0 || noMatch);

  return (
    <div ref={boxRef} className="relative flex-1 min-w-0" style={{ maxWidth: 300, marginLeft: 8 }}>
      {/* Input */}
      <div
        className="flex items-center gap-2"
        style={{
          height: 46,
          borderRadius: 30,
          border: "2px solid #000",
          paddingLeft: 18,
          paddingRight: 12,
          background: "#fff",
        }}
      >
        <svg style={{ width: 17, height: 17, flexShrink: 0 }} viewBox="0 0 21.7087 21.7055" fill="none">
          <path d={svgPaths.p2ec3ce00} stroke="#000" strokeWidth="2" />
        </svg>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search creatives"
          aria-label="Search creatives"
          className="flex-1 min-w-0 bg-transparent outline-none"
          style={{ fontFamily: FONT, fontWeight: 400, fontSize: 16, color: "#000" }}
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Clear search"
            className="flex-none flex items-center justify-center"
            style={{ width: 20, height: 20, borderRadius: 10, color: "rgba(0,0,0,0.45)", fontSize: 17, lineHeight: 1 }}
          >
            ×
          </button>
        )}
      </div>

      {/* Suggestions panel */}
      {showPanel && (
        <div
          className="absolute left-0 right-0 z-50"
          style={{
            top: 52,
            background: "#fff",
            border: "1px solid #e6e6e6",
            borderRadius: 16,
            boxShadow: "0 14px 32px rgba(0,0,0,0.16)",
            overflow: "hidden",
            paddingTop: 4,
            paddingBottom: 6,
          }}
          role="listbox"
        >
          <div
            style={{
              padding: "8px 16px 4px",
              fontFamily: FONT,
              fontWeight: 500,
              fontSize: 11,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: "rgba(0,0,0,0.4)",
            }}
          >
            {term ? `Results for “${q.trim()}”` : "Needs attention"}
          </div>

          {noMatch ? (
            <div style={{ padding: "10px 16px 12px", fontFamily: FONT, fontSize: 14, color: "rgba(0,0,0,0.5)" }}>
              No creatives match “{q.trim()}”.
            </div>
          ) : (
            results.map((ad, i) => {
              const st = toStatus(ad.health);
              const fatigued = st === "fatigued";
              return (
                <button
                  key={ad.id}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    go(ad);
                  }}
                  className="flex items-center gap-3 w-full text-left transition-colors"
                  style={{ padding: "8px 14px", background: i === active ? "#f4f4f5" : "transparent" }}
                >
                  <div className="flex-none overflow-hidden" style={{ width: 34, height: 44, borderRadius: 7, background: "#1a1a1a" }}>
                    {ad.thumbnail_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ad.thumbnail_url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate" style={{ fontFamily: FONT, fontWeight: 500, fontSize: 14, color: "#000" }}>
                      {adName(ad)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span style={{ width: 6, height: 6, borderRadius: 3, background: STATUS_COLOR[st], flexShrink: 0 }} />
                      <span style={{ fontFamily: FONT, fontSize: 11, color: "rgba(0,0,0,0.45)" }}>
                        {STATUS_LABEL[st]} · {ad.run_days ?? 0}d
                      </span>
                    </div>
                  </div>
                  {fatigued && (
                    <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 11, color: STATUS_COLOR.fatigued, flexShrink: 0 }}>
                      Refresh →
                    </span>
                  )}
                </button>
              );
            })
          )}

          {term && results.length > 0 && (
            <div style={{ padding: "6px 16px 2px", fontFamily: FONT, fontSize: 11, color: "rgba(0,0,0,0.35)" }}>
              {results.length} match{results.length === 1 ? "" : "es"} · Enter opens the teardown
            </div>
          )}
        </div>
      )}
    </div>
  );
}
