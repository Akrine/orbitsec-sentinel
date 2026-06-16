import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Panel, StatusBadge } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { useActiveSatellite } from "@/lib/activeSatellite";
import { toast } from "sonner";

export const Route = createFileRoute("/scenarios")({
  head: () => ({
    meta: [
      { title: "Mission Scenarios — OrbitSec" },
      { name: "description", content: "Multi-phase state-forwarding attack scenarios against satellite assets." },
    ],
  }),
  component: Scenarios,
});

type Phase = { name: string; tag: string };
type ScenarioDef = {
  id: string;
  name: string;
  short: string;
  desc: string;
  phases: [Phase, Phase, Phase];
};

const SCENARIOS: ScenarioDef[] = [
  {
    id: "comms_disruption",
    name: "Communications Disruption",
    short: "RF → GS → CMD",
    desc: "Three-phase communications disruption attack. Each phase builds on previous damage state.",
    phases: [
      { name: "RF Jamming", tag: "RF" },
      { name: "Ground Station Compromise", tag: "GS" },
      { name: "Command Injection", tag: "CMD" },
    ],
  },
  {
    id: "earth_observation_espionage",
    name: "Earth Obs. Espionage",
    short: "AI → CMD → GS",
    desc: "Stealth-oriented imagery exfiltration chain. Adaptive GNSS misdirection enables covert reorientation.",
    phases: [
      { name: "AI-Adaptive GNSS Spoofing", tag: "AI" },
      { name: "Command Injection", tag: "CMD" },
      { name: "Ground Station Compromise", tag: "GS" },
    ],
  },
  {
    id: "gps_constellation_attack",
    name: "GPS Constellation Attack",
    short: "GPS → AI → CMD",
    desc: "Time-and-position corruption escalation that cascades into illicit telecommand execution.",
    phases: [
      { name: "GPS Spoofing", tag: "GPS" },
      { name: "AI-Adaptive GNSS Spoofing", tag: "AI" },
      { name: "Command Injection", tag: "CMD" },
    ],
  },
];

const SUBSYSTEMS = ["ADCS", "EPS", "Comms", "Thermal", "Payload", "GroundSegment"] as const;

const ACTOR_MAP: Record<string, string> = {
  nation: "NATION_STATE",
  apt: "SOPHISTICATED_APT",
  insider: "INSIDER_THREAT",
};

const inputCls = "w-full panel-2 px-2.5 py-1.5 text-xs font-mono bg-transparent rounded outline-none focus:border-primary/50";

function color(v: number) {
  if (v < 25) return { txt: "text-critical", bar: "bg-critical" };
  if (v < 50) return { txt: "text-high", bar: "bg-high" };
  if (v < 75) return { txt: "text-medium", bar: "bg-medium" };
  return { txt: "text-success", bar: "bg-success" };
}

function degColor(deg: number) {
  if (deg >= 50) return "text-critical";
  if (deg >= 30) return "text-high";
  return "text-success";
}

type PhaseResult = {
  phase: number;
  label: string;
  mission_degradation_percent: number;
  starting_health: Record<string, number>;
  ending_health: Record<string, number>;
};

type ScenarioResult = {
  scenario_name: string;
  scenario_description: string;
  scenario_success: boolean;
  final_degradation_percent: number;
  success_threshold: number;
  total_recovery_hours: number;
  total_cost_usd: number;
  phases: PhaseResult[];
};

function Scenarios() {
  const { activeName, activeConfig } = useActiveSatellite();
  const [mode, setMode] = useState<"single" | "const">("single");
  const [scenId, setScenId] = useState("comms_disruption");
  const [forward, setForward] = useState(true);
  const [actor, setActor] = useState("nation");
  const [severity, setSeverity] = useState(70);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ScenarioResult | null>(null);

  const scen = SCENARIOS.find((s) => s.id === scenId)!;
  const hasActive = !!activeName && !!activeConfig;

  async function execute() {
    if (!hasActive) return;
    setRunning(true);
    setResult(null);
    try {
      const cfg = activeConfig as Record<string, unknown>;
      const body = {
        scenario_id: scenId,
        mode: "single",
        satellite_name: activeName,
        norad_id: cfg.norad_id,
        orbit_type: cfg.orbit_type,
        altitude_km: cfg.altitude_km,
        satellite_config: activeConfig,
        threat_actor_profile: ACTOR_MAP[actor],
      };
      const res = await apiFetch("/api/scenario/execute", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Scenario failed: ${res.status}`);
      const data = (await res.json()) as ScenarioResult;
      setResult(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scenario execution failed");
    } finally {
      setRunning(false);
    }
  }

  // State-forwarding verification
  let forwardingBadge: { text: string; cls: string } | null = null;
  if (result && result.phases?.length >= 2) {
    const p1 = result.phases[0];
    const p2 = result.phases[1];
    let maxDiff = 0;
    for (const s of SUBSYSTEMS) {
      const a = p1.ending_health?.[s] ?? 0;
      const b = p2.starting_health?.[s] ?? 0;
      maxDiff = Math.max(maxDiff, Math.abs(a - b));
    }
    forwardingBadge =
      maxDiff <= 5
        ? { text: "STATE FORWARDING VERIFIED (max diff ≤5pp)", cls: "bg-success/15 text-success border-success/40" }
        : { text: "STATE FORWARDING ACTIVE", cls: "bg-primary/15 text-primary border-primary/40" };
  }

  return (
    <AppShell title="Mission Scenarios" subtitle="MULTI-PHASE STATE-FORWARDING ATTACKS">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* LEFT: Configuration */}
        <div className="xl:col-span-4 space-y-4">
          <Panel title="Active Target">
            <div className="p-3">
              {hasActive ? (
                <div className="panel-2 px-2.5 py-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-[10px] font-mono font-bold text-primary">SAT</span>
                    <span className="text-xs font-mono flex-1 text-foreground">{activeName}</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-dot" />
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-muted-foreground">
                    <div>
                      <div className="uppercase tracking-wider">Orbit</div>
                      <div className="text-foreground">{String((activeConfig as Record<string, unknown>).orbit_type ?? "—")}</div>
                    </div>
                    <div>
                      <div className="uppercase tracking-wider">Alt (km)</div>
                      <div className="text-foreground">{String((activeConfig as Record<string, unknown>).altitude_km ?? "—")}</div>
                    </div>
                    <div>
                      <div className="uppercase tracking-wider">Mission</div>
                      <div className="text-foreground">{String((activeConfig as Record<string, unknown>).mission_type ?? "—")}</div>
                    </div>
                  </div>
                  <Link to="/configure" className="block text-[10px] font-mono text-primary hover:underline pt-1">
                    Configure in Satellite Config →
                  </Link>
                </div>
              ) : (
                <div className="panel-2 px-2.5 py-2 text-xs font-mono text-muted-foreground">
                  No satellite configured. Set one up in{" "}
                  <Link to="/configure" className="text-primary hover:underline">Satellite Config</Link> first.
                </div>
              )}
            </div>
          </Panel>

          <Panel title="Simulation Mode">
            <div className="p-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode("single")}
                className={`px-3 py-2 rounded border text-[11px] font-mono uppercase tracking-wider ${
                  mode === "single" ? "border-primary/60 bg-primary/15 text-primary" : "panel-2 text-muted-foreground"
                }`}
              >Single Satellite</button>
              <button
                onClick={() => setMode("const")}
                className={`px-3 py-2 rounded border text-[11px] font-mono uppercase tracking-wider ${
                  mode === "const" ? "border-primary/60 bg-primary/15 text-primary" : "panel-2 text-muted-foreground"
                }`}
              >Constellation</button>
            </div>
          </Panel>

          <Panel title="Scenario">
            <div className="p-3 space-y-3">
              <select value={scenId} onChange={(e) => setScenId(e.target.value)} className={inputCls}>
                {SCENARIOS.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.short})</option>
                ))}
              </select>

              <div className="panel-2 p-2.5">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Phase Breakdown</div>
                <div className="space-y-1.5">
                  {scen.phases.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/15 border border-primary/30 text-primary">
                        P{i + 1}
                      </span>
                      <span className="text-xs font-mono flex-1">{p.name}</span>
                      {i < 2 && <span className="text-[10px] font-mono text-muted-foreground">NEXT</span>}
                    </div>
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-2 panel-2 px-2.5 py-2 cursor-pointer">
                <input type="checkbox" checked={forward} onChange={(e) => setForward(e.target.checked)} className="accent-primary mt-0.5" />
                <div>
                  <div className="text-xs font-mono font-semibold">State Forwarding</div>
                  <div className="text-[10px] font-mono text-muted-foreground">Phase 2 starts with Phase 1's damage state</div>
                </div>
              </label>
            </div>
          </Panel>

          <Panel title="Threat Actor">
            <div className="p-3 space-y-1.5">
              {[
                { id: "nation", name: "Nation-State", risk: "CRITICAL" as const },
                { id: "apt", name: "Sophisticated APT", risk: "HIGH" as const },
                { id: "insider", name: "Insider Threat", risk: "HIGH" as const },
              ].map((a) => (
                <button
                  key={a.id}
                  onClick={() => setActor(a.id)}
                  className={`w-full text-left panel-2 px-2.5 py-2 flex items-center gap-2 ${actor === a.id ? "border-primary/60 bg-primary/5" : ""}`}
                >
                  <span className="text-xs font-mono flex-1">{a.name}</span>
                  <StatusBadge level={a.risk} />
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Severity">
            <div className="p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Attack Severity</span>
                <span className="text-sm font-mono font-bold text-primary">{severity}%</span>
              </div>
              <input type="range" min={0} max={100} value={severity} onChange={(e) => setSeverity(+e.target.value)} className="w-full accent-primary" />
            </div>
          </Panel>

          <button
            onClick={execute}
            disabled={!hasActive || running}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-md bg-gradient-to-r from-primary to-accent text-primary-foreground font-display font-bold tracking-wider hover:brightness-110 shadow-[0_0_30px_-8px_oklch(0.78_0.16_195_/_0.6)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? "EXECUTING SCENARIO..." : "EXECUTE SCENARIO"}
          </button>
        </div>

        {/* RIGHT: Results */}
        <div className="xl:col-span-8 space-y-4">
          {!result ? (
            <Panel title="Scenario Results">
              <div className="p-6 text-center text-xs font-mono text-muted-foreground">
                {running ? "Executing scenario, please wait..." : "Configure and execute a scenario to see real results."}
              </div>
            </Panel>
          ) : (
            <>
              <Panel title="Scenario Results">
                <div className="p-4">
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">Scenario</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <h3 className="text-lg font-display font-semibold">{result.scenario_name}</h3>
                        {result.scenario_success ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded border bg-success/15 text-success border-success/40">
                            <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" /> SUCCESS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded border bg-medium/15 text-medium border-medium/40">
                            <span className="h-1.5 w-1.5 rounded-full bg-medium" /> CONTAINED
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-[12px] font-mono text-muted-foreground">
                        {result.scenario_description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="panel-2 p-3">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Final Degradation</div>
                      <div className={`mt-1 text-2xl font-display font-bold ${degColor(result.final_degradation_percent)}`}>
                        {result.final_degradation_percent.toFixed(1)}%
                      </div>
                    </div>
                    <div className="panel-2 p-3">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Threshold</div>
                      <div className="mt-1 text-2xl font-display font-bold">{result.success_threshold}%</div>
                    </div>
                    <div className="panel-2 p-3">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Recovery</div>
                      <div className="mt-1 text-2xl font-display font-bold text-high">{result.total_recovery_hours.toFixed(1)}h</div>
                    </div>
                    <div className="panel-2 p-3">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Est. Cost</div>
                      <div className="mt-1 text-2xl font-display font-bold text-success">
                        ${Math.round(result.total_cost_usd).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {forwardingBadge && (
                    <div className={`mt-3 flex items-center gap-2 panel-2 px-2.5 py-2 border ${forwardingBadge.cls}`}>
                      <span className="text-xs font-mono">{forwardingBadge.text}</span>
                    </div>
                  )}
                </div>
              </Panel>

              <div className="space-y-3">
                {result.phases.map((p) => {
                  const forwarded = p.phase === 2 || p.phase === 3;
                  return (
                    <Panel key={p.phase}>
                      <div className="p-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-primary/15 border border-primary/30 text-primary">
                            PHASE {p.phase}
                          </span>
                          <span className="text-sm font-mono font-semibold">{p.label}</span>
                          {forwarded && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded border bg-primary/15 text-primary border-primary/40">
                              STATE FORWARDED
                            </span>
                          )}
                          <span className="ml-auto text-[10px] font-mono text-muted-foreground">Degradation</span>
                          <span className={`text-lg font-display font-bold ${degColor(p.mission_degradation_percent)}`}>
                            {p.mission_degradation_percent.toFixed(1)}%
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {SUBSYSTEMS.map((s) => {
                            const start = p.starting_health?.[s] ?? 0;
                            const end = p.ending_health?.[s] ?? 0;
                            const c = color(end);
                            return (
                              <div key={s} className="panel-2 p-2">
                                <div className="flex items-center justify-between text-[10px] font-mono">
                                  <span className="text-muted-foreground uppercase tracking-wider">{s}</span>
                                  <span className="font-mono">
                                    <span className="text-muted-foreground">{start.toFixed(0)}%</span>
                                    <span className="text-muted-foreground mx-1">→</span>
                                    <span className={`font-bold ${c.txt}`}>{end.toFixed(0)}%</span>
                                  </span>
                                </div>
                                <div className="mt-1 h-1 bg-background rounded overflow-hidden relative">
                                  <div className={`absolute inset-y-0 left-0 ${c.bar}`} style={{ width: `${end}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </Panel>
                  );
                })}
              </div>
            </>
          )}

          <button
            disabled
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-md text-white font-display font-bold tracking-wider opacity-50 cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, oklch(0.55 0.2 250) 0%, oklch(0.42 0.18 260) 100%)" }}
          >
            DOWNLOAD SCENARIO PDF REPORT
          </button>
        </div>
      </div>
    </AppShell>
  );
}
