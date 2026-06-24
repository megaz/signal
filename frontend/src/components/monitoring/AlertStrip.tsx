import Link from "next/link";
import { FONT, BORDER, MUTED } from "@/lib/ui";
import type { MonitoringAlert } from "@/types/monitoring";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#C9391A",
  warning: "#D9531F",
};

export function AlertStrip({ alerts }: { alerts: MonitoringAlert[] }) {
  return (
    <div
      className="flex flex-col"
      style={{ border: `2px solid ${BORDER}`, borderRadius: 18, padding: 16, background: "#fff", height: "100%" }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 16, color: "#000" }}>Alerts</span>
        <span style={{ fontFamily: FONT, fontSize: 13, color: MUTED }}>{alerts.length}</span>
      </div>

      {alerts.length === 0 ? (
        <div style={{ fontFamily: FONT, fontSize: 14, color: MUTED, padding: "24px 0", textAlign: "center" }}>
          No creatives need attention. 🎉
        </div>
      ) : (
        <div className="flex flex-col overflow-y-auto" style={{ gap: 8, maxHeight: 300 }}>
          {alerts.map((a) => {
            const color = SEVERITY_COLOR[a.severity] ?? "#D9531F";
            return (
              <Link
                key={a.ad_id}
                href={`/canvas/${a.ad_id}`}
                className="flex items-start group"
                style={{ gap: 10, padding: "10px 12px", borderRadius: 12, border: `1px solid ${BORDER}`, background: "#fff" }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 4, background: color, marginTop: 6, flexShrink: 0 }} />
                <span style={{ fontFamily: FONT, fontSize: 13, color: "#000", lineHeight: 1.4 }}>
                  {a.text}
                  <span style={{ color: MUTED }} className="opacity-0 group-hover:opacity-100"> →</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
