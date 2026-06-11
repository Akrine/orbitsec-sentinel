import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Panel } from "@/components/AppShell";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — OrbitSec" },
      { name: "description", content: "Workspace, compliance, and integration settings." },
    ],
  }),
  component: () => (
    <AppShell title="Settings" subtitle="WORKSPACE · COMPLIANCE · INTEGRATIONS">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Organization">
          <div className="p-5 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Tenant</span><span className="font-mono">USSF-SOC-DELTA-6</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="font-mono text-primary">DEFENSE · ENTERPRISE</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Seats</span><span className="font-mono">48 / 100</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">FedRAMP</span><span className="font-mono text-success">HIGH · AUTHORIZED</span></div>
          </div>
        </Panel>
        <Panel title="Integrations">
          <div className="p-5 space-y-2 text-sm">
            {[
              ["MITRE SPARTA", "SYNCED"],
              ["Splunk SIEM", "STREAMING"],
              ["AWS GovCloud", "CONNECTED"],
              ["AGI STK", "CONNECTED"],
              ["NORAD TLE Feed", "STREAMING"],
            ].map(([n, s]) => (
              <div key={n} className="flex items-center justify-between panel-2 px-3 py-2">
                <span>{n}</span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-success flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" />{s}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  ),
});
