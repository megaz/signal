import { AppShell } from "@/components/shell/AppShell";
import { MonitoringDashboard } from "@/components/monitoring/MonitoringDashboard";

export default function MonitoringPage() {
  return (
    <AppShell>
      <MonitoringDashboard />
    </AppShell>
  );
}
