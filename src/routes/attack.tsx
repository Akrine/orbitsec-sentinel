import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { AppShell, Panel, StatusBadge } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { useActiveSatellite } from "@/lib/activeSatellite";

export const Route = createFileRoute("/attack")({
  head: () => ({
    meta: [
      { title: "New Simulation — OrbitSec" },
      { name: "description", content: "Configure attack vector, threat actor, and simulation parameters." },
    ],
  }),
  component: Attack,
});

type AttackId =
  | "gps-spoof" | "rf-jam" | "cmd-inj" | "gs-comp" | "ai-gnss";

const LIVE: { id: AttackId; name: string; surface: string; code: string }[] = [
  { id: "gps-spoof", name: "GPS Spoofing", surface: "RF · L1/L2", code: "GPS" },
  { id: "rf-jam", name: "RF Jamming", surface: "RF · X-band", code: "RF" },
  { id: "cmd-inj", name: "Command Injection", surface: "C&DH", code: "CMD" },
  { id: "gs-comp", name: "Ground Station Compromise", surface: "GROUND", code: "GS" },
  { id: "ai-gnss", name: "AI-Adaptive GNSS Spoofing", surface: "RF · ML", code: "AI" },
];

const SOON_GROUPS: { label: string; items: string[] }[] = [
  { label: "RF / Communications", items: ["GPS Jamming", "Crosslink Jamming", "Meaconing", "Uplink Jamming", "Downlink Jamming", "Anti-Jam Testing"] },
  { label: "Cyber", items: ["Malware Injection", "Denial of Service", "Data Manipulation", "Signal Auth Bypass", "APT Attack", "Data Exfiltration"] },
  { label: "Physical / Kinetic", items: ["Laser Dazzling", "EMP Attack", "Kinetic ASAT", "Space Weather", "Orbital Collision"] },
  { label: "Advanced", items: ["Supply Chain Attack", "Multi-Stage Attack", "Cascading Failure"] },
];

const ACTORS = [
  { id: "nation", name: "Nation-State", tag: "TIER-1 APT", level: "CRITICAL" as const, accent: "critical", desc: "Military-grade EW, protocol insider knowledge, advanced meaconing — hardest to defend against" },
  { id: "apt", name: "Sophisticated APT", tag: "TIER-2", level: "HIGH" as const, accent: "high", desc: "Well-funded APT group with commercial EW tools and deep satellite protocol knowledge" },
  { id: "insider", name: "Insider Threat", tag: "TRUSTED", level: "HIGH" as const, accent: "primary", desc: "Malicious insider with physical/logical ground system access — GPS/RF/AI attacks NOT APPLICABLE" },
];

const ATTACK_MAP: Record<AttackId, string> = {
  "gps-spoof": "gps_spoofing",
  "rf-jam": "rf_jamming",
  "cmd-inj": "command_injection",
  "gs-comp": "ground_station",
  "ai-gnss": "ai_adaptive_spoofing",
};
const ACTOR_MAP: Record<string, string> = {
  nation: "NATION_STATE",
  apt: "SOPHISTICATED_APT",
  insider: "INSIDER_THREAT",
};

// ---------- primitives ----------
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
        {hint && <span className="text-[10px] font-mono text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full h-9 px-3 rounded-md bg-surface-2 border border-border text-sm font-mono focus:outline-none focus:border-primary ${props.className ?? ""}`} />;
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full h-9 px-3 rounded-md bg-surface-2 border border-border text-sm font-mono focus:outline-none focus:border-primary">
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button onClick={() => onChange(!checked)} type="button"
      className="w-full panel-2 px-3 py-2.5 flex items-center gap-3 hover:border-primary/40 text-left">
      <span className={`h-4 w-4 rounded border ${checked ? "bg-primary border-primary" : "border-border bg-background"}`}>
        {checked && <span className="block h-1.5 w-1.5 rounded-full bg-primary-foreground m-[4px]" />}
      </span>
      <span className="text-sm">{label}</span>
    </button>
  );
}

function Attack() {
  const { activeName, activeConfig } = useActiveSatellite();
  const hasActive = !!activeConfig && Object.keys(activeConfig).length > 0;

  const [attack, setAttack] = useState<AttackId>("ai-gnss");
  const [actor, setActor] = useState("apt");
  const [open, setOpen] = useState(false);

  // params
  const [posOffset, setPosOffset] = useState(12000);
  const [sigPower, setSigPower] = useState(150);
  const [jamPower, setJamPower] = useState(100);
  const [jamFreq, setJamFreq] = useState(2200);
  const [jamType, setJamType] = useState("Barrage");
  const [cmdType, setCmdType] = useState("Attitude Change");
  const [bypass, setBypass] = useState("Weak Crypto");
  const [gsPath, setGsPath] = useState("Network Intrusion");
  const [gsVector, setGsVector] = useState("Cyber Attack");
  const [gsCompLvl, setGsCompLvl] = useState("Operator Workstation");
  const [gsCovert, setGsCovert] = useState("Yes");
  const [termType, setTermType] = useState("Linux-based COTS Modem");
  const [fwUpdate, setFwUpdate] = useState("Over-the-Air (OTA)");
  const [secureBoot, setSecureBoot] = useState("Disabled");
  const [debugPort, setDebugPort] = useState("Exposed");
  const [cmdSigning, setCmdSigning] = useState("Disabled");
  const [iters, setIters] = useState(25);
  const [explore, setExplore] = useState(0.3);
  const [stealth, setStealth] = useState(0.3);

  // sim
  const [severity, setSeverity] = useState(70);
  const [duration, setDuration] = useState(300);
  const [uq, setUq] = useState(true);
  const [sa, setSa] = useState(true);

  // result
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const activeAttack = useMemo(() => LIVE.find((l) => l.id === attack)!, [attack]);


  function buildAttackParams(): Record<string, any> {
    switch (attack) {
      case "gps-spoof":
        return { position_offset_m: posOffset, signal_power_watts: sigPower };
      case "rf-jam":
        return {
          jammer_power_watts: jamPower,
          center_frequency_mhz: jamFreq,
          jamming_type: jamType.toLowerCase().split(" ")[0],
        };
      case "cmd-inj":
        return { command_type: cmdType, bypass_method: bypass };
      case "gs-comp":
        if (gsPath === "Network Intrusion") {
          return {
            gs_attack_path: "network",
            attack_vector: gsVector,
            compromise_level: gsCompLvl,
            covert_operation: gsCovert === "Yes",
          };
        }
        return {
          gs_attack_path: "firmware_exploitation",
          terminal_type: termType,
          firmware_update_mechanism: fwUpdate,
          secure_boot: secureBoot,
          debug_port_exposed: debugPort,
          command_code_signing: cmdSigning,
        };
      case "ai-gnss":
        return { iterations: iters, exploration_rate: explore, stealth_weight: stealth };
    }
  }

  async function go() {
    if (!sat) { toast.error("Select a target asset"); return; }
    const cfg = configs[sat] ?? {};
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const body = {
        attack_type: ATTACK_MAP[attack],
        severity: severity / 100,
        threat_actor_profile: ACTOR_MAP[actor],
        duration_seconds: duration,
        uncertainty: uq,
        uncertainty_samples: 5,
        satellite_name: sat,
        satellite_config: cfg,
        altitude_km: cfg?.altitude_km,
        inclination_deg: cfg?.inclination_deg,
        orbit_type: cfg?.orbit_type,
        norad_id: cfg?.norad_id,
        ...buildAttackParams(),
      };
      const res = await apiFetch("/api/simulate", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = (data && (data.detail || data.error)) || `HTTP ${res.status}`;
        throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
      }
      setResult(data);
      toast.success("Simulation complete");
    } catch (e: any) {
      setError(e?.message ?? "Simulation failed");
      toast.error(e?.message ?? "Simulation failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <AppShell title="New Simulation" subtitle="SINGLE SATELLITE · ATTACK CONFIGURATION">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* LEFT/MAIN */}
        <div className="xl:col-span-2 space-y-4">
          {/* Target asset */}
          <Panel title="Target Asset" action={<Link to="/configure" className="text-[10px] font-mono uppercase tracking-wider text-primary hover:underline">Configure →</Link>}>
            <div className="p-4 flex gap-2 flex-wrap">
              {configsLoading && <div className="text-[11px] font-mono text-muted-foreground">Loading targets…</div>}
              {!configsLoading && Object.keys(configs).length === 0 && (
                <div className="text-[11px] font-mono text-muted-foreground">No saved configurations. <Link to="/configure" className="text-primary hover:underline">Create one →</Link></div>
              )}
              {Object.keys(configs).map((s) => (
                <button key={s} onClick={() => setSat(s)}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-colors ${
                    sat === s ? "bg-primary/15 border-primary text-primary text-glow" : "panel-2 text-muted-foreground hover:text-foreground"
                  }`}>{s}</button>
              ))}
            </div>
          </Panel>


          {/* Attack dropdown */}
          <Panel title="Attack Type" action={<span className="text-[10px] font-mono text-muted-foreground">5 LIVE · 20 PIPELINE</span>}>
            <div className="p-4 relative">
              <button onClick={() => setOpen(!open)}
                className="w-full panel-2 px-3 h-11 flex items-center gap-3 hover:border-primary/40">
                <span className="w-8 text-[10px] font-mono font-bold text-primary">{activeAttack.code}</span>
                <span className="text-sm">{activeAttack.name}</span>
                <span className="text-[10px] font-mono text-muted-foreground">{activeAttack.surface}</span>
                <StatusBadge level="LIVE" />
                <span className="ml-auto text-[10px] font-mono text-muted-foreground">{open ? "CLOSE" : "OPEN"}</span>
              </button>
              {open && (
                <div className="absolute left-4 right-4 mt-1 z-30 panel max-h-[420px] overflow-auto shadow-2xl">
                  <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em] text-success border-b border-border bg-success/5">
                    Digital Twin Engine · LIVE
                  </div>
                  {LIVE.map((l) => (
                    <button key={l.id} onClick={() => { setAttack(l.id); setOpen(false); }}
                      className={`w-full px-3 py-2.5 flex items-center gap-3 hover:bg-primary/10 border-b border-border/50 text-left ${
                        attack === l.id ? "bg-primary/10" : ""
                      }`}>
                      <span className="w-8 text-[10px] font-mono font-bold text-primary">{l.code}</span>
                      <span className="text-sm flex-1">{l.name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{l.surface}</span>
                      <StatusBadge level="LIVE" />
                    </button>
                  ))}
                  {SOON_GROUPS.map((g) => (
                    <div key={g.label}>
                      <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground border-b border-border bg-surface-2">
                        {g.label} · COMING SOON
                      </div>
                      {g.items.map((i) => (
                        <div key={i} className="px-3 py-2 flex items-center gap-3 border-b border-border/50 opacity-50 cursor-not-allowed">
                          <span className="h-4 w-4" />
                          <span className="text-sm flex-1">{i}</span>
                          <StatusBadge level="SOON" />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>

          {/* Threat actor */}
          <Panel title="Threat Actor Profile">
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              {ACTORS.map((a) => {
                const active = actor === a.id;
                const ringColor = a.accent === "critical" ? "border-critical bg-critical/5" : a.accent === "high" ? "border-high bg-high/5" : "border-primary bg-primary/5";
                return (
                  <button key={a.id} onClick={() => setActor(a.id)}
                    className={`text-left p-4 rounded-md border transition-all ${
                      active ? ringColor : "border-border bg-surface-2 hover:border-foreground/30"
                    }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">{a.tag}</span>
                      <StatusBadge level={a.level} />
                    </div>
                    <div className="mt-2 text-sm font-semibold">{a.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{a.desc}</div>
                  </button>
                );
              })}
            </div>
          </Panel>

          {/* Attack-specific params */}
          <Panel title="Attack-Specific Parameters" action={<span className="text-[10px] font-mono text-primary">{activeAttack.name}</span>}>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {attack === "gps-spoof" && <>
                <Field label="Position Offset (meters)" hint="100 – 50,000"><Input type="number" min={100} max={50000} value={posOffset} onChange={(e) => setPosOffset(+e.target.value)} /></Field>
                <Field label="Signal Power (Watts)" hint="10 – 1,000"><Input type="number" min={10} max={1000} value={sigPower} onChange={(e) => setSigPower(+e.target.value)} /></Field>
              </>}
              {attack === "rf-jam" && <>
                <Field label="Jammer Power (Watts)"><Input type="number" value={jamPower} onChange={(e) => setJamPower(+e.target.value)} /></Field>
                <Field label="Frequency (MHz)"><Input type="number" value={jamFreq} onChange={(e) => setJamFreq(+e.target.value)} /></Field>
                <Field label="Jamming Type"><Select value={jamType} onChange={setJamType} options={["Barrage", "Spot (focused)", "Sweep"]} /></Field>
              </>}
              {attack === "cmd-inj" && <>
                <Field label="Command Type"><Select value={cmdType} onChange={setCmdType} options={["Attitude Change", "Power Cycle", "Mode Change", "Payload Control"]} /></Field>
                <Field label="Bypass Method"><Select value={bypass} onChange={setBypass} options={["Weak Crypto", "Stolen Keys", "Protocol Exploit", "None (brute force)"]} /></Field>
              </>}
              {attack === "gs-comp" && <>
                <Field label="Attack Path"><Select value={gsPath} onChange={setGsPath} options={["Network Intrusion", "Terminal Firmware Exploitation"]} /></Field>
                <div />
                {gsPath === "Network Intrusion" && <>
                  <Field label="Attack Vector"><Select value={gsVector} onChange={setGsVector} options={["Cyber Attack", "Insider Threat", "Physical Intrusion", "Social Engineering"]} /></Field>
                  <Field label="Compromise Level"><Select value={gsCompLvl} onChange={setGsCompLvl} options={["Operator Workstation", "Command System", "Full Control", "Network Access"]} /></Field>
                  <Field label="Covert"><Select value={gsCovert} onChange={setGsCovert} options={["Yes", "No"]} /></Field>
                </>}
                {gsPath === "Terminal Firmware Exploitation" && <>
                  <Field label="Terminal Type"><Select value={termType} onChange={setTermType} options={["Linux-based COTS Modem", "Legacy Integrated Circuit", "Custom Hardened Terminal"]} /></Field>
                  <Field label="Firmware Update Mechanism"><Select value={fwUpdate} onChange={setFwUpdate} options={["Over-the-Air (OTA)", "Air-Gapped"]} /></Field>
                  <Field label="Secure Boot"><Select value={secureBoot} onChange={setSecureBoot} options={["Disabled", "Enabled"]} /></Field>
                  <Field label="Debug Port Exposure"><Select value={debugPort} onChange={setDebugPort} options={["Exposed", "Disabled"]} /></Field>
                  <Field label="Command Code Signing"><Select value={cmdSigning} onChange={setCmdSigning} options={["Disabled", "Enabled"]} /></Field>
                </>}
              </>}
              {attack === "ai-gnss" && <>
                <Field label="Learning Iterations" hint="5 – 100"><Input type="number" min={5} max={100} value={iters} onChange={(e) => setIters(+e.target.value)} /></Field>
                <Field label="Exploration Rate" hint="0.05 – 1.0">
                  <div className="flex items-center gap-3">
                    <input type="range" min={0.05} max={1} step={0.05} value={explore} onChange={(e) => setExplore(+e.target.value)} className="flex-1 accent-primary" />
                    <span className="font-mono text-sm text-primary w-12 text-right">{explore.toFixed(2)}</span>
                  </div>
                </Field>
                <Field label="Stealth Weight (0–1)">
                  <div className="flex items-center gap-3">
                    <input type="range" min={0} max={1} step={0.1} value={stealth} onChange={(e) => setStealth(+e.target.value)} className="flex-1 accent-primary" />
                    <span className="font-mono text-sm text-primary w-12 text-right">{stealth.toFixed(1)}</span>
                  </div>
                </Field>
              </>}
            </div>
          </Panel>

          {/* Sim params */}
          <Panel title="Simulation Parameters">
            <div className="p-5 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground">Attack Severity</span>
                  <span className="font-mono text-sm text-primary">{severity}%</span>
                </div>
                <input type="range" min={0} max={100} value={severity} onChange={(e) => setSeverity(+e.target.value)} className="w-full accent-primary" />
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
                  <span>LOW</span><span>MODERATE</span><span>CRITICAL</span>
                </div>
              </div>
              <Field label="Duration (seconds)" hint="1 – 86,400">
                <Input type="number" min={1} max={86400} value={duration} onChange={(e) => setDuration(+e.target.value)} />
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Check checked={uq} onChange={setUq} label="Uncertainty Bounds (LHS samples)" />
                <Check checked={sa} onChange={setSa} label="Sensitivity Analysis (parameter ranking)" />
              </div>
            </div>
          </Panel>

          {/* Run buttons */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <button onClick={go} disabled={running || configsLoading || !sat}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-4 rounded-md font-display font-bold tracking-[0.2em] text-primary-foreground shadow-[0_0_40px_-8px_oklch(0.78_0.16_200_/_0.6)] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(90deg, oklch(0.65 0.16 200), oklch(0.78 0.16 200))" }}>
              {running ? "RUNNING SIMULATION…" : "RUN ATTACK SIMULATION"}
            </button>
            <button onClick={() => { setResult(null); setError(null); }}
              className="inline-flex items-center justify-center gap-2 px-5 py-4 rounded-md font-display font-bold tracking-[0.2em] text-critical-foreground"
              style={{ background: "linear-gradient(90deg, oklch(0.55 0.22 22), oklch(0.7 0.24 22))" }}>
              CLEAR RESULTS
            </button>
          </div>

          {error && (
            <Panel title="Simulation Error" action={<StatusBadge level="CRITICAL" />}>
              <div className="p-4 text-xs font-mono text-critical break-all">{error}</div>
            </Panel>
          )}

          {result && (
            <Panel title="Simulation Result" action={<span className="text-[10px] font-mono text-success">COMPLETE</span>}>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="panel-2 p-3">
                    <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">Mission Degradation</div>
                    <div className="text-xl font-display font-bold text-critical mt-1">
                      {result.mission_degradation_percent != null ? `${Number(result.mission_degradation_percent).toFixed(1)}%` : "—"}
                    </div>
                  </div>
                  <div className="panel-2 p-3">
                    <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">Estimated Cost</div>
                    <div className="text-xl font-display font-bold text-high mt-1">
                      {result.estimated_cost_usd != null ? `$${Number(result.estimated_cost_usd).toLocaleString()}` : "—"}
                    </div>
                  </div>
                  <div className="panel-2 p-3">
                    <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">Recovery Time</div>
                    <div className="text-xl font-display font-bold text-primary mt-1">
                      {result.recovery_time_hours != null ? `${Number(result.recovery_time_hours).toFixed(1)} h` : "—"}
                    </div>
                  </div>
                </div>

                {result.impact_summary && (
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Impact Summary</div>
                    <div className="text-sm leading-relaxed">{result.impact_summary}</div>
                  </div>
                )}

                {result.subsystem_impacts && (
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground mb-2">Subsystem Impacts</div>
                    <div className="space-y-1.5">
                      {Object.entries(result.subsystem_impacts as Record<string, any>).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between text-xs font-mono panel-2 px-3 py-2">
                          <span>{k}</span>
                          <span className="text-critical">{typeof v === "number" ? `${v.toFixed(1)}%` : String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <details className="text-xs font-mono">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Raw JSON</summary>
                  <pre className="mt-2 p-3 panel-2 overflow-auto max-h-96 text-[10px] leading-relaxed">{JSON.stringify(result, null, 2)}</pre>
                </details>
              </div>
            </Panel>
          )}

        </div>

        {/* RIGHT: Subsystem Health preview */}
        <div className="space-y-4">
          <Panel title="Subsystem Health · Preview" action={<span className="text-[10px] font-mono text-success">NOMINAL</span>}>
            <div className="p-5 space-y-4">
              <div className="text-[11px] text-muted-foreground">Pre-attack baseline. All subsystems operating at full capacity.</div>
              {[
                { name: "ADCS", v: 100 }, { name: "Comms", v: 100 }, { name: "Power", v: 100 },
                { name: "Thermal", v: 100 }, { name: "Payload", v: 100 }, { name: "Ground", v: 100 },
              ].map((s) => (
                <div key={s.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono">{s.name}</span>
                    <span className="text-xs font-mono text-success">{s.v}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2 border border-border overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${s.v}%`, background: "linear-gradient(90deg, oklch(0.7 0.18 145), oklch(0.8 0.18 145))" }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Mission Brief">
            <div className="p-5 space-y-2 text-xs font-mono">
              <div className="flex justify-between"><span className="text-muted-foreground">MODE</span><span className="text-primary">SINGLE SAT</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">TARGET</span><span>{sat}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">VECTOR</span><span className="text-primary">{activeAttack.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">ACTOR</span><span className="text-high">{ACTORS.find((a) => a.id === actor)?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">SEVERITY</span><span>{severity}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">DURATION</span><span>{duration}s</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">TICKS</span><span>{duration * 10}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">UQ / SA</span><span>{uq ? "ON" : "OFF"} / {sa ? "ON" : "OFF"}</span></div>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
