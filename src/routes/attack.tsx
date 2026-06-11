import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Panel, StatusBadge } from "@/components/AppShell";
import {
  Radio, Zap, Terminal, Server, BrainCircuit, Lock, Antenna, Radar,
  Cpu, Skull, Plane, Cloud, Truck, Play, ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/attack")({
  head: () => ({
    meta: [
      { title: "Attack Selection — OrbitSec" },
      { name: "description", content: "Choose attack vector, threat actor profile, and simulation parameters." },
    ],
  }),
  component: Attack,
});

const LIVE_ATTACKS = [
  { id: "gps-spoof", name: "GPS Spoofing", desc: "Inject false GNSS signals to corrupt navigation solution.", icon: Radio, surface: "RF · L1/L2" },
  { id: "rf-jam", name: "RF Jamming", desc: "Broadband noise injection to deny uplink/downlink.", icon: Zap, surface: "RF · X-band" },
  { id: "cmd-inj", name: "Command Injection", desc: "Unauthorized TC stream via spoofed ground station auth.", icon: Terminal, surface: "C&DH" },
  { id: "gs-comp", name: "Ground Station Compromise", desc: "Lateral move from ground network to mission planning.", icon: Server, surface: "GROUND" },
  { id: "ai-gnss", name: "AI-Adaptive GNSS Spoofing", desc: "RL-driven spoof tuned to victim Kalman filter.", icon: BrainCircuit, surface: "RF · ML" },
];

const SOON = [
  { name: "GPS Jamming", icon: Radio }, { name: "Crosslink Jamming", icon: Antenna },
  { name: "Meaconing", icon: Radar }, { name: "Uplink Jamming", icon: Zap },
  { name: "Downlink Jamming", icon: Zap }, { name: "Malware Injection", icon: Cpu },
  { name: "Denial of Service", icon: Lock }, { name: "Kinetic ASAT", icon: Skull },
  { name: "Space Weather", icon: Cloud }, { name: "Supply Chain Attack", icon: Truck },
];

const ACTORS = [
  { id: "nation", name: "Nation-State", tag: "TIER-1 APT", desc: "Persistent, well-funded, multi-vector. Long dwell time.", level: "CRITICAL", traits: ["Zero-days", "Custom implants", "Multi-vector"] },
  { id: "apt", name: "Sophisticated APT", tag: "TIER-2", desc: "Skilled criminal/contractor. Known tradecraft, adaptable.", level: "HIGH", traits: ["Known TTPs", "Phishing", "Lateral"] },
  { id: "insider", name: "Insider Threat", tag: "TRUSTED", desc: "Authorized operator with malicious or compromised intent.", level: "HIGH", traits: ["Credentialed", "Bypass MFA", "Audit-aware"] },
];

function Attack() {
  const [selectedAttack, setSelectedAttack] = useState("ai-gnss");
  const [actor, setActor] = useState("nation");
  const [duration, setDuration] = useState(450);
  const [uq, setUq] = useState(true);
  const [sa, setSa] = useState(true);
  const [sat, setSat] = useState("Sentinel-1A");

  return (
    <AppShell title="Attack Selection" subtitle="MISSION PLANNER · STEP 2 OF 3">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <Panel title="Target Asset" action={<Link to="/configure" className="text-[10px] font-mono uppercase tracking-wider text-primary hover:underline">Configure</Link>}>
            <div className="p-4 flex gap-2 flex-wrap">
              {["Sentinel-1A", "SBIRS-GEO-5", "WorldView-3", "GOES-18", "WGS-10"].map((s) => (
                <button key={s} onClick={() => setSat(s)} className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-colors ${
                  sat === s ? "bg-primary/15 border-primary text-primary" : "panel-2 text-muted-foreground hover:text-foreground"
                }`}>{s}</button>
              ))}
            </div>
          </Panel>

          <Panel title="Attack Vector" action={<span className="text-[10px] font-mono text-muted-foreground">5 LIVE · 10 PIPELINE</span>}>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {LIVE_ATTACKS.map((a) => {
                const active = selectedAttack === a.id;
                return (
                  <button key={a.id} onClick={() => setSelectedAttack(a.id)} className={`text-left p-4 rounded-md border transition-all relative overflow-hidden ${
                    active ? "border-primary bg-primary/5" : "border-border bg-surface-2 hover:border-primary/40"
                  }`}>
                    {active && <div className="absolute inset-0 hud-grid opacity-30 pointer-events-none" />}
                    <div className="relative">
                      <div className="flex items-center justify-between">
                        <div className={`h-9 w-9 rounded-md flex items-center justify-center ${active ? "bg-primary text-primary-foreground" : "bg-background text-primary border border-border"}`}>
                          <a.icon className="h-4 w-4" />
                        </div>
                        <StatusBadge level="LIVE" />
                      </div>
                      <div className="mt-3 text-sm font-semibold">{a.name}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{a.desc}</div>
                      <div className="mt-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{a.surface}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="px-4 pb-4">
              <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground mb-2">Pipeline · Coming Soon</div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {SOON.map((s) => (
                  <div key={s.name} className="panel-2 p-2.5 opacity-50 cursor-not-allowed">
                    <div className="flex items-center gap-2">
                      <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[11px] truncate">{s.name}</span>
                    </div>
                    <div className="mt-1.5"><StatusBadge level="SOON" /></div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Threat Actor Profile">
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              {ACTORS.map((a) => {
                const active = actor === a.id;
                return (
                  <button key={a.id} onClick={() => setActor(a.id)} className={`text-left p-4 rounded-md border transition-all ${
                    active ? "border-critical bg-critical/5" : "border-border bg-surface-2 hover:border-critical/40"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">{a.tag}</span>
                      <StatusBadge level={a.level as any} />
                    </div>
                    <div className="mt-2 text-sm font-semibold">{a.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">{a.desc}</div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {a.traits.map((t) => (
                        <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground">{t}</span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Simulation Parameters">
            <div className="p-5 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground">Duration</label>
                  <span className="font-mono text-sm text-primary">{duration}s</span>
                </div>
                <input type="range" min={300} max={600} step={10} value={duration} onChange={(e) => setDuration(+e.target.value)} className="w-full accent-primary" />
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
                  <span>300s</span><span>450s</span><span>600s</span>
                </div>
              </div>
              <button onClick={() => setUq(!uq)} className="w-full panel-2 px-3 py-2.5 flex items-center gap-3 hover:border-primary/40">
                <span className={`relative h-5 w-9 rounded-full ${uq ? "bg-primary" : "bg-surface-2 border border-border"}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition-transform ${uq ? "translate-x-4" : "translate-x-0.5"}`} />
                </span>
                <div className="text-left flex-1">
                  <div className="text-sm">Uncertainty Quantification</div>
                  <div className="text-[10px] font-mono text-muted-foreground">Monte Carlo · 500 runs</div>
                </div>
              </button>
              <button onClick={() => setSa(!sa)} className="w-full panel-2 px-3 py-2.5 flex items-center gap-3 hover:border-primary/40">
                <span className={`relative h-5 w-9 rounded-full ${sa ? "bg-primary" : "bg-surface-2 border border-border"}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition-transform ${sa ? "translate-x-4" : "translate-x-0.5"}`} />
                </span>
                <div className="text-left flex-1">
                  <div className="text-sm">Sensitivity Analysis</div>
                  <div className="text-[10px] font-mono text-muted-foreground">Sobol indices · 12 params</div>
                </div>
              </button>
            </div>
          </Panel>

          <Panel title="Mission Brief">
            <div className="p-5 space-y-2 text-xs font-mono">
              <div className="flex justify-between"><span className="text-muted-foreground">TARGET</span><span>{sat}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">VECTOR</span><span className="text-primary">{LIVE_ATTACKS.find(a => a.id === selectedAttack)?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">ACTOR</span><span className="text-high">{ACTORS.find(a => a.id === actor)?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">DURATION</span><span>{duration}s</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">TICKS</span><span>{duration * 10}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">UQ / SA</span><span>{uq ? "ON" : "OFF"} / {sa ? "ON" : "OFF"}</span></div>
            </div>
          </Panel>

          <Link to="/results" className="block">
            <button className="w-full inline-flex items-center justify-center gap-2 px-5 py-4 rounded-md bg-critical text-critical-foreground font-display font-bold tracking-wider hover:bg-critical/90 shadow-[0_0_30px_-8px_oklch(0.65_0.24_22_/_0.6)]">
              <Play className="h-4 w-4" /> RUN SIMULATION
              <ChevronRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
