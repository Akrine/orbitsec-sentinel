import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Panel, StatusBadge } from "@/components/AppShell";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Simulation Results — OrbitSec" },
      {
        name: "description",
        content: "Detailed mission impact, cascade chain, sensitivity, and recovery analysis.",
      },
    ],
  }),
  component: Results,
});

// ---------- DATA ----------
const CASCADE = [
  { sub: "ADCS", code: "ADCS", t: "T+00:42", impact: 88, tone: "critical" },
  { sub: "EPS", code: "EPS", t: "T+01:18", impact: 72, tone: "critical" },
  { sub: "COMMS", code: "COM", t: "T+02:05", impact: 64, tone: "high" },
  { sub: "THERMAL", code: "THM", t: "T+03:11", impact: 41, tone: "medium" },
  { sub: "PAYLOAD", code: "PLD", t: "T+04:32", impact: 91, tone: "critical" },
] as const;

const SUBSYSTEMS = [
  { name: "ADCS", code: "ADCS", before: 100, after: 12, status: "FAULT", tone: "critical" },
  { name: "EPS", code: "EPS", before: 100, after: 28, status: "DEGRADED", tone: "high" },
  { name: "COMMS", code: "COM", before: 100, after: 36, status: "DEGRADED", tone: "high" },
  { name: "THERMAL", code: "THM", before: 100, after: 59, status: "WARN", tone: "medium" },
  { name: "PAYLOAD", code: "PLD", before: 100, after: 9, status: "OFFLINE", tone: "critical" },
  { name: "GROUND", code: "GS", before: 100, after: 44, status: "DEGRADED", tone: "high" },
] as const;

const SENS = [
  { p: "Encryption Level", v: 84, level: "CRITICAL" },
  { p: "Firmware Verification", v: 78, level: "CRITICAL" },
  { p: "Network Segmentation", v: 71, level: "HIGH" },
  { p: "Ground Station Count", v: 58, level: "HIGH" },
  { p: "Modulation Scheme", v: 44, level: "MEDIUM" },
  { p: "Reaction Wheels", v: 31, level: "MEDIUM" },
  { p: "Battery Capacity", v: 22, level: "LOW" },
  { p: "Altitude", v: 14, level: "LOW" },
] as const;

const UNCERTAINTY = [
  { metric: "Mission Degradation", low: "79.1%", nom: "84.2%", high: "89.3%" },
  { metric: "ADCS Health", low: "8%", nom: "12%", high: "18%" },
  { metric: "Payload Health", low: "5%", nom: "9%", high: "14%" },
  { metric: "Recovery Time", low: "3.8h", nom: "4.2h", high: "5.1h" },
];

const RECOVERY = [
  { phase: "Ground Contact Re-established", h: 0.5, tone: "success" },
  { phase: "Anomaly Investigation", h: 1.2, tone: "medium" },
  { phase: "Payload Restart", h: 1.8, tone: "high" },
  { phase: "Mission Resumption", h: 0.7, tone: "success" },
];

type SubKey = "ADCS" | "EPS" | "COMMS" | "THERMAL" | "PAYLOAD" | "GROUND";

const SUB_COLOR: Record<SubKey, { bg: string; text: string; ring: string; hex: string }> = {
  ADCS:    { bg: "bg-primary",   text: "text-primary",   ring: "ring-primary/40",   hex: "var(--primary)" },
  EPS:     { bg: "bg-medium",    text: "text-medium",    ring: "ring-medium/40",    hex: "var(--medium)" },
  COMMS:   { bg: "bg-success",   text: "text-success",   ring: "ring-success/40",   hex: "var(--success)" },
  THERMAL: { bg: "bg-high",      text: "text-high",      ring: "ring-high/40",      hex: "var(--high)" },
  PAYLOAD: { bg: "bg-accent",    text: "text-accent",    ring: "ring-accent/40",    hex: "var(--accent)" },
  GROUND:  { bg: "bg-critical",  text: "text-critical",  ring: "ring-critical/40",  hex: "var(--critical)" },
};

type TLEvent = {
  id: string;
  t: number; // seconds
  sub: SubKey;
  desc: string;
  severity: number; // 0..100, height
  metrics: { label: string; value: string }[];
};

const EVENTS: TLEvent[] = [
  { id: "e1", t: 0, sub: "GROUND", desc: "Station network reconnaissance initiated", severity: 30,
    metrics: [{ label: "Scan vectors", value: "12" }, { label: "Targets", value: "Falcon-GS · Diego-GS" }] },
  { id: "e2", t: 29, sub: "GROUND", desc: "Ground station compromised via network intrusion", severity: 78,
    metrics: [{ label: "CVE", value: "CVE-2024-3119" }, { label: "Privilege", value: "ROOT" }, { label: "Dwell", value: "11s" }] },
  { id: "e3", t: 30, sub: "PAYLOAD", desc: "Payload commanded offline via injected TC", severity: 70,
    metrics: [{ label: "TC ID", value: "0x3F-PWR_OFF" }, { label: "Auth", value: "BYPASSED" }] },
  { id: "e4", t: 42, sub: "ADCS", desc: "Reaction wheel momentum dump command injected", severity: 65,
    metrics: [{ label: "RW Speed", value: "+4200 RPM" }, { label: "Torque", value: "0.18 Nm" }] },
  { id: "e5", t: 89, sub: "ADCS", desc: "Unauthorized attitude maneuver executed, pointing error +4.2°", severity: 88,
    metrics: [{ label: "Pointing Error", value: "+4.2°" }, { label: "Slew rate", value: "0.9°/s" }] },
  { id: "e6", t: 109, sub: "EPS", desc: "Solar panel misalignment, power deficit 180W", severity: 72,
    metrics: [{ label: "Power Margin", value: "−180 W" }, { label: "Array angle", value: "37° off-sun" }] },
  { id: "e7", t: 123, sub: "THERMAL", desc: "Thermal protection mode activated", severity: 50,
    metrics: [{ label: "Bus temp", value: "+48 °C" }, { label: "Heater duty", value: "0%" }] },
  { id: "e8", t: 180, sub: "COMMS", desc: "X-band downlink degraded, switching to S-band", severity: 60,
    metrics: [{ label: "SNR", value: "4.1 dB" }, { label: "Link margin", value: "−6.2 dB" }] },
  { id: "e9", t: 240, sub: "PAYLOAD", desc: "FDIR triggered, payload powered off", severity: 95,
    metrics: [{ label: "FDIR rule", value: "PL-OVR-04" }, { label: "Last image", value: "T+232s" }] },
  { id: "e10", t: 300, sub: "EPS", desc: "Battery depth of discharge exceeds safe envelope", severity: 80,
    metrics: [{ label: "DoD", value: "62%" }, { label: "Battery", value: "21%" }] },
];

const PHASES = [
  { t: 0, label: "ATTACK", tone: "text-critical border-critical/60" },
  { t: 90, label: "CASCADE", tone: "text-high border-high/60" },
  { t: 240, label: "SAFE MODE", tone: "text-critical border-critical/60" },
];

const SPARTA = [
  { id: "SV-CF-1", name: "Jamming", tactic: "Defense Evasion" },
  { id: "SV-IT-4", name: "Spoofing — GNSS", tactic: "Impact" },
  { id: "SV-GS-3", name: "Compromise Ground Station", tactic: "Initial Access" },
  { id: "SV-CF-4", name: "Command Injection", tactic: "Execution" },
];

const VALIDATION = [
  "Physics Conservation",
  "Cascade Logic",
  "Financial Model",
  "LHS Sampling",
  "Sensitivity Bounds",
  "Recovery Timeline",
  "Report Consistency",
];

const ATTACK_PARAMS = [
  { k: "Attack Type", v: "AI-Adaptive GNSS Spoofing" },
  { k: "Threat Actor", v: "Nation-State" },
  { k: "Severity", v: "Critical" },
  { k: "Duration", v: "450 s" },
  { k: "Position Offset", v: "1.8 km" },
  { k: "Signal Power", v: "+12 dB" },
  { k: "Uncertainty", v: "ON" },
  { k: "Sensitivity", v: "ON" },
];

function toneBg(t: string) {
  return t === "critical" ? "bg-critical" : t === "high" ? "bg-high" : t === "medium" ? "bg-medium" : t === "success" ? "bg-success" : "bg-low";
}
function toneText(t: string) {
  return t === "critical" ? "text-critical" : t === "high" ? "text-high" : t === "medium" ? "text-medium" : t === "success" ? "text-success" : "text-low";
}

// ---------- COMPONENT ----------
function Results() {
  const DURATION = 450;
  const allSubs: SubKey[] = ["ADCS", "EPS", "COMMS", "THERMAL", "PAYLOAD", "GROUND"];
  const [active, setActive] = useState<Record<SubKey, boolean>>({
    ADCS: true, EPS: true, COMMS: true, THERMAL: true, PAYLOAD: true, GROUND: true,
  });
  const [selected, setSelected] = useState<TLEvent | null>(EVENTS[4]);

  const filtered = EVENTS.filter((e) => active[e.sub]);
  const totalRecovery = RECOVERY.reduce((a, b) => a + b.h, 0);

  return (
    <AppShell
      title="Simulation Results — Sentinel-1A"
      subtitle="MISSION IMPACT · CASCADE · UNCERTAINTY · RECOVERY"
      actions={
        <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90">
          <FileDown className="h-3.5 w-3.5" /> Export PDF Report
        </button>
      }
    >
      {/* Top metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="panel p-5 relative overflow-hidden">
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
          <div className="mt-2 text-3xl font-display font-semibold tabular-nums">$1.06M</div>
          <div className="text-[11px] font-mono text-muted-foreground mt-1">Mission revenue + recovery</div>
        </div>
        <div className="panel p-5">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
            <Clock className="h-3 w-3" /> Recovery Time
          </div>
          <div className="mt-2 text-3xl font-display font-semibold tabular-nums">4.2h</div>
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

      {/* Run metadata bar */}
      <div className="mt-3 panel px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
        <span>RUN ID <span className="text-foreground">OSIM-44219</span></span>
        <span className="text-border">·</span>
        <span className="text-primary">AI-ADAPTIVE GNSS SPOOFING</span>
        <span className="text-border">·</span>
        <span className="text-critical">NATION-STATE</span>
        <span className="text-border">·</span>
        <span>450s</span>
        <span className="text-border">·</span>
        <span className="text-success">COMPLETE</span>
      </div>

      {/* Cascade timeline */}
      <Panel
        className="mt-4"
        title="Cascade Chain Timeline"
        action={<span className="text-[10px] font-mono text-muted-foreground">5 SUBSYSTEMS · TOTAL T+04:32</span>}
      >
        <div className="p-6">
          <div className="flex items-stretch gap-2 overflow-x-auto">
            {CASCADE.map((n, i) => (
              <div key={n.sub} className="flex items-stretch gap-2 flex-1 min-w-[180px]">
                <div className="flex-1 panel-2 p-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-critical via-high to-medium" />
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-md bg-background border border-border flex items-center justify-center ${toneText(n.tone)}`}>
                      <n.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{n.sub}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{n.t}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-[10px] font-mono uppercase text-muted-foreground">Impact</span>
                    <span className={`font-mono text-lg ${toneText(n.tone)}`}>{n.impact}%</span>
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-background overflow-hidden">
                    <div className={`h-full ${toneBg(n.tone)}`} style={{ width: `${n.impact}%` }} />
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

      {/* Two column */}
      <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Subsystem Health">
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {SUBSYSTEMS.map((s) => (
              <div key={s.name} className="panel-2 p-4">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-md bg-background border border-border flex items-center justify-center ${toneText(s.tone)}`}>
                    <s.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{s.name}</div>
                    <div className={`text-[10px] font-mono uppercase tracking-wider ${toneText(s.tone)}`}>{s.status}</div>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <span className="text-muted-foreground tabular-nums">{s.before}%</span>
                    <span className="text-muted-foreground mx-1">→</span>
                    <span className={`text-lg ${toneText(s.tone)} tabular-nums`}>{s.after}%</span>
                  </div>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-background overflow-hidden">
                  <div className={`h-full ${toneBg(s.tone)}`} style={{ width: `${s.after}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Sensitivity Analysis · Sobol Indices">
          <div className="p-4 space-y-2">
            {SENS.map((s) => (
              <div key={s.p} className="flex items-center gap-3">
                <div className="w-40 text-xs truncate">{s.p}</div>
                <div className="flex-1 h-6 panel-2 rounded overflow-hidden relative">
                  <div
                    className={`h-full ${
                      s.level === "CRITICAL" ? "bg-critical/40"
                      : s.level === "HIGH" ? "bg-high/40"
                      : s.level === "MEDIUM" ? "bg-medium/40"
                      : "bg-low/40"
                    }`}
                    style={{ width: `${s.v}%` }}
                  />
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

      {/* Uncertainty */}
      <Panel className="mt-4" title="Uncertainty Bounds" action={<span className="text-[10px] font-mono text-muted-foreground">P05 · P50 · P95</span>}>
        <div className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground border-b border-border">
                <th className="px-4 py-2.5">Metric</th>
                <th className="px-4 py-2.5">Low Sample (P05)</th>
                <th className="px-4 py-2.5">Nominal (P50)</th>
                <th className="px-4 py-2.5">High Sample (P95)</th>
              </tr>
            </thead>
            <tbody>
              {UNCERTAINTY.map((u) => (
                <tr key={u.metric} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2.5 font-medium">{u.metric}</td>
                  <td className="px-4 py-2.5 font-mono text-low tabular-nums">{u.low}</td>
                  <td className="px-4 py-2.5 font-mono text-foreground tabular-nums">{u.nom}</td>
                  <td className="px-4 py-2.5 font-mono text-critical tabular-nums">{u.high}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Recovery Timeline */}
      <Panel
        className="mt-4"
        title="Recovery Timeline"
        action={<span className="text-[10px] font-mono text-muted-foreground">TOTAL <span className="text-foreground">{totalRecovery.toFixed(1)}h</span></span>}
      >
        <div className="p-4 space-y-3">
          {RECOVERY.map((p) => {
            const pct = (p.h / totalRecovery) * 100;
            return (
              <div key={p.phase} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-4 text-xs">{p.phase}</div>
                <div className="col-span-7 h-6 panel-2 rounded overflow-hidden relative">
                  <div className={`h-full ${toneBg(p.tone)}/60`} style={{ width: `${pct}%` }} />
                  <div className="absolute inset-0 flex items-center px-2">
                    <span className={`font-mono text-[11px] ${toneText(p.tone)}`}>{p.h}h</span>
                  </div>
                </div>
                <div className="col-span-1 text-right font-mono text-[11px] text-muted-foreground">{pct.toFixed(0)}%</div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Interactive Timeline */}
      <Panel className="mt-4" title="Interactive Timeline" action={<span className="text-[10px] font-mono text-muted-foreground">T+0s → T+{DURATION}s</span>}>
        <div className="p-4">
          {/* filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            {allSubs.map((s) => {
              const on = active[s];
              const c = SUB_COLOR[s];
              return (
                <button
                  key={s}
                  onClick={() => setActive((a) => ({ ...a, [s]: !a[s] }))}
                  className={`px-2.5 py-1 rounded-full border text-[10px] font-mono uppercase tracking-[0.14em] transition-all ${
                    on
                      ? `${c.text} border-current bg-current/10`
                      : "text-muted-foreground border-border bg-background hover:text-foreground"
                  }`}
                >
                  <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${c.bg}`} />
                  {s}
                </button>
              );
            })}
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">
              {filtered.length} EVENTS
            </span>
          </div>

          {/* track */}
          <div className="mt-4 relative h-40 panel-2 rounded overflow-hidden hud-grid">
            {/* phase markers */}
            {PHASES.map((ph) => {
              const left = (ph.t / DURATION) * 100;
              return (
                <div key={ph.label} className="absolute top-0 bottom-0" style={{ left: `${left}%` }}>
                  <div className={`h-full border-l border-dashed ${ph.tone.split(" ")[1]}`} />
                  <div className={`absolute top-1 left-1 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.14em] border bg-background ${ph.tone}`}>
                    {ph.label}
                  </div>
                </div>
              );
            })}

            {/* baseline */}
            <div className="absolute left-0 right-0 bottom-6 border-t border-border/60" />

            {/* events */}
            {filtered.map((e) => {
              const left = (e.t / DURATION) * 100;
              const h = Math.max(18, (e.severity / 100) * 110);
              const c = SUB_COLOR[e.sub];
              const isSel = selected?.id === e.id;
              return (
                <button
                  key={e.id}
                  onClick={() => setSelected(e)}
                  className="absolute bottom-6 -translate-x-1/2 group"
                  style={{ left: `${left}%`, height: `${h}px` }}
                  title={`T+${e.t}s · ${e.sub}`}
                >
                  <div
                    className={`w-1.5 rounded-t ${c.bg} ${isSel ? "ring-2 ring-offset-2 ring-offset-background " + c.ring : ""} group-hover:opacity-100 opacity-85`}
                    style={{ height: `${h}px` }}
                  />
                  <div className={`absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-mono whitespace-nowrap ${c.text} opacity-0 group-hover:opacity-100`}>
                    T+{e.t}s
                  </div>
                </button>
              );
            })}

            {/* axis labels */}
            <div className="absolute bottom-1 left-0 right-0 flex justify-between px-2 text-[9px] font-mono text-muted-foreground">
              {[0, 90, 180, 270, 360, 450].map((t) => (
                <span key={t}>T+{t}s</span>
              ))}
            </div>
          </div>

          {/* selected detail */}
          {selected && (
            <div className="mt-4 panel-2 p-4">
              <div className="flex items-start gap-3">
                <span className={`h-8 w-8 rounded-md flex items-center justify-center ${SUB_COLOR[selected.sub].bg}/20 ${SUB_COLOR[selected.sub].text} border border-current/30`}>
                  <ShieldAlert className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-medium">T+{selected.t}s</span>
                    <span className={`text-[10px] font-mono uppercase tracking-[0.14em] ${SUB_COLOR[selected.sub].text}`}>{selected.sub}</span>
                    <span className="ml-auto text-[10px] font-mono text-muted-foreground">SEVERITY {selected.severity}</span>
                  </div>
                  <div className="mt-1 text-sm">{selected.desc}</div>
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {selected.metrics.map((m) => (
                      <div key={m.label} className="panel px-3 py-2">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{m.label}</div>
                        <div className="font-mono text-sm">{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cascade Log */}
          <div className="mt-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground mb-2">Cascade Log</div>
            <div className="panel-2 max-h-64 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-surface/95 backdrop-blur">
                  <tr className="text-left text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground border-b border-border">
                    <th className="px-3 py-2 w-20">Time</th>
                    <th className="px-3 py-2 w-24">Subsystem</th>
                    <th className="px-3 py-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {EVENTS.map((e) => (
                    <tr
                      key={e.id}
                      onClick={() => setSelected(e)}
                      className={`border-b border-border/40 last:border-0 cursor-pointer hover:bg-surface/60 ${
                        selected?.id === e.id ? "bg-surface/80" : ""
                      }`}
                    >
                      <td className="px-3 py-2 font-mono text-medium tabular-nums">T+{e.t}s</td>
                      <td className={`px-3 py-2 font-mono ${SUB_COLOR[e.sub].text}`}>{e.sub}</td>
                      <td className="px-3 py-2 text-primary/90">{e.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Panel>

      {/* Bottom triple */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="SPARTA Framework Mappings" className="lg:col-span-2">
          <div className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground border-b border-border">
                  <th className="px-4 py-2.5 w-32">Technique ID</th>
                  <th className="px-4 py-2.5">Technique Name</th>
                  <th className="px-4 py-2.5 w-44">Tactic</th>
                </tr>
              </thead>
              <tbody>
                {SPARTA.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-2.5 font-mono text-primary">{r.id}</td>
                    <td className="px-4 py-2.5">{r.name}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{r.tactic}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Validation Checks">
          <div className="p-4 space-y-2">
            {VALIDATION.map((v) => (
              <div key={v} className="flex items-center gap-2 panel-2 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-sm">{v}</span>
                <span className="ml-auto text-[10px] font-mono text-success">PASS</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="mt-4" title="Attack Parameters Used">
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {ATTACK_PARAMS.map((p) => (
            <div key={p.k} className="panel-2 px-3 py-2.5">
              <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">{p.k}</div>
              <div className="font-mono text-sm mt-0.5">{p.v}</div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="mt-4 flex gap-2">
        <Link to="/attack" className="px-4 py-2.5 rounded-md panel-2 text-sm hover:border-primary/40">Run Another</Link>
        <Link to="/reports" className="px-4 py-2.5 rounded-md panel-2 text-sm hover:border-primary/40">All Reports</Link>
      </div>
    </AppShell>
  );
}
