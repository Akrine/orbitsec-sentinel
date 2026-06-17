import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Panel } from "@/components/AppShell";
import { apiFetch, pluralize } from "@/lib/api";
import { useActiveSatellite } from "@/lib/activeSatellite";

export const Route = createFileRoute("/adversary")({
  head: () => ({
    meta: [
      { title: "AI Adversary — OrbitSec" },
      { name: "description", content: "Autonomous LLM-driven red-team agent that iteratively probes and attacks your satellite." },
    ],
  }),
  component: Adversary,
});

const OBJECTIVES = [
  { id: "max", backend: "maximum_damage", name: "Maximum Damage", desc: "Inflict the highest possible mission degradation across all subsystems", code: "MAX", color: "critical" as const },
  { id: "stealth", backend: "stealth", name: "Stealth Campaign", desc: "Persist undetected. Minimize anomaly signatures while exfiltrating telemetry", code: "STL", color: "primary" as const },
  { id: "payload", backend: "targeted", name: "Targeted Payload Disruption", desc: "Surgical strike on imaging payload while keeping bus nominal", code: "PLD", color: "high" as const },
];

const ATTACK_COLORS: Record<string, { border: string; text: string; bg: string; border2: string }> = {
  gps_spoofing: { border: "border-l-primary", text: "text-primary", bg: "bg-primary/10", border2: "border-primary/30" },
  rf_jamming: { border: "border-l-medium", text: "text-medium", bg: "bg-medium/10", border2: "border-medium/30" },
  command_injection: { border: "border-l-high", text: "text-high", bg: "bg-high/10", border2: "border-high/30" },
  ground_station_compromise: { border: "border-l-critical", text: "text-critical", bg: "bg-critical/10", border2: "border-critical/30" },
  ai_adaptive_spoofing: { border: "border-l-[oklch(0.55_0.22_300)]", text: "text-[oklch(0.7_0.18_300)]", bg: "bg-[oklch(0.55_0.22_300)]/10", border2: "border-[oklch(0.55_0.22_300)]/30" },
};
const attackColor = (a: string) => ATTACK_COLORS[a] ?? { border: "border-l-border", text: "text-foreground", bg: "bg-background/60", border2: "border-border" };
const fmtAttack = (a: string) => a.replace(/_/g, " ").toUpperCase();

const STOP_REASONS: Record<string, string> = {
  satellite_compromised: "Satellite Compromised (>75%)",
  max_iterations: "Max Iterations Reached",
  abort: "Agent Aborted",
  time_budget: "Time Budget Exhausted",
  no_attack: "Agent Halted (no further attack)",
};

type Iteration = {
  iteration: number;
  attack_chosen: string;
  severity: number;
  delta_degradation: number;
  cumulative_degradation: number;
  reasoning: string;
  subsystem_impacts: Record<string, number>;
  ending_health: Record<string, number>;
};

type AdversaryResult = {
  iterations: Iteration[];
  total_degradation_percent: number;
  iterations_run: number;
  total_cost_usd: number;
  attack_sequence: string[];
  stop_reason: string;
  pdf_b64?: string | null;
};

function healthClass(v: number) {
  if (v < 25) return { text: "text-critical", bar: "bg-critical" };
  if (v < 50) return { text: "text-high", bar: "bg-high" };
  if (v < 75) return { text: "text-medium", bar: "bg-medium" };
  return { text: "text-success", bar: "bg-success" };
}

function deltaClass(d: number) {
  if (d >= 30) return "text-critical border-critical/30 bg-critical/10";
  if (d >= 15) return "text-medium border-medium/30 bg-medium/10";
  return "text-success border-success/30 bg-success/10";
}

function Adversary() {
  const { activeName, activeConfig } = useActiveSatellite();
  const [obj, setObj] = useState("max");
  const [iters, setIters] = useState(5);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AdversaryResult | null>(null);

  const cfg = (activeConfig ?? {}) as Record<string, any>;
  const orbitType = cfg.orbit_type as string | undefined;
  const altitude = cfg.altitude_km as number | undefined;
  const missionType = cfg.mission_type as string | undefined;
  const canDeploy = !!activeName && !!activeConfig && !running;

  async function deploy() {
    if (!activeName || !activeConfig) return;
    const objective = OBJECTIVES.find((o) => o.id === obj)?.backend ?? "maximum_damage";
    setRunning(true);
    setResult(null);
    try {
      const res = await apiFetch("/api/agentic_adversary", {
        method: "POST",
        body: JSON.stringify({
          satellite_name: activeName,
          norad_id: cfg.norad_id,
          orbit_type: cfg.orbit_type,
          altitude_km: cfg.altitude_km,
          satellite_config: activeConfig,
          objective,
          max_iterations: iters,
          duration_per_tick: 120,
          threat_actor_profile: "NATION_STATE",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as AdversaryResult;
      setResult(data);
    } catch (e) {
      toast.error("Adversary run failed");
      console.error(e);
    } finally {
      setRunning(false);
    }
  }

  const totalDeg = result?.total_degradation_percent ?? 0;
  const lastIter = result?.iterations[result.iterations.length - 1];
  const endingHealth = lastIter?.ending_health ?? {};
  const compromised = totalDeg >= 40;

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
          <Panel title="Active Target">
            <div className="p-3">
              {activeName ? (
                <div className="panel-2 border-primary/60 bg-primary/10 px-3 py-2.5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-primary">SAT</span>
                    <span className="text-xs font-mono font-semibold flex-1">{activeName}</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-dot" />
                  </div>
                  <div className="grid grid-cols-1 gap-0.5 text-[10px] font-mono text-muted-foreground">
                    {orbitType && <div className="flex justify-between"><span className="uppercase tracking-wider">Orbit</span><span className="text-foreground">{orbitType}</span></div>}
                    {altitude !== undefined && <div className="flex justify-between"><span className="uppercase tracking-wider">Altitude</span><span className="text-foreground">{altitude} km</span></div>}
                    {missionType && <div className="flex justify-between"><span className="uppercase tracking-wider">Mission</span><span className="text-foreground">{missionType}</span></div>}
                  </div>
                  <Link to="/configure" className="block mt-2 text-[10px] font-mono uppercase tracking-wider text-primary hover:underline">
                    Configure in Satellite Config →
                  </Link>
                </div>
              ) : (
                <div className="panel-2 border-high/40 bg-high/5 px-3 py-2.5">
                  <p className="text-[11px] font-mono text-high">No satellite configured. Set one up in Satellite Config first.</p>
                  <Link to="/configure" className="block mt-2 text-[10px] font-mono uppercase tracking-wider text-primary hover:underline">
                    Go to Satellite Config →
                  </Link>
                </div>
              )}
            </div>
          </Panel>

          <Panel title="Objective Mode">
            <div className="p-3 space-y-2">
              {OBJECTIVES.map((o) => {
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
                      <span className={`w-8 text-[10px] font-mono font-bold ${iconColor}`}>{o.code}</span>
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

          <button
            onClick={deploy}
            disabled={!canDeploy}
            className={`w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-md text-white font-display font-bold tracking-wider shadow-[0_0_40px_-8px_oklch(0.55_0.22_300_/_0.8)] ${canDeploy ? "hover:brightness-110 cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
            style={{ background: "linear-gradient(135deg, #6a1b9a 0%, #4a148c 100%)" }}
          >
            {running ? "ADVERSARY RUNNING..." : "DEPLOY ADVERSARY"}
          </button>
        </div>

        {/* CENTER: Live Iteration Feed */}
        <div className="xl:col-span-6 space-y-3">
          <Panel
            title="Live Iteration Feed"
            action={
              result ? (
                <span className="text-[10px] font-mono text-muted-foreground">{pluralize(result.iterations_run, "iteration")}</span>
              ) : null
            }
          >
            <div className="p-3 space-y-2.5 max-h-[860px] overflow-auto">
              {running && (
                <div className="panel-2 p-4 border-l-4 border-l-[oklch(0.55_0.22_300)] flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.55_0.22_300)] pulse-dot" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-mono uppercase tracking-[0.16em] font-semibold text-[oklch(0.7_0.18_300)]">
                      Deploying Adversary — running {pluralize(iters, "iteration")}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground mt-1">
                      This may take 30–90 seconds. Real LLM agent loop in progress.
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.7_0.18_300)] animate-pulse" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.7_0.18_300)] animate-pulse [animation-delay:200ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.7_0.18_300)] animate-pulse [animation-delay:400ms]" />
                  </div>
                </div>
              )}

              {!running && !result && (
                <div className="panel-2 p-6 text-center">
                  <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                    No adversary run yet. Configure target and deploy.
                  </p>
                </div>
              )}

              {result?.iterations.map((it) => {
                const col = attackColor(it.attack_chosen);
                const top3 = Object.entries(it.subsystem_impacts ?? {})
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 3);
                return (
                  <div key={it.iteration} className={`panel-2 border-l-4 ${col.border} p-3`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded bg-background/60 border border-border">
                        ITERATION {String(it.iteration).padStart(2, "0")}
                      </span>
                      <span className={`inline-flex items-center text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${col.bg} border ${col.border2} ${col.text}`}>
                        {fmtAttack(it.attack_chosen)}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">sev {it.severity.toFixed(2)}</span>
                      <span className={`ml-auto inline-flex items-center text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${deltaClass(it.delta_degradation)}`}>
                        +{it.delta_degradation.toFixed(1)}% → {it.cumulative_degradation.toFixed(1)}%
                      </span>
                    </div>
                    <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground font-mono italic">
                      {it.reasoning}
                    </p>
                    {top3.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {top3.map(([sub, val]) => (
                          <span key={sub} className="inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-background/60 border border-border">
                            <span className="text-muted-foreground uppercase tracking-wider mr-1">{sub}</span>
                            <span className="font-bold text-foreground">{(val as number).toFixed(1)}%</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => {
                if (!result?.pdf_b64) return;
                const ts = new Date().toISOString().replace(/[:.]/g, "-");
                const filename = `orbitsec_agentic_adversary_${ts}.pdf`;
                const byteChars = atob(result.pdf_b64);
                const byteNums = new Array(byteChars.length);
                for (let i = 0; i < byteChars.length; i++) {
                  byteNums[i] = byteChars.charCodeAt(i);
                }
                const bytes = new Uint8Array(byteNums);
                const blob = new Blob([bytes], { type: "application/pdf" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }}
              disabled={!result?.pdf_b64}
              className={`inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-md text-white font-display font-bold tracking-wider ${result?.pdf_b64 ? "hover:brightness-110 cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
              style={{ background: "linear-gradient(135deg, #6a1b9a 0%, #4a148c 100%)" }}
            >
              DOWNLOAD ADVERSARY REPORT PDF
            </button>
            <button
              onClick={() => {
                if (!result) return;
                const ts = new Date().toISOString().replace(/[:.]/g, "-");
                const filename = `orbitsec_adversary_${ts}.json`;
                const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }}
              disabled={!result}
              className={`inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-md panel font-display font-semibold tracking-wider ${result ? "hover:brightness-110 cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
            >
              EXPORT JSON / SPARTA
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
                  {totalDeg.toFixed(1)}%
                </div>
                <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                  Mission Degradation
                </div>
                {result && (
                  <div className="mt-2 inline-flex">
                    {compromised ? (
                      <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] px-2.5 py-1 rounded border border-[oklch(0.55_0.22_300)]/40 bg-[oklch(0.55_0.22_300)]/10 text-[oklch(0.7_0.18_300)]">
                        Compromised
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] px-2.5 py-1 rounded border border-success/40 bg-success/10 text-success">
                        Defended
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Gradient health bar */}
              <div className="mt-4 relative h-3 rounded-full overflow-hidden panel-2">
                <div className="absolute inset-0 bg-gradient-to-r from-success via-medium via-high to-critical opacity-30" />
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-success via-medium via-high to-critical"
                  style={{ width: `${Math.min(100, totalDeg)}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-foreground shadow-[0_0_8px_oklch(0.92_0.005_240)]"
                  style={{ left: `${Math.min(100, totalDeg)}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-muted-foreground mt-1">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>

              {/* Subsystems — ending health from last iteration */}
              {Object.keys(endingHealth).length > 0 && (
                <div className="mt-4 space-y-1.5">
                  {Object.entries(endingHealth).map(([name, raw]) => {
                    const v = raw as number;
                    const c = healthClass(v);
                    return (
                      <div key={name} className="panel-2 px-2.5 py-1.5">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-muted-foreground uppercase tracking-wider">{name}</span>
                          <span className={`font-bold ${c.text}`}>{v.toFixed(1)}%</span>
                        </div>
                        <div className="mt-1 h-1 bg-background rounded overflow-hidden">
                          <div className={`h-full ${c.bar}`} style={{ width: `${Math.max(0, Math.min(100, v))}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Panel>

          {result && (
            <Panel title="Stop Reason">
              <div className="p-3">
                <div className="panel-2 border-critical/40 bg-critical/5 px-3 py-2.5">
                  <div className="text-xs font-mono font-bold text-critical">
                    {STOP_REASONS[result.stop_reason] ?? result.stop_reason}
                  </div>
                </div>
              </div>
            </Panel>
          )}

          {result && (
            <Panel title="Final Summary">
              <div className="p-3 space-y-2">
                <div className="panel-2 px-2.5 py-2 flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Total Degradation</span>
                  <span className="text-sm font-mono font-bold text-critical">{result.total_degradation_percent.toFixed(1)}%</span>
                </div>
                <div className="panel-2 px-2.5 py-2 flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Iterations Run</span>
                  <span className="text-sm font-mono font-bold">{result.iterations_run}</span>
                </div>
                <div className="panel-2 px-2.5 py-2 flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Est. Total Cost</span>
                  <span className="text-sm font-mono font-bold text-high">${Math.round(result.total_cost_usd).toLocaleString()}</span>
                </div>
                <div className="panel-2 p-2.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Attack Chain</div>
                  <div className="flex flex-wrap gap-1 items-center">
                    {result.attack_sequence.map((a, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[10px] font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-background/60 border border-border text-foreground">{fmtAttack(a)}</span>
                        {i < result.attack_sequence.length - 1 && <span className="text-primary">→</span>}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </AppShell>
  );
}
