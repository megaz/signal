import type { ReactNode } from "react";
import { TopNav } from "./TopNav";

const POPPINS = "'Poppins', sans-serif";

/**
 * Light-theme page wrapper for the new Figma-look pages. Paints its own white
 * background (the global <body> is dark) and renders the shared TopNav.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white" style={{ fontFamily: POPPINS, color: "#000" }}>
      <TopNav />
      <main className="flex-1 min-h-0 flex flex-col">{children}</main>
    </div>
  );
}
