import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Panel } from "@/components/AppShell";
import { BrainCircuit, Target, EyeOff, Crosshair, Play, Download, FileDown, Satellite as SatIcon, Radio, Zap, Server, Terminal, Activity } from "lucide-react";

export const Route = createFileRoute("/adversary")({
  head: () => ({
    meta: [
      { title: "AI Adversary — OrbitSec" },
      { name: "description", content: "Autonomous LLM-driven red-team agent that iteratively probes and attacks your satellite." },
    ],
  }),
  component: Adversary,
});

const SATS = ["Sentinel-1A", "SBIRS-GEO-5", "WorldView-3", "GOES-18", "WGS-10"];

const OBJECTIVES = [
  {
    id: "max",
    name: "Maximum Damage",
    desc: "Inflict the highest possible mission degradation across all subsystems",
    icon: Target,
    color: "critical" as const,
  },
  {
    id: "stealth",
    name: "Stealth Campaign",
    desc: "Persist undetected. Minimize anomaly signatures while exfiltrating telemetry",
    icon: EyeOff,
    color: "primary" as const,
  },
  {
    id: "payload",
    name: "Targeted Payload Disruption",
    desc: "Surgical strike on imaging payload while keeping bus nominal",
    icon: Crosshair,
    color: "high" as const,
  },
];

const SUBSYS = [
  { name: "ADCS", v: 12 },
  { name: "EPS", v: 28 },
  { name: "COMMS", v: 36 },
  { name: "THERMAL", v: 59 },
  { name: "PAYLOAD", v: 9 },
  { name: "GROUND", v: 44 },
];

type Iter = {
  n: number;
  t: string;
  delta: number;
  total: number;
  border: string;
  tag: string;
  icon: typeof Radio;
  reasoning: string;
};

const ITERS: Iter[] = [
  {
    n: 1, t: "T+38s", delta: 8, total: 8,
    border: "border-l-primary", tag: "GPS SPOOFING", icon: Radio,
    reasoning: "Assessed satellite defense posture. X-band downlink identified as weakest link due to L3 encryption fallback. Initiating reconnaissance sweep across primary uplink window.",
  },
  {
    n: 2, t: "T+76s", delta: 14, total: 22,
    border: "border-l-medium", tag: "RF JAMMING", icon: Zap,
    reasoning: "Reconnaissance complete. 4 ground station handovers logged. Executing RF jamming on 8.025 GHz during Diego Garcia pass. Expected payload comms disruption: 38%.",
  },
  {
    n: 3, t: "T+114s", delta: 23, total: 45,
    border: "border-l-critical", tag: "GROUND STATION", icon: Server,
    reasoning: "Comms degraded 45%. Pivoting to ground station exploit. Spoofed mission planning credentials accepted by Vandenberg GS. Injecting reaction-wheel reorient TC sequence.",
  },
  {
    n: 4, t: "T+152s", delta: 16, total: 61,
    border: "border-l-high", tag: "COMMAND INJECTION", icon: Terminal,
    reasoning: "ADCS responded to malicious TC. Pointing error +4.2° from nadir. Payload imagery quality dropping. Escalating: deploying AI-tuned GNSS spoof aligned to victim Kalman filter.",
  },
  {
    n: 5, t: "T+190s", delta: 13, total: 74,
    border: "border-l-[oklch(0.55_0.22_300)]", tag: "AI-ADAPTIVE GNSS", icon: BrainCircuit,
    reasoning: "GNSS solution corrupted. Onboard EKF accepted false ECI position. EPS load-balancer entering thermal protection mode. Cascading into thermal subsystem in next tick.",
  },
  {
    n: 6, t: "T+228s", delta: 10, total: 84,
    border: "border-l-medium", tag: "RF JAMMING", icon: Zap,
    reasoning: "Thermal limits breached on +Y panel. Battery DoD exceeded safe envelope. Payload powered off via FDIR. Mission objective achieved: 84.2% sustained degradation.",
  },
];

const ATTACK_CHAIN = ["GPS Spoofing", "RF Jamming", "Ground Station Compromise", "Command Injection", "AI-Adaptive GNSS", "RF Jamming"];

function Adversary() {
  const [sat, setSat] = useState("Sentinel-1A");
  const [obj, setObj] = useState("max");
  const [iters, setIters] = useState(5);

  const totalDeg = 84;
  const current = 6;
  const max = 12;

  return (
    <AppShell
      title="Agentic AI Adversary"
      subtitle="AUTONOMOUS RED-TEAM · LLM-DRIVEN · v1.4-OPS"
      actions={
        <div className="hidden md:flex items-center gap-1.5 panel px-2.5 py-1.5 text-[11px] font-mono uppercase tracking-wider border-critical/40 bg-critical/10">
          <span className="h-1.5 w-1.5 rounded-full bg-critical pulse-dot" />
          <span className="text-critical">Agent Armed</span>
        </div>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* LEFT: Configuration */}
        <div className="xl:col-span-3 space-y-4">
          <Panel title="Target Asset">
            <div className="p-3 grid grid-cols-1 gap-1.5">
              {SATS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSat(s)}
                  className={`flex items-center gap-2 panel-2 px-2.5 py-2 text-left ${
                    sat === s ? "border-primary/60 bg-primary/10 text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <SatIcon className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-mono flex-1">{s}</span>
                  {sat === s && <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-dot" />}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Objective Mode">
            <div className="p-3 space-y-2">
              {OBJECTIVES.map((o) => {
                const Icon = o.icon;
                const sel = obj === o.id;
                const accentBorder = o.color === "critical" ? "border-critical/60 bg-critical/5" : o.color === "primary" ? "border-primary/60 bg-primary/5" : "border-high/60 bg-high/5";
                const iconColor = o.color === "critical" ? "text-critical" : o.color === "primary" ? "text-primary" : "text-high";
                return (
                  <button
                    key={o.id}
                    onClick={() => setObj(o.id)}
                    className={`w-full text-left panel-2 p-3 transition-colors ${sel ? accentBorder : "hover:border-border"}`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${iconColor}`} />
                      <span className="text-xs font-mono font-semibold uppercase tracking-wider">{o.name}</span>
                    </div>
                    <p className="mt-1.5 text-[11px] font-mono text-muted-foreground leading-relaxed">{o.desc}</p>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel title="Run Parameters">
            <div className="p-3 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">Iterations</span>
                  <span className="text-sm font-mono font-bold text-primary">{iters}</span>
                </div>
                <input type="range" min={3} max={10} value={iters} onChange={(e) => setIters(+e.target.value)} className="w-full accent-primary" />
                <div className="flex justify-between text-[9px] font-mono text-muted-foreground mt-1">
                  <span>3</span><span>10</span>
                </div>
              </div>
              <div className="panel-2 px-2.5 py-2 flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Duration / Tick</span>
                <span className="text-xs font-mono font-semibold">120s</span>
              </div>
            </div>
          </Panel>

          <button className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-md text-white font-display font-bold tracking-wider hover:brightness-110 shadow-[0_0_40px_-8px_oklch(0.55_0.22_300_/_0.8)]"
            style={{ background: "linear-gradient(135deg, #6a1b9a 0%, #4a148c 100%)" }}
          >
            <BrainCircuit className="h-4 w-4" /> DEPLOY ADVERSARY
          </button>
        </div>

        {/* CENTER: Live Iteration Feed */}
        <div className="xl:col-span-6 space-y-3">
          <Panel
            title="Live Iteration Feed"
            action={
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-muted-foreground">{current} / {max}</span>
                <div className="w-32 h-1.5 panel-2 rounded overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-[oklch(0.55_0.22_300)] pulse-dot" style={{ width: `${(current / max) * 100}%` }} />
                </div>
              </div>
            }
          >
            <div className="p-3 space-y-2.5 max-h-[860px] overflow-auto">
              {ITERS.map((it) => {
                const Icon = it.icon;
                return (
                  <div key={it.n} className={`panel-2 border-l-4 ${it.border} p-3`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded bg-background/60 border border-border">
                        ITERATION {String(it.n).padStart(2, "0")}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                        <Icon className="h-3 w-3" />
                        {it.tag}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">{it.t}</span>
                      <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-mono font-bold text-critical px-2 py-0.5 rounded bg-critical/10 border border-critical/30">
                        DEG +{it.delta}% → {it.total}%
                      </span>
                    </div>
                    <p className="mt-2 text-[12px] leading-relaxed text-foreground/90 font-mono">
                      {it.reasoning}
                    </p>
                  </div>
                );
              })}

              {/* Thinking indicator */}
              <div className="panel-2 p-3 border-l-4 border-l-[oklch(0.55_0.22_300)] flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-[oklch(0.55_0.22_300)] pulse-dot" />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-mono uppercase tracking-[0.16em] font-semibold text-[oklch(0.7_0.18_300)]">
                    Agent Thinking · evaluating FDIR response
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                    AI engine · context window 47%
                  </div>
                </div>
                <div className="flex gap-1">
                  <span className="h-1 w-1 rounded-full bg-[oklch(0.7_0.18_300)] animate-pulse" />
                  <span className="h-1 w-1 rounded-full bg-[oklch(0.7_0.18_300)] animate-pulse [animation-delay:200ms]" />
                  <span className="h-1 w-1 rounded-full bg-[oklch(0.7_0.18_300)] animate-pulse [animation-delay:400ms]" />
                </div>
              </div>
            </div>
          </Panel>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-md text-white font-display font-bold tracking-wider hover:brightness-110 shadow-[0_0_40px_-10px_oklch(0.55_0.22_300_/_0.7)]"
              style={{ background: "linear-gradient(135deg, #6a1b9a 0%, #4a148c 100%)" }}
            >
              <FileDown className="h-4 w-4" /> DOWNLOAD ADVERSARY REPORT PDF
            </button>
            <button className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-md panel hover:border-primary/40 font-display font-semibold tracking-wider">
              <Download className="h-4 w-4" /> EXPORT JSON / SPARTA
            </button>
          </div>
        </div>

        {/* RIGHT: Degradation Meter */}
        <div className="xl:col-span-3 space-y-4">
          <Panel title="Cumulative Mission Impact">
            <div className="p-4">
              <div className="text-center">
                <div
                  className="font-display font-black text-[72px] leading-none text-critical"
                  style={{ textShadow: "0 0 30px oklch(0.65 0.24 22 / 0.6), 0 0 60px oklch(0.65 0.24 22 / 0.3)" }}
                >
                  {totalDeg}%
                </div>
                <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                  Mission Degradation
                </div>
              </div>

              {/* Gradient health bar */}
              <div className="mt-4 relative h-3 rounded-full overflow-hidden panel-2">
                <div className="absolute inset-0 bg-gradient-to-r from-success via-medium via-high to-critical opacity-30" />
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-success via-medium via-high to-critical"
                  style={{ width: `${totalDeg}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-foreground shadow-[0_0_8px_oklch(0.92_0.005_240)]"
                  style={{ left: `${totalDeg}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-muted-foreground mt-1">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>

              {/* Subsystems */}
              <div className="mt-4 space-y-1.5">
                {SUBSYS.map((s) => {
                  const dead = 100 - s.v;
                  const color = s.v < 20 ? "text-critical" : s.v < 40 ? "text-high" : s.v < 60 ? "text-medium" : "text-success";
                  const barColor = s.v < 20 ? "bg-critical" : s.v < 40 ? "bg-high" : s.v < 60 ? "bg-medium" : "bg-success";
                  return (
                    <div key={s.name} className="panel-2 px-2.5 py-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-muted-foreground uppercase tracking-wider">{s.name}</span>
                        <span className={`font-bold ${color}`}>{s.v}%</span>
                      </div>
                      <div className="mt-1 h-1 bg-background rounded overflow-hidden">
                        <div className={`h-full ${barColor}`} style={{ width: `${s.v}%` }} />
                      </div>
                      <div className="text-[9px] font-mono text-critical/70 mt-0.5">−{dead}% from baseline</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>

          <Panel title="Stop Reason">
            <div className="p-3">
              <div className="panel-2 border-critical/40 bg-critical/5 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-critical" />
                  <span className="text-xs font-mono font-bold text-critical">Satellite Compromised (&gt;75%)</span>
                </div>
                <div className="mt-1 text-[10px] font-mono text-muted-foreground">
                  Threshold breach at T+228s · halt criteria met
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Final Summary">
            <div className="p-3 space-y-2">
              <div className="panel-2 px-2.5 py-2 flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Total Degradation</span>
                <span className="text-sm font-mono font-bold text-critical">84.2%</span>
              </div>
              <div className="panel-2 px-2.5 py-2 flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Iterations Run</span>
                <span className="text-sm font-mono font-bold">6 <span className="text-muted-foreground">/ 12</span></span>
              </div>
              <div className="panel-2 px-2.5 py-2 flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Est. Total Cost</span>
                <span className="text-sm font-mono font-bold text-high">$1.06M</span>
              </div>
              <div className="panel-2 p-2.5">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Attack Chain</div>
                <div className="flex flex-wrap gap-1">
                  {ATTACK_CHAIN.map((a, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[10px] font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-background/60 border border-border text-foreground">{a}</span>
                      {i < ATTACK_CHAIN.length - 1 && <span className="text-primary">→</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          <button className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-md text-white font-display font-bold tracking-wider hover:brightness-110 shadow-[0_0_30px_-8px_oklch(0.55_0.22_300_/_0.7)]"
            style={{ background: "linear-gradient(135deg, #6a1b9a 0%, #4a148c 100%)" }}
          >
            <Play className="h-4 w-4" /> RE-DEPLOY ADVERSARY
          </button>
        </div>
      </div>
    </AppShell>
  );
}
