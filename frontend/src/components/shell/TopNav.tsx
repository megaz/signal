"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { SearchBox } from "@/components/shell/SearchBox";
import imgAvatar from "@/imports/MacBookPro142/85510eea03b550927f9e55a6dd3a47e8d4de59a5.png";
import imgLogo from "@/imports/MacBookPro142/dead263f5cd0cad1ebb5b08c03b9078354a946ff.png";

const FONT = "'Poppins', sans-serif";
const PAD = 40; // matches the landing page horizontal padding

const NAV_ITEMS = [
  { label: "Dashboard",  href: "/" },
  { label: "Studio",     href: "/canvas" },
  { label: "Monitoring", href: "/monitoring" },
  { label: "AI Copilot", href: "/radar" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

/** Shared light-theme top navigation. Pills route via next/link with active state. */
export function TopNav() {
  const pathname = usePathname() ?? "/";

  return (
    <header
      className="flex items-center flex-none"
      style={{ paddingLeft: PAD, paddingRight: PAD, paddingTop: 28, gap: 14 }}
    >
      <Link
        href="/"
        className="relative flex-none rounded-full"
        style={{ width: 46, height: 46, background: "linear-gradient(180deg, #bcbce5 36.923%, #8a8bc7 125.39%)" }}
        aria-label="PULSE home"
      >
        <img
          src={imgLogo.src}
          alt="PULSE"
          className="absolute pointer-events-none"
          style={{ width: 25, height: 24, top: 11, left: 11, objectFit: "cover" }}
        />
      </Link>

      <nav className="flex items-center flex-none" style={{ gap: 9 }}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-center flex-none transition-colors"
              style={{
                height: 46,
                paddingLeft: 18,
                paddingRight: 18,
                borderRadius: 26,
                border: `2px solid ${active ? "#000" : "rgba(138,138,138,0.7)"}`,
                background: active ? "#000" : "transparent",
              }}
            >
              <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 17, color: active ? "#fff" : "#000" }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <SearchBox />

      <div className="flex-1" />

      <div className="flex items-center gap-2 flex-none">
        <div className="flex flex-col items-end">
          <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 17, color: "#000", lineHeight: 1.2 }}>
            James Kuzan
          </span>
          <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 13, color: "rgba(0,0,0,0.3)", lineHeight: 1.2 }}>
            @JamesK
          </span>
        </div>
        <div className="flex-none overflow-hidden" style={{ width: 46, height: 46, borderRadius: 50 }}>
          <ImageWithFallback src={imgAvatar} alt="James Kuzan" className="w-full h-full object-cover" />
        </div>
      </div>
    </header>
  );
}
