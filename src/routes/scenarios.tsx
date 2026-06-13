import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Panel, StatusBadge } from "@/components/AppShell";

export const Route = createFileRoute("/scenarios")({
  head: () => ({
    meta: [
      { title: "Mission Scenarios — OrbitSec" },
      { name: "description", content: "Multi-phase state-forwarding attack scenarios against satellite assets." },
    ],
  }),
  component: Scenarios,
});

const SATS = ["Sentinel-1A", "SBIRS-GEO-5", "WorldView-3", "GOES-18", "WGS-10"];

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
    id: "comms",
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
    id: "eo",
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
    id: "gps",
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

// Placeholder per-phase results for Communications Disruption
const PHASE_RESULTS = [
  {
    deg: 28.3,
    healthStart: 100, healthEnd: 71.7,
    forwarded: false,
    subs: [
      ["ADCS", 100, 95],["EPS", 100, 88],["COMMS", 100, 31],
      ["THERMAL", 100, 92],["PAYLOAD", 100, 74],["GROUND", 100, 85],
    ] as const,
  },
  {
    deg: 52.1,
    healthStart: 71.7, healthEnd: 47.9,
    forwarded: true,
    subs: [
      ["ADCS", 95, 72],["EPS", 88, 71],["COMMS", 31, 18],
      ["THERMAL", 92, 88],["PAYLOAD", 74, 41],["GROUND", 85, 22],
    ] as const,
  },
  {
    deg: 71.4,
    healthStart: 47.9, healthEnd: 28.6,
    forwarded: true,
    subs: [
      ["ADCS", 72, 28],["EPS", 71, 52],["COMMS", 18, 12],
      ["THERMAL", 88, 79],["PAYLOAD", 41, 19],["GROUND", 22, 14],
    ] as const,
  },
];

const inputCls = "w-full panel-2 px-2.5 py-1.5 text-xs font-mono bg-transparent rounded outline-none focus:border-primary/50";

function color(v: number) {
  if (v < 25) return { txt: "text-critical", bar: "bg-critical" };
  if (v < 50) return { txt: "text-high", bar: "bg-high" };
  if (v < 75) return { txt: "text-medium", bar: "bg-medium" };
  return { txt: "text-success", bar: "bg-success" };
}

function Scenarios() {
  const [sat, setSat] = useState("Sentinel-1A");
  const [mode, setMode] = useState<"single" | "const">("single");
  const [scenId, setScenId] = useState("comms");
  const [forward, setForward] = useState(true);
  const [actor, setActor] = useState("nation");
  const [severity, setSeverity] = useState(70);

  const scen = SCENARIOS.find((s) => s.id === scenId)!;

  return (
    <AppShell title="Mission Scenarios" subtitle="MULTI-PHASE STATE-FORWARDING ATTACKS">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* LEFT: Configuration */}
        <div className="xl:col-span-4 space-y-4">
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
                  <span className="w-8 text-[10px] font-mono font-bold text-primary">SAT</span>
                  <span className="text-xs font-mono flex-1">{s}</span>
                  {sat === s && <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-dot" />}
                </button>
              ))}
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

          <button className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-md bg-gradient-to-r from-primary to-accent text-primary-foreground font-display font-bold tracking-wider hover:brightness-110 shadow-[0_0_30px_-8px_oklch(0.78_0.16_195_/_0.6)]">
            EXECUTE SCENARIO
          </button>
        </div>

        {/* RIGHT: Results */}
        <div className="xl:col-span-8 space-y-4">
          <Panel title="Scenario Results">
            <div className="p-4">
              <div className="flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">Scenario</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h3 className="text-lg font-display font-semibold">Communications Disruption</h3>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded border bg-success/15 text-success border-success/40">
                      <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" /> SUCCESS
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12px] font-mono text-muted-foreground">
                    Three-phase communications disruption attack. Each phase builds on previous damage state.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="panel-2 p-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Final Degradation</div>
                  <div className="mt-1 text-2xl font-display font-bold text-critical">71.4%</div>
                </div>
                <div className="panel-2 p-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Threshold</div>
                  <div className="mt-1 text-2xl font-display font-bold">75%</div>
                </div>
                <div className="panel-2 p-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Recovery</div>
                  <div className="mt-1 text-2xl font-display font-bold text-high">5.8h</div>
                </div>
                <div className="panel-2 p-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Est. Cost</div>
                  <div className="mt-1 text-2xl font-display font-bold text-success">$2.1M</div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 panel-2 px-2.5 py-2 border-success/40 bg-success/5">
                <span className="text-xs font-mono text-success">State Forwarding Verification: max state diff ≤5pp — verified</span>
              </div>
            </div>
          </Panel>

          <div className="space-y-3">
            {scen.phases.map((p, i) => {
              const r = PHASE_RESULTS[i];
              return (
                <Panel key={i}>
                  <div className="p-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-primary/15 border border-primary/30 text-primary">
                        PHASE {i + 1}
                      </span>
                      <span className="text-sm font-mono font-semibold">{p.name}</span>
                      {r.forwarded ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded border bg-primary/15 text-primary border-primary/40">
                          ↳ State Forwarded
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded border bg-background text-muted-foreground border-border">
                          Clean State
                        </span>
                      )}
                      <span className="ml-auto text-[10px] font-mono text-muted-foreground">Degradation</span>
                      <span className={`text-lg font-display font-bold ${color(100 - r.deg).bar === "bg-critical" ? "text-critical" : color(100 - r.deg).txt}`}>{r.deg}%</span>
                    </div>

                    <div className="mt-3 panel-2 px-3 py-2 flex items-center gap-3">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Health</span>
                      <span className="text-sm font-mono font-semibold">{r.healthStart}%</span>
                      <span className="text-[10px] font-mono text-muted-foreground">TO</span>
                      <span className={`text-sm font-mono font-bold ${color(r.healthEnd).txt}`}>{r.healthEnd}%</span>
                      <div className="flex-1 h-1.5 bg-background rounded overflow-hidden ml-2">
                        <div className={`h-full ${color(r.healthEnd).bar}`} style={{ width: `${r.healthEnd}%` }} />
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {r.subs.map(([name, start, end]) => {
                        const c = color(end as number);
                        return (
                          <div key={name} className="panel-2 p-2">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="text-muted-foreground uppercase tracking-wider">{name}</span>
                              <span className="font-mono">
                                <span className="text-muted-foreground">{start}%</span>
                                <span className="text-muted-foreground mx-1">→</span>
                                <span className={`font-bold ${c.txt}`}>{end}%</span>
                              </span>
                            </div>
                            <div className="mt-1 h-1 bg-background rounded overflow-hidden relative">
                              <div className="absolute inset-y-0 left-0 bg-muted-foreground/40" style={{ width: `${start}%` }} />
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

          <button className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-md text-white font-display font-bold tracking-wider hover:brightness-110 shadow-[0_0_30px_-8px_oklch(0.55_0.2_250_/_0.7)]"
            style={{ background: "linear-gradient(135deg, oklch(0.55 0.2 250) 0%, oklch(0.42 0.18 260) 100%)" }}
          >
            DOWNLOAD SCENARIO PDF REPORT
          </button>
        </div>
      </div>
    </AppShell>
  );
}
