import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell, Panel, StatusBadge } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Operations Dashboard — OrbitSec" },
      { name: "description", content: "Live overview of satellite cybersecurity simulations and fleet posture." },
    ],
  }),
  component: Dashboard,
});

type Report = {
  id: string;
  simulation_id?: string;
  target_satellite: string;
  attack_type: string;
  mission_degradation_percent: number;
  recovery_time_hours?: number;
  success?: boolean;
  created_at: string;
};

type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

function riskFromDeg(deg: number): RiskLevel {
  if (deg >= 70) return "CRITICAL";
  if (deg >= 50) return "HIGH";
  if (deg >= 30) return "MEDIUM";
  return "LOW";
}

function degColor(deg: number): string {
  if (deg >= 70) return "text-critical";
  if (deg >= 50) return "text-high";
  if (deg >= 30) return "text-medium";
  return "text-low";
}

function healthBarColor(h: number): string {
  if (h < 50) return "bg-critical";
  if (h < 70) return "bg-high";
  if (h < 85) return "bg-medium";
  return "bg-low";
}

function titleCaseAttack(s: string): string {
  return s
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function fmtUTC(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

function fmtHeaderNow(d: Date): string {
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const pad = (n: number) => String(n).padStart(2, "0");
  const h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  const hr12 = h % 12 || 12;
  const parts = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" }).formatToParts(d);
  const tz = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()} · ${hr12}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${ampm} ${tz}`;
}

function Dashboard() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [configCount, setConfigCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [rRes, cRes] = await Promise.all([
          apiFetch("/api/reports?limit=500"),
          apiFetch("/api/configs"),
        ]);
        const rData = rRes.ok ? ((await rRes.json()) as Report[]) : [];
        const cData = cRes.ok ? await cRes.json() : [];
        if (cancelled) return;
        setReports(Array.isArray(rData) ? rData : []);
        setConfigCount(Array.isArray(cData) ? cData.length : 0);
      } catch {
        if (!cancelled) {
          setReports([]);
          setConfigCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const list = reports ?? [];
    const total = list.length;
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const last24 = list.filter((r) => {
      const t = new Date(r.created_at).getTime();
      return !Number.isNaN(t) && t >= cutoff;
    }).length;
    const avgDeg =
      total > 0
        ? list.reduce((s, r) => s + (Number(r.mission_degradation_percent) || 0), 0) / total
        : null;

    return {
      simsValue: total.toLocaleString(),
      simsDelta: `+${last24} (24h)`,
      configsValue: configCount === null ? "—" : configCount.toLocaleString(),
      avgDegValue: avgDeg === null ? "—" : `${avgDeg.toFixed(1)}%`,
      avgDegColor: avgDeg === null ? "text-high" : degColor(avgDeg),
      reportsValue: total.toLocaleString(),
      reportsDelta: `+${last24} (24h)`,
    };
  }, [reports, configCount]);

  const recent = useMemo(() => (reports ?? []).slice(0, 6), [reports]);

  const latestBySat = useMemo(() => {
    const list = reports ?? [];
    const map = new Map<string, Report>();
    for (const r of list) {
      const existing = map.get(r.target_satellite);
      if (!existing) {
        map.set(r.target_satellite, r);
        continue;
      }
      const tNew = new Date(r.created_at).getTime();
      const tOld = new Date(existing.created_at).getTime();
      if (tNew > tOld) map.set(r.target_satellite, r);
    }
    return Array.from(map.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6);
  }, [reports]);

  const totalReports = reports?.length ?? 0;

  const STATS = [
    { label: "Simulations Run", value: stats.simsValue, delta: stats.simsDelta, code: "SIM", color: "text-cyan" },
    { label: "Saved Configurations", value: stats.configsValue, delta: "", code: "CFG", color: "text-primary" },
    { label: "Avg Mission Degradation", value: stats.avgDegValue, delta: "", code: "DEG", color: stats.avgDegColor },
    { label: "Reports Generated", value: stats.reportsValue, delta: stats.reportsDelta, code: "RPT", color: "text-low" },
  ];

  const ACTIONS = [
    { to: "/attack", title: "Run New Simulation", desc: "Single-satellite attack scenario", code: "SIM", accent: "from-critical/20 to-transparent" },
    { to: "/constellation", title: "Constellation Mode", desc: "Cascading multi-asset breach", code: "CST", accent: "from-primary/20 to-transparent" },
    { to: "/adversary", title: "AI Adversary", desc: "Autonomous red-team agent", code: "ADV", accent: "from-high/20 to-transparent" },
    { to: "/reports", title: "View Reports", desc: `${totalReports.toLocaleString()} archived assessments`, code: "RPT", accent: "from-low/20 to-transparent" },
  ] as const;

  return (
    <AppShell title="Operations Overview" subtitle={`OPERATIONS OVERVIEW · ${fmtHeaderNow(now)}`}>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <div key={s.label} className="panel p-4 relative overflow-hidden">
            <div className="absolute inset-0 hud-grid opacity-30 pointer-events-none" />
            <div className="relative flex items-start justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">{s.label}</div>
                <div className="mt-2 text-3xl font-display font-semibold tracking-tight">
                  {loading ? "…" : s.value}
                </div>
                <div className="mt-1 flex items-center gap-1 text-[11px] font-mono text-muted-foreground min-h-[14px]">
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
        <Panel
          className="xl:col-span-2"
          title="Recent Simulations"
          action={
            <Link to="/reports" className="text-[11px] font-mono uppercase tracking-wider text-primary hover:underline">
              View all
            </Link>
          }
        >
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
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-xs font-mono text-muted-foreground">
                      Loading assessments…
                    </td>
                  </tr>
                ) : recent.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-xs text-muted-foreground">
                      No assessments yet.{" "}
                      <Link to="/attack" className="text-primary hover:underline font-mono uppercase tracking-wider">
                        Run a simulation to begin.
                      </Link>
                    </td>
                  </tr>
                ) : (
                  recent.map((r) => {
                    const deg = Number(r.mission_degradation_percent) || 0;
                    const risk = riskFromDeg(deg);
                    return (
                      <tr key={r.id} className="border-t border-border hover:bg-surface-2/50">
                        <td className="px-4 py-3 font-mono text-[13px]">{r.target_satellite}</td>
                        <td className="px-4 py-3 text-foreground/90">{titleCaseAttack(r.attack_type)}</td>
                        <td className="px-4 py-3 text-right font-mono">
                          <span className={degColor(deg)}>{deg.toFixed(1)}%</span>
                        </td>
                        <td className="px-4 py-3"><StatusBadge level={risk} /></td>
                        <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{fmtUTC(r.created_at)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Latest Assessment by Satellite">
          <div className="p-4 space-y-3">
            <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
              Most recent assessment per asset
            </div>
            {loading ? (
              <div className="text-xs font-mono text-muted-foreground py-4">Loading…</div>
            ) : latestBySat.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4">
                No assessments yet.{" "}
                <Link to="/attack" className="text-primary hover:underline font-mono uppercase tracking-wider">
                  Run a simulation
                </Link>{" "}
                to populate this panel.
              </div>
            ) : (
              latestBySat.map((r) => {
                const deg = Number(r.mission_degradation_percent) || 0;
                const health = Math.max(0, Math.min(100, 100 - deg));
                const risk = riskFromDeg(deg);
                return (
                  <div key={r.target_satellite} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono">{r.target_satellite}</span>
                      <StatusBadge level={risk} />
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                      <div
                        className={`h-full ${healthBarColor(health)}`}
                        style={{ width: `${health}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                      <span>HEALTH {health.toFixed(0)}%</span>
                      <span>{fmtUTC(r.created_at)}</span>
                    </div>
                  </div>
                );
              })
            )}
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
