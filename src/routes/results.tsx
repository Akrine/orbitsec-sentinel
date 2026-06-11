import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Panel, StatusBadge } from "@/components/AppShell";
import { FileDown, AlertTriangle, DollarSign, Clock, ChevronRight, Cpu, Battery, Radio, Thermometer, Camera } from "lucide-react";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Simulation Results — OrbitSec" },
      { name: "description", content: "Detailed mission impact, cascade chain, and sensitivity analysis." },
    ],
  }),
  component: Results,
});

const CASCADE = [
  { sub: "ADCS", icon: Cpu, t: "T+00:42", impact: 88, color: "text-critical" },
  { sub: "EPS", icon: Battery, t: "T+01:18", impact: 72, color: "text-critical" },
  { sub: "COMMS", icon: Radio, t: "T+02:05", impact: 64, color: "text-high" },
  { sub: "THERMAL", icon: Thermometer, t: "T+03:11", impact: 41, color: "text-medium" },
  { sub: "PAYLOAD", icon: Camera, t: "T+04:32", impact: 91, color: "text-critical" },
];

const SENS = [
  { p: "Encryption Level", v: 84, level: "CRITICAL" },
  { p: "Firmware Verification", v: 78, level: "CRITICAL" },
  { p: "Network Segmentation", v: 71, level: "HIGH" },
  { p: "Ground Station Count", v: 58, level: "HIGH" },
  { p: "Modulation Scheme", v: 44, level: "MEDIUM" },
  { p: "Reaction Wheels", v: 31, level: "MEDIUM" },
  { p: "Battery Capacity", v: 22, level: "LOW" },
  { p: "Altitude", v: 14, level: "LOW" },
];

function Results() {
  return (
    <AppShell
      title="Simulation Results — Sentinel-1A"
      subtitle="RUN ID OSIM-44219 · AI-ADAPTIVE GNSS SPOOFING · NATION-STATE · 450s"
      actions={
        <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90">
          <FileDown className="h-3.5 w-3.5" /> Export PDF Report
        </button>
      }
    >
      {/* Top metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="panel p-5 relative overflow-hidden md:col-span-1">
          <div className="absolute inset-0 bg-gradient-to-br from-critical/15 to-transparent" />
          <div className="relative">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-critical">
              <AlertTriangle className="h-3 w-3" /> Mission Degradation
            </div>
            <div className="mt-2 text-5xl font-display font-bold text-critical text-glow tabular-nums">84.2%</div>
            <div className="text-[11px] font-mono text-muted-foreground mt-1">σ ±2.1% · 500 MC runs</div>
          </div>
        </div>
        <div className="panel p-5">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
            <DollarSign className="h-3 w-3" /> Operational Cost
          </div>
          <div className="mt-2 text-3xl font-display font-semibold tabular-nums">$14.7M</div>
          <div className="text-[11px] font-mono text-muted-foreground mt-1">Mission revenue + recovery</div>
        </div>
        <div className="panel p-5">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
            <Clock className="h-3 w-3" /> Recovery Time
          </div>
          <div className="mt-2 text-3xl font-display font-semibold tabular-nums">72h</div>
          <div className="text-[11px] font-mono text-muted-foreground mt-1">To 95% mission capability</div>
        </div>
        <div className="panel p-5 flex flex-col justify-between">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">Risk Level</div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-3xl font-display font-bold text-critical">CRITICAL</span>
            <StatusBadge level="CRITICAL" />
          </div>
          <div className="text-[11px] font-mono text-muted-foreground mt-1">CVSS-Space 9.4 / 10</div>
        </div>
      </div>

      {/* Cascade timeline */}
      <Panel className="mt-4" title="Cascade Chain Timeline" action={<span className="text-[10px] font-mono text-muted-foreground">5 SUBSYSTEMS · TOTAL T+04:32</span>}>
        <div className="p-6">
          <div className="flex items-stretch gap-2 overflow-x-auto">
            {CASCADE.map((n, i) => (
              <div key={n.sub} className="flex items-stretch gap-2 flex-1 min-w-[180px]">
                <div className="flex-1 panel-2 p-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-critical via-high to-medium" />
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-md bg-background border border-border flex items-center justify-center ${n.color}`}>
                      <n.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{n.sub}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{n.t}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-[10px] font-mono uppercase text-muted-foreground">Impact</span>
                    <span className={`font-mono text-lg ${n.color}`}>{n.impact}%</span>
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-background overflow-hidden">
                    <div className={`h-full ${n.impact > 70 ? "bg-critical" : n.impact > 50 ? "bg-high" : "bg-medium"}`} style={{ width: `${n.impact}%` }} />
                  </div>
                </div>
                {i < CASCADE.length - 1 && (
                  <div className="flex items-center text-primary">
                    <ChevronRight className="h-5 w-5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Subsystem health */}
        <Panel title="Subsystem Health">
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { name: "ADCS", icon: Cpu, h: 12, status: "FAULT" },
              { name: "EPS", icon: Battery, h: 28, status: "DEGRADED" },
              { name: "COMMS", icon: Radio, h: 36, status: "DEGRADED" },
              { name: "THERMAL", icon: Thermometer, h: 59, status: "WARN" },
              { name: "PAYLOAD", icon: Camera, h: 9, status: "OFFLINE" },
            ].map((s) => (
              <div key={s.name} className="panel-2 p-4">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-md bg-background border border-border flex items-center justify-center ${s.h < 30 ? "text-critical" : s.h < 60 ? "text-high" : "text-medium"}`}>
                    <s.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{s.name}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{s.status}</div>
                  </div>
                  <span className="font-mono text-lg tabular-nums">{s.h}%</span>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-background overflow-hidden">
                  <div className={`h-full ${s.h < 30 ? "bg-critical" : s.h < 60 ? "bg-high" : "bg-medium"}`} style={{ width: `${s.h}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Sensitivity */}
        <Panel title="Sensitivity Analysis · Sobol Indices">
          <div className="p-4 space-y-2">
            {SENS.map((s) => (
              <div key={s.p} className="flex items-center gap-3">
                <div className="w-40 text-xs truncate">{s.p}</div>
                <div className="flex-1 h-6 panel-2 rounded overflow-hidden relative">
                  <div className={`h-full ${s.level === "CRITICAL" ? "bg-critical/40" : s.level === "HIGH" ? "bg-high/40" : s.level === "MEDIUM" ? "bg-medium/40" : "bg-low/40"}`} style={{ width: `${s.v}%` }} />
                  <div className="absolute inset-0 flex items-center px-2">
                    <span className="font-mono text-[11px] text-foreground">{s.v}%</span>
                  </div>
                </div>
                <div className="w-20 flex justify-end"><StatusBadge level={s.level as any} /></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-4 flex gap-2">
        <Link to="/attack" className="px-4 py-2.5 rounded-md panel-2 text-sm hover:border-primary/40">Run Another</Link>
        <Link to="/reports" className="px-4 py-2.5 rounded-md panel-2 text-sm hover:border-primary/40">All Reports</Link>
      </div>
    </AppShell>
  );
}
