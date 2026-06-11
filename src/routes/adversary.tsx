import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Panel, StatusBadge } from "@/components/AppShell";
import { BrainCircuit, Target, EyeOff, Crosshair, Play, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/adversary")({
  head: () => ({
    meta: [
      { title: "AI Adversary — OrbitSec" },
      { name: "description", content: "Autonomous red-team agent that iteratively probes and attacks your satellite." },
    ],
  }),
  component: Adversary,
});

const OBJECTIVES = [
  { id: "max", name: "Maximum Damage", desc: "Inflict the highest possible mission degradation across all subsystems.", icon: Target, accent: "critical" },
  { id: "stealth", name: "Stealth Campaign", desc: "Persist undetected. Minimize anomaly signatures while exfiltrating telemetry.", icon: EyeOff, accent: "primary" },
  { id: "payload", name: "Targeted Payload Disruption", desc: "Surgical strike on imaging payload while keeping bus nominal.", icon: Crosshair, accent: "high" },
];

const ITERATIONS = [
  { n: 1, deg: 8, text: "Assessed satellite defense posture. X-band downlink identified as weakest link due to L3 encryption fallback. Initiating reconnaissance sweep across primary uplink window." },
  { n: 2, deg: 22, text: "Reconnaissance complete. 4 ground station handovers logged. Executing RF jamming on 8.025 GHz during Diego Garcia pass. Expected payload comms disruption: 38%." },
  { n: 3, deg: 45, text: "Comms degraded 45%. Pivoting to ground station exploit. Spoofed mission planning credentials accepted by Vandenberg GS. Injecting reaction-wheel reorient TC sequence." },
  { n: 4, deg: 61, text: "ADCS responded to malicious TC. Pointing error +4.2° from nadir. Payload imagery quality dropping. Escalating: deploying AI-tuned GNSS spoof aligned to victim Kalman filter." },
  { n: 5, deg: 74, text: "GNSS solution corrupted. Onboard EKF accepted false ECI position. EPS load-balancer entering thermal protection mode. Cascading into thermal subsystem in next tick." },
  { n: 6, deg: 84, text: "Thermal limits breached on +Y panel. Battery DoD exceeded safe envelope. Payload powered off via FDIR. Mission objective achieved: 84.2% sustained degradation." },
];

function Adversary() {
  const [obj, setObj] = useState("max");
  return (
    <AppShell
      title="Agentic AI Adversary"
      subtitle="AUTONOMOUS RED-TEAM · LLM-DRIVEN · v1.4-OPS"
      actions={<div className="flex items-center gap-1.5 panel px-2.5 py-1.5 text-[11px] font-mono"><span className="h-1.5 w-1.5 rounded-full bg-critical pulse-dot" /><span className="text-critical">AGENT ARMED</span></div>}
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <Panel title="Objective Mode" action={<span className="text-[10px] font-mono text-muted-foreground">SELECT ONE</span>}>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              {OBJECTIVES.map((o) => {
                const active = obj === o.id;
                const colorMap: Record<string, string> = { critical: "border-critical bg-critical/5", primary: "border-primary bg-primary/5", high: "border-high bg-high/5" };
                return (
                  <button key={o.id} onClick={() => setObj(o.id)} className={`text-left p-4 rounded-md border transition-all relative overflow-hidden ${
                    active ? colorMap[o.accent] : "border-border bg-surface-2 hover:border-primary/40"
                  }`}>
                    {active && <div className="absolute inset-0 hud-grid opacity-30 pointer-events-none" />}
                    <div className="relative">
                      <div className={`h-10 w-10 rounded-md flex items-center justify-center ${
                        active ? `bg-${o.accent} text-${o.accent}-foreground` : "bg-background border border-border text-foreground"
                      }`}>
                        <o.icon className="h-5 w-5" />
                      </div>
                      <div className="mt-3 text-sm font-semibold">{o.name}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">{o.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel title="Live Iteration Feed" action={
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="text-muted-foreground">ITER</span>
              <span className="text-primary">6 / 12</span>
              <div className="h-1 w-24 bg-background rounded overflow-hidden"><div className="h-full bg-primary" style={{ width: "50%" }} /></div>
            </div>
          }>
            <div className="p-4 space-y-3 max-h-[480px] overflow-y-auto font-mono text-[12px] leading-relaxed">
              {ITERATIONS.map((it) => (
                <div key={it.n} className="panel-2 p-3 border-l-2 border-primary/60">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <BrainCircuit className="h-3 w-3 text-primary" />
                    <span>ITERATION {it.n.toString().padStart(2, "0")}</span>
                    <span>·</span>
                    <span>T+{(it.n * 38).toString().padStart(2, "0")}s</span>
                    <span className="ml-auto text-critical">DEG {it.deg}%</span>
                  </div>
                  <p className="mt-1.5 text-foreground/90">{it.text}</p>
                </div>
              ))}
              <div className="panel-2 p-3 border-l-2 border-primary flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-dot" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">AGENT THINKING · evaluating fdir response · model gpt-osec-4o</span>
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Degradation Meter">
            <div className="p-5">
              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">Cumulative Mission Impact</div>
              <div className="mt-3 text-6xl font-display font-bold text-critical text-glow tabular-nums">84%</div>
              <div className="mt-3 h-2 rounded-full bg-background overflow-hidden">
                <div className="h-full bg-gradient-to-r from-low via-medium via-high to-critical" style={{ width: "84%" }} />
              </div>
              <div className="mt-2 flex justify-between text-[10px] font-mono text-muted-foreground"><span>0%</span><span>50%</span><span>100%</span></div>
              <div className="mt-5 grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="panel-2 p-2"><div className="text-muted-foreground">Δ / iter</div><div className="text-foreground">+14%</div></div>
                <div className="panel-2 p-2"><div className="text-muted-foreground">ETA max</div><div className="text-foreground">2 iters</div></div>
              </div>
            </div>
          </Panel>

          <Panel title="Final Attack Chain">
            <ol className="p-4 space-y-1.5 text-[11px] font-mono">
              {["Recon · X-band scan", "Jam · 8.025 GHz", "Spoof · GS auth", "TC · ADCS reorient", "Spoof · GNSS EKF", "Cascade · EPS thermal"].map((s, i) => (
                <li key={s} className="flex items-center gap-2 panel-2 px-2 py-1.5">
                  <span className="text-primary">{(i + 1).toString().padStart(2, "0")}</span>
                  <span className="text-foreground">{s}</span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Defensive Recommendation">
            <div className="p-4 space-y-2 text-xs">
              <div className="flex items-start gap-2 panel-2 p-2.5">
                <ShieldCheck className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold">Upgrade to Encryption L5</div>
                  <div className="text-muted-foreground text-[11px]">Mitigates 71% of observed kill-chain. Cost: $1.2M.</div>
                </div>
              </div>
              <div className="flex items-start gap-2 panel-2 p-2.5">
                <ShieldCheck className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold">Enforce TC Replay Protection</div>
                  <div className="text-muted-foreground text-[11px]">Closes Vandenberg pivot vector entirely.</div>
                </div>
              </div>
              <div className="flex items-start gap-2 panel-2 p-2.5">
                <ShieldCheck className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold">Onboard GNSS Anomaly Detector</div>
                  <div className="text-muted-foreground text-[11px]">Rejects spoofed solutions inconsistent with IMU integration.</div>
                </div>
              </div>
            </div>
          </Panel>

          <button className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-md bg-primary text-primary-foreground font-display font-bold tracking-wider hover:bg-primary/90">
            <Play className="h-4 w-4" /> LAUNCH ADVERSARY
          </button>
        </div>
      </div>
    </AppShell>
  );
}
