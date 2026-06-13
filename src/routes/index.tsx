import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Panel, StatusBadge } from "@/components/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Operations Dashboard — OrbitSec" },
      { name: "description", content: "Live overview of satellite cybersecurity simulations and fleet posture." },
    ],
  }),
  component: Dashboard,
});

const STATS = [
  { label: "Simulations Run", value: "1,284", delta: "+47 (24h)", trend: "up", code: "SIM", color: "text-cyan" },
  { label: "Active Satellites", value: "37", delta: "5 constellations", trend: "flat", code: "SAT", color: "text-primary" },
  { label: "Avg Mission Degradation", value: "62.4%", delta: "+4.1% wk", trend: "down", code: "DEG", color: "text-high" },
  { label: "Reports Generated", value: "412", delta: "+18 (24h)", trend: "up", code: "RPT", color: "text-low" },
];

const RECENT = [
  { sat: "Sentinel-1A", attack: "AI-Adaptive GNSS Spoofing", deg: 84, risk: "CRITICAL", date: "2026-06-11 14:22 UTC" },
  { sat: "SBIRS-GEO-5", attack: "Command Injection", deg: 71, risk: "CRITICAL", date: "2026-06-11 12:08 UTC" },
  { sat: "WorldView-3", attack: "RF Jamming", deg: 58, risk: "HIGH", date: "2026-06-11 09:41 UTC" },
  { sat: "GOES-18", attack: "Ground Station Compromise", deg: 47, risk: "HIGH", date: "2026-06-10 23:15 UTC" },
  { sat: "WGS-10", attack: "GPS Spoofing", deg: 33, risk: "MEDIUM", date: "2026-06-10 18:50 UTC" },
  { sat: "Sentinel-1A", attack: "RF Jamming", deg: 22, risk: "LOW", date: "2026-06-10 11:02 UTC" },
] as const;

const ACTIONS = [
  { to: "/attack", title: "Run New Simulation", desc: "Single-satellite attack scenario", code: "SIM", accent: "from-critical/20 to-transparent" },
  { to: "/constellation", title: "Constellation Mode", desc: "Cascading multi-asset breach", code: "CST", accent: "from-primary/20 to-transparent" },
  { to: "/adversary", title: "AI Adversary", desc: "Autonomous red-team agent", code: "ADV", accent: "from-high/20 to-transparent" },
  { to: "/reports", title: "View Reports", desc: "412 archived assessments", code: "RPT", accent: "from-low/20 to-transparent" },
];

function Dashboard() {
  return (
    <AppShell title="Operations Overview" subtitle="THEATER · CONUS · 11 JUN 2026 14:32:07Z">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <div key={s.label} className="panel p-4 relative overflow-hidden">
            <div className="absolute inset-0 hud-grid opacity-30 pointer-events-none" />
            <div className="relative flex items-start justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">{s.label}</div>
                <div className="mt-2 text-3xl font-display font-semibold tracking-tight">{s.value}</div>
                <div className="mt-1 flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                  {s.trend === "up" && <span className="text-success">UP</span>}
                  {s.trend === "down" && <span className="text-critical">DN</span>}
                  {s.delta}
                </div>
              </div>
              <div className={`h-9 w-9 rounded-md panel-2 flex items-center justify-center ${s.color}`}>
                <span className="text-[10px] font-mono font-bold">{s.code}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="mt-4 grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel className="xl:col-span-2" title="Recent Simulations" action={
          <Link to="/reports" className="text-[11px] font-mono uppercase tracking-wider text-primary hover:underline">View all</Link>
        }>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="text-left font-medium px-4 py-2.5">Satellite</th>
                  <th className="text-left font-medium px-4 py-2.5">Attack Vector</th>
                  <th className="text-right font-medium px-4 py-2.5">Mission Deg.</th>
                  <th className="text-left font-medium px-4 py-2.5">Risk</th>
                  <th className="text-left font-medium px-4 py-2.5">Run At</th>
                </tr>
              </thead>
              <tbody>
                {RECENT.map((r, i) => (
                  <tr key={i} className="border-t border-border hover:bg-surface-2/50">
                    <td className="px-4 py-3 font-mono text-[13px]">{r.sat}</td>
                    <td className="px-4 py-3 text-foreground/90">{r.attack}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      <span className={r.deg >= 70 ? "text-critical" : r.deg >= 50 ? "text-high" : r.deg >= 30 ? "text-medium" : "text-low"}>
                        {r.deg.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge level={r.risk} /></td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{r.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Fleet Posture">
          <div className="p-4 space-y-3">
            {[
              { name: "Sentinel-1A", health: 42, risk: "CRITICAL" },
              { name: "SBIRS-GEO-5", health: 51, risk: "HIGH" },
              { name: "WorldView-3", health: 68, risk: "HIGH" },
              { name: "GOES-18", health: 74, risk: "MEDIUM" },
              { name: "WGS-10", health: 88, risk: "LOW" },
            ].map((s) => (
              <div key={s.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono">{s.name}</span>
                  <StatusBadge level={s.risk as any} />
                </div>
                <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <div
                    className={`h-full ${s.health < 50 ? "bg-critical" : s.health < 70 ? "bg-high" : s.health < 85 ? "bg-medium" : "bg-low"}`}
                    style={{ width: `${s.health}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                  <span>HEALTH</span>
                  <span>{s.health}%</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Quick actions */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {ACTIONS.map((a) => (
          <Link key={a.to} to={a.to} className="panel p-4 group hover:border-primary/40 transition-colors relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${a.accent} opacity-60 pointer-events-none`} />
            <div className="relative flex items-start gap-3">
              <div className="h-10 w-10 rounded-md panel-2 flex items-center justify-center text-primary">
                <span className="text-[10px] font-mono font-bold">{a.code}</span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{a.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{a.desc}</div>
              </div>
              <span className="text-xs font-mono text-muted-foreground group-hover:text-primary transition-colors">OPEN</span>
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
