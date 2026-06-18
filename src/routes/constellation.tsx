import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, Panel, StatusBadge } from "@/components/AppShell";
import { ConstellationNetwork } from "@/components/ConstellationNetwork";
import { apiFetch, getToken, pluralize } from "@/lib/api";

export const Route = createFileRoute("/constellation")({
  head: () => ({
    meta: [
      { title: "Constellation Mode — OrbitSec" },
      { name: "description", content: "Multi-asset cascading attack simulation across a satellite constellation." },
    ],
  }),
  component: Constellation,
});

// Saved config from /api/configs
type SavedConfig = {
  name: string;
  created_at?: string;
  config: any;
};

// Roster entry — keeps full config
type RosterEntry = {
  id: string;
  name: string;
  config: any;
};

const ATTACKS_LIVE = [
  { id: "gnss", label: "GPS / GNSS Spoofing" },
  { id: "rf", label: "RF Jamming" },
  { id: "cmd", label: "Command Injection" },
  { id: "gs", label: "Ground Station Compromise" },
  { id: "ai", label: "AI-Adaptive GNSS Spoofing" },
];

const ATTACK_MAP: Record<string, string> = {
  gnss: "gps_spoofing",
  rf: "rf_jamming",
  cmd: "command_injection",
  gs: "ground_station",
  ai: "ai_adaptive_spoofing",
};
const ACTOR_MAP: Record<string, string> = {
  nation: "NATION_STATE",
  apt: "SOPHISTICATED_APT",
  insider: "INSIDER_THREAT",
};
const TOPO_MAP: Record<string, string> = {
  "None": "none",
  "Partial Mesh": "partial",
  "Full Mesh": "full",
};

type SubsystemImpact = Record<string, number>;
type SatelliteResult = {
  satellite_name: string;
  mission_degradation_percent: number;
  recovery_time_hours: number;
  estimated_cost_usd: number;
  subsystem_impacts?: SubsystemImpact;
  cascade_applied?: boolean;
  cascade_description?: string;
};
type ConstellationResponse = {
  aggregate_degradation_percent: number;
  max_degradation_percent: number;
  total_recovery_time_hours: number;
  total_estimated_cost_usd: number;
  satellite_results: SatelliteResult[];
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}

const inputCls = "w-full panel-2 px-2.5 py-1.5 text-xs font-mono bg-transparent rounded outline-none focus:border-primary/50";

function valueM(cfg: any): string {
  const v = cfg?.financial?.asset_value_usd ?? 0;
  return `$${(v / 1e6).toFixed(0)}M`;
}

function fmtCost(v: number): string {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `$${Math.round(v).toLocaleString()}`;
}

function degClass(v: number): string {
  if (v >= 70) return "text-critical";
  if (v >= 50) return "text-high";
  if (v >= 30) return "text-medium";
  return "text-success";
}
function degBar(v: number): string {
  if (v >= 70) return "bg-critical";
  if (v >= 50) return "bg-high";
  if (v >= 30) return "bg-medium";
  return "bg-success";
}
function degRisk(v: number): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
  if (v >= 70) return "CRITICAL";
  if (v >= 50) return "HIGH";
  if (v >= 30) return "MEDIUM";
  return "LOW";
}

function Constellation() {
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [sats, setSats] = useState<RosterEntry[]>([]);
  const [pickName, setPickName] = useState<string>("");

  const [gs, setGs] = useState(8);
  const [shared, setShared] = useState(4);
  const [topo, setTopo] = useState("None");
  const [indep, setIndep] = useState(false);

  const [attack, setAttack] = useState("ai");
  const [actor, setActor] = useState("nation");
  const [severity, setSeverity] = useState(75);
  const [duration, setDuration] = useState(450);
  const [unc, setUnc] = useState(true);
  const [sens, setSens] = useState(true);

  const [running, setRunning] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [result, setResult] = useState<ConstellationResponse | null>(null);

  // Load saved configs once
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/api/configs");
        if (!res.ok) throw new Error(`Failed to load configs (${res.status})`);
        const data = (await res.json()) as SavedConfig[];
        setSavedConfigs(data);
        // Default-load first 2–4 configs
        const initial = data.slice(0, Math.min(4, Math.max(2, data.length))).map((c, i) => ({
          id: `r${i}_${c.name}`,
          name: c.name,
          config: c.config,
        }));
        setSats(initial);
        setPickName(data[0]?.name ?? "");
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to load saved configurations");
      }
    })();
  }, []);

  const atMax = sats.length >= 12;

  const addSat = () => {
    if (atMax) return;
    const pick = savedConfigs.find((c) => c.name === pickName) ?? savedConfigs[0];
    if (!pick) return;
    const baseName = pick.name;
    const existingNames = new Set(sats.map((s) => s.name));
    let displayName = baseName;
    if (existingNames.has(baseName)) {
      let n = 2;
      while (existingNames.has(`${baseName} #${n}`)) n++;
      displayName = `${baseName} #${n}`;
    }
    setSats([...sats, { id: `r${Date.now()}_${displayName}`, name: displayName, config: pick.config }]);
  };
  const removeSat = (id: string) => setSats(sats.filter((s) => s.id !== id));

  const run = async () => {
    if (sats.length < 2) {
      toast.error("Add at least 2 satellites to the roster");
      return;
    }
    setRunning(true);
    try {
      const body: any = {
        attack_type: ATTACK_MAP[attack],
        severity: severity / 100,
        duration_seconds: duration,
        threat_actor_profile: ACTOR_MAP[actor],
        satellites: sats.map((s) => ({
          name: s.name,
          norad_id: s.config?.norad_id,
          orbit_type: s.config?.orbit_type,
          altitude_km: s.config?.altitude_km,
          asset_value_m: (s.config?.financial?.asset_value_usd ?? 0) / 1e6,
          satellite_config: s.config,
        })),
        shared_infra: {
          total_ground_stations: gs,
          shared_ground_stations: shared,
          crosslink_topology: TOPO_MAP[topo] ?? "none",
          independent_network_segments: indep,
        },
      };
      if (ATTACK_MAP[attack] === "ground_station") {
        body.attack_vector = "cyber_attack";
        body.compromise_level = "operator_workstation";
        body.covert_operation = true;
      }
      if (ATTACK_MAP[attack] === "rf_jamming") {
        body.jammer_power_watts = 100;
        body.center_frequency_mhz = 2200;
        body.jamming_type = "barrage";
      }
      const res = await apiFetch("/api/constellation/simulate", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Constellation simulation failed (${res.status}): ${txt.slice(0, 160)}`);
      }
      const data = (await res.json()) as ConstellationResponse;
      setResult(data);
      toast.success("Constellation simulation complete");
    } catch (e: any) {
      toast.error(e?.message ?? "Constellation simulation failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <AppShell title="Constellation Mode" subtitle="MULTI-ASSET CASCADING ATTACK · LIVE">
      {/* Mode toggle */}
      <div className="flex items-center gap-2 mb-4">
        <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground mr-1">Simulation Mode</div>
        <Link to="/attack" className="panel-2 px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground">
          Single Satellite
        </Link>
        <button className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider rounded border bg-primary/15 border-primary/40 text-primary">
          Constellation
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* LEFT: Roster + Infra */}
        <div className="xl:col-span-3 space-y-4">
          <Panel
            title={`Satellite Roster · ${sats.length}/12`}
            action={
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                MIN 2 · MAX 12
              </span>
            }
          >
            <div className="p-3 space-y-2 max-h-[480px] overflow-auto">
              <div className="flex gap-1.5">
                <select
                  value={pickName}
                  onChange={(e) => setPickName(e.target.value)}
                  className={inputCls}
                  disabled={savedConfigs.length === 0 || atMax}
                >
                  {savedConfigs.length === 0 ? (
                    <option value="">No saved configs</option>
                  ) : (
                    savedConfigs.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)
                  )}
                </select>
                <button
                  onClick={addSat}
                  disabled={atMax || savedConfigs.length === 0}
                  className="panel-2 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-primary hover:text-primary/80 disabled:opacity-40"
                >
                  Add
                </button>
              </div>
              {atMax && (
                <div className="text-[10px] font-mono text-muted-foreground">Maximum 12 satellites</div>
              )}

              {sats.length === 0 && (
                <div className="text-xs font-mono text-muted-foreground text-center py-8 panel-2">
                  Add 2–12 satellites to the constellation
                </div>
              )}
              {sats.map((s) => {
                const cfg = s.config ?? {};
                return (
                  <div key={s.id} className="panel-2 p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-8 text-[10px] font-mono font-bold text-primary">SAT</span>
                      <span className="text-xs font-mono font-semibold flex-1 truncate">{s.name}</span>
                      <button onClick={() => removeSat(s.id)} className="h-5 px-1.5 rounded hover:bg-background text-muted-foreground hover:text-critical flex items-center justify-center">
                        <span className="text-[9px] font-mono">DEL</span>
                      </button>
                    </div>
                    <div className="mt-1 text-[10px] font-mono text-muted-foreground">
                      {cfg.orbit_type ?? "—"} · {cfg.altitude_km ?? "—"}km · <span className="text-foreground">{valueM(cfg)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Shared Infrastructure">
            <div className="p-3 space-y-3">
              <Field label="Total Ground Stations">
                <input type="number" value={gs} onChange={(e) => setGs(+e.target.value)} className={inputCls} />
              </Field>
              <Field label="Shared Stations">
                <input type="number" value={shared} onChange={(e) => setShared(+e.target.value)} className={inputCls} />
              </Field>
              <Field label="Crosslink Topology">
                <select value={topo} onChange={(e) => setTopo(e.target.value)} className={inputCls}>
                  <option>None</option>
                  <option>Partial Mesh</option>
                  <option>Full Mesh</option>
                </select>
              </Field>
              <label className="flex items-center gap-2 panel-2 px-2.5 py-2 cursor-pointer">
                <input type="checkbox" checked={indep} onChange={(e) => setIndep(e.target.checked)} className="accent-primary" />
                <span className="text-xs font-mono">Independent Networks</span>
              </label>
            </div>
          </Panel>
        </div>

        {/* CENTER: Real constellation map */}
        <div className="xl:col-span-6">
          <ConstellationNetwork
            roster={sats.map((s) => ({
              id: s.id,
              name: s.name,
              norad_id: s.config?.norad_id,
              orbit_type: s.config?.orbit_type,
              altitude_km: s.config?.altitude_km,
              asset_value_usd: s.config?.financial?.asset_value_usd,
            }))}
            result={result}
            sharedStations={shared}
            totalStations={gs}
          />
        </div>

        {/* RIGHT: Attack Config */}
        <div className="xl:col-span-3 space-y-4">
          <Panel title="Constellation Attack">
            <div className="p-3 space-y-3">
              <Field label="Attack Type">
                <select value={attack} onChange={(e) => setAttack(e.target.value)} className={inputCls}>
                  {ATTACKS_LIVE.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </Field>

              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Threat Actor</div>
                <div className="space-y-1.5">
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
              </div>

              <Field label={`Attack Severity · ${severity}%`}>
                <input type="range" min={0} max={100} value={severity} onChange={(e) => setSeverity(+e.target.value)} className="w-full accent-primary" />
              </Field>

              <Field label="Duration (s)">
                <input type="number" value={duration} onChange={(e) => setDuration(+e.target.value)} className={inputCls} />
              </Field>

              <label className="flex items-center gap-2 panel-2 px-2.5 py-2 cursor-pointer">
                <input type="checkbox" checked={unc} onChange={(e) => setUnc(e.target.checked)} className="accent-primary" />
                <span className="text-xs font-mono">Uncertainty Quantification</span>
              </label>
              <label className="flex items-center gap-2 panel-2 px-2.5 py-2 cursor-pointer">
                <input type="checkbox" checked={sens} onChange={(e) => setSens(e.target.checked)} className="accent-primary" />
                <span className="text-xs font-mono">Sensitivity Analysis</span>
              </label>
            </div>
          </Panel>

          <button
            onClick={run}
            disabled={running || sats.length < 2}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-md bg-gradient-to-r from-primary to-accent text-primary-foreground font-display font-bold tracking-wider hover:brightness-110 shadow-[0_0_30px_-8px_oklch(0.78_0.16_195_/_0.6)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? "RUNNING CONSTELLATION ATTACK..." : "RUN CONSTELLATION ATTACK"}
          </button>
          {sats.length < 2 && (
            <div className="text-[10px] font-mono text-muted-foreground text-center">
              Roster requires at least 2 satellites
            </div>
          )}
        </div>
      </div>

      {/* RESULTS */}
      {result && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-mono uppercase tracking-[0.16em] text-muted-foreground">Constellation Results</h2>
            <span className="text-[10px] font-mono text-muted-foreground">· {pluralize(result.satellite_results.length, "ASSET")}</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="panel p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Aggregate Degradation</div>
              <div className="mt-2 text-3xl font-display font-bold">{result.aggregate_degradation_percent.toFixed(1)}%</div>
              <div className="text-[10px] font-mono text-muted-foreground mt-1">weighted by asset value</div>
            </div>
            <div className="panel p-4 border-critical/40">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Peak Degradation</div>
              <div className={`mt-2 text-3xl font-display font-bold ${degClass(result.max_degradation_percent)}`}>{result.max_degradation_percent.toFixed(1)}%</div>
              <div className="text-[10px] font-mono text-muted-foreground mt-1">worst-case asset</div>
            </div>
            <div className="panel p-4 border-high/40">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Max Recovery Time</div>
              <div className="mt-2 text-3xl font-display font-bold text-high">{result.total_recovery_time_hours.toFixed(1)}h</div>
              <div className="text-[10px] font-mono text-muted-foreground mt-1">end-to-end constellation</div>
            </div>
            <div className="panel p-4 border-success/40">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Total Cost</div>
              <div className="mt-2 text-3xl font-display font-bold text-success">{fmtCost(result.total_estimated_cost_usd)}</div>
              <div className="text-[10px] font-mono text-muted-foreground mt-1">downtime + recovery ops</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {result.satellite_results.map((r, idx) => {
              const deg = r.mission_degradation_percent;
              const impacts = Object.entries(r.subsystem_impacts ?? {}).sort((a, b) => b[1] - a[1]);
              return (
                <div key={`${r.satellite_name}_${idx}`} className={`panel p-4 ${r.cascade_applied ? "border-l-4 border-l-high" : ""}`}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-semibold">{r.satellite_name}</span>
                        {r.cascade_applied && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-high/40 bg-high/10 text-high uppercase tracking-wider">
                            Cascade
                          </span>
                        )}
                      </div>
                    </div>
                    <StatusBadge level={degRisk(deg)} />
                  </div>

                  {r.cascade_applied && r.cascade_description && (
                    <div className="mt-2 panel-2 px-2.5 py-1.5 text-[10px] font-mono text-high border-high/30">
                      {r.cascade_description}
                    </div>
                  )}

                  <div className="mt-3 flex items-end gap-6">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Degradation</div>
                      <div className={`text-2xl font-display font-bold ${degClass(deg)}`}>{deg.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Recovery</div>
                      <div className="text-2xl font-display font-bold">{r.recovery_time_hours.toFixed(1)}h</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Cost</div>
                      <div className="text-2xl font-display font-bold">${Math.round(r.estimated_cost_usd).toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="mt-2 h-1 rounded bg-background overflow-hidden">
                    <div className={`h-full ${degBar(deg)}`} style={{ width: `${Math.min(100, deg)}%` }} />
                  </div>

                  {impacts.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {impacts.map(([name, v]) => (
                        <div key={name} className="panel-2 p-2">
                          <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{name}</div>
                          <div className={`text-sm font-mono font-semibold ${degClass(v)}`}>{v.toFixed(1)}%</div>
                          <div className="mt-1 h-0.5 bg-background rounded overflow-hidden">
                            <div className={`h-full ${degBar(v)}`} style={{ width: `${Math.min(100, v)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={async () => {
                if (!result) return;
                setGeneratingPDF(true);
                try {
                  const token = getToken();
                  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";
                  const res = await fetch(`${base}/api/constellation/report`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({ constellation_result: result }),
                  });
                  if (!res.ok) {
                    const txt = await res.text();
                    throw new Error(`Report generation failed (${res.status}): ${txt.slice(0, 160)}`);
                  }
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "constellation_report.pdf";
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                } catch (e: any) {
                  toast.error(e?.message ?? "Failed to generate constellation report");
                } finally {
                  setGeneratingPDF(false);
                }
              }}
              disabled={generatingPDF}
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-md bg-gradient-to-r from-primary to-accent text-primary-foreground font-display font-bold tracking-wider shadow-[0_0_30px_-8px_oklch(0.78_0.16_195_/_0.6)] ${generatingPDF ? "opacity-50 cursor-not-allowed" : "hover:brightness-110 cursor-pointer"}`}
            >
              {generatingPDF ? "GENERATING PDF..." : "EXPORT CONSTELLATION REPORT"}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
