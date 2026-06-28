import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { AppShell, Panel, StatusBadge } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { useActiveSatellite } from "@/lib/activeSatellite";
import { CascadeGraph } from "@/components/CascadeGraph";

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
  const [gpsThreshold, setGpsThreshold] = useState<{ power_start_capture_w: number; power_full_capture_w: number } | null>(null);
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
  const [completedAt, setCompletedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);
  const [subsysFilter, setSubsysFilter] = useState<Record<string, boolean>>({
    ADCS: true, EPS: true, Comms: true, Thermal: true, Payload: true, GroundSegment: true,
  });
  const [pdfPending, setPdfPending] = useState(false);
  const [sensitivityLoading, setSensitivityLoading] = useState(false);
  const [sensitivityFailed, setSensitivityFailed] = useState(false);

  async function exportPdf() {
    if (!result) return;
    setPdfPending(true);
    try {
      const res = await apiFetch("/api/generate_report", {
        method: "POST",
        body: JSON.stringify({ sim_result: result }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "orbitsec_report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to generate report");
    } finally {
      setPdfPending(false);
    }
  }

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
    if (!hasActive || !activeName || !activeConfig) { toast.error("No active satellite — configure one first"); return; }
    const cfg = activeConfig as any;
    setRunning(true);
    setError(null);
    setResult(null);
    setSensitivityFailed(false);
    setSensitivityLoading(false);
    try {
      const body = {
        attack_type: ATTACK_MAP[attack],
        severity: severity / 100,
        threat_actor_profile: ACTOR_MAP[actor],
        duration_seconds: duration,
        uncertainty: uq,
        uncertainty_samples: 5,
        satellite_name: activeName,
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
      setCompletedAt(new Date());
      toast.success("Simulation complete");
      if (sa) {
        setSensitivityLoading(true);
        setSensitivityFailed(false);
        try {
          const sRes = await apiFetch("/api/simulate/sensitivity", {
            method: "POST",
            body: JSON.stringify(body),
          });
          if (sRes.ok) {
            const sData = await sRes.json().catch(() => ({}));
            if (sData?.sensitivity_ranking) {
              setResult((prev: any) => {
                if (!prev) return prev;
                const next: any = { ...prev, sensitivity_ranking: sData.sensitivity_ranking };
                if (sData.sensitivity_ranking_defense !== undefined) {
                  next.sensitivity_ranking_defense = sData.sensitivity_ranking_defense;
                }
                if (sData.autonomy_recovery_swing !== undefined) {
                  next.autonomy_recovery_swing = sData.autonomy_recovery_swing;
                }
                return next;
              });
            } else {
              setSensitivityFailed(true);
            }
          } else {
            setSensitivityFailed(true);
          }
        } catch {
          setSensitivityFailed(true);
        } finally {
          setSensitivityLoading(false);
        }
      }
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
          {/* Active target */}
          <Panel title="Active Target" action={<Link to="/configure" className="text-[10px] font-mono uppercase tracking-wider text-primary hover:underline">Configure in Satellite Config →</Link>}>
            <div className="p-4">
              {!hasActive && (
                <div className="text-[12px] font-mono text-muted-foreground">
                  No satellite configured. <Link to="/configure" className="text-primary hover:underline">Set one up in Satellite Config first.</Link>
                </div>
              )}
              {hasActive && (
                <div className="space-y-3">
                  <div className="text-lg font-display font-bold text-primary text-glow tracking-wide">{activeName}</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono">
                    {[
                      { k: "ORBIT", v: (activeConfig as any)?.orbit_type ?? "—" },
                      { k: "ALTITUDE", v: (activeConfig as any)?.altitude_km != null ? `${(activeConfig as any).altitude_km} km` : "—" },
                      { k: "INCLINATION", v: (activeConfig as any)?.inclination_deg != null ? `${(activeConfig as any).inclination_deg}°` : "—" },
                      { k: "MISSION", v: (activeConfig as any)?.mission_type ?? "—" },
                    ].map((s) => (
                      <div key={s.k} className="panel-2 px-3 py-2">
                        <div className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{s.k}</div>
                        <div className="mt-1 text-foreground">{String(s.v)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
            <button onClick={go} disabled={running || !hasActive}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-4 rounded-md font-display font-bold tracking-[0.2em] text-primary-foreground shadow-[0_0_40px_-8px_oklch(0.78_0.16_200_/_0.6)] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(90deg, oklch(0.65 0.16 200), oklch(0.78 0.16 200))" }}>
              {running ? "RUNNING SIMULATION…" : "RUN ATTACK SIMULATION"}
            </button>
            <button onClick={() => { setResult(null); setError(null); setCompletedAt(null); }}
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

          {result && (() => {
            const r = result as any;
            const attackName = String(r.attack_type ?? ATTACK_MAP[attack] ?? "").replace(/_/g, " ").toUpperCase();
            const actorColors: Record<string, string> = {
              NATION_STATE: "#ff4444",
              SOPHISTICATED_APT: "#ff9900",
              INSIDER_THREAT: "#cc44ff",
            };
            const actorColor = actorColors[r.threat_actor_profile as string] ?? "#888";
            const subsystemOrder = ["ADCS", "EPS", "Comms", "Thermal", "Payload", "GroundSegment"];
            const initial = (r.initial_health ?? {}) as Record<string, any>;
            const final = (r.final_health ?? {}) as Record<string, any>;
            const impacts = (r.subsystem_impacts ?? {}) as Record<string, any>;
            const cfgU = r.config_used ?? {};
            const orb = r.orbital_context ?? {};
            const enc = cfgU?.comms?.encryption_strength;
            const encIsNone = typeof enc === "string" && enc.toLowerCase() === "none";
            const healthColor = (v: number) => v > 70 ? "text-success" : v > 40 ? "text-amber" : "text-critical";
            const healthBg = (v: number) => v > 70 ? "oklch(0.7 0.18 145)" : v > 40 ? "oklch(0.78 0.16 75)" : "oklch(0.65 0.22 22)";

            const KV = ({ k, v, valueClass }: { k: string; v: React.ReactNode; valueClass?: string }) => (
              <div className="flex items-center justify-between text-[11px] font-mono panel-2 px-3 py-1.5">
                <span className="text-muted-foreground">{k}</span>
                <span className={valueClass}>{v}</span>
              </div>
            );

            return (
              <Panel title="Simulation Result" action={<span className="text-[10px] font-mono text-success">COMPLETE</span>}>
                <div className="p-5 space-y-5">
                  {/* 1. Header */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-lg font-display font-bold tracking-wide text-glow text-primary">{attackName}</div>
                    {r.engine === true && (
                      <span className="text-[10px] font-mono uppercase tracking-[0.14em] px-2 py-1 rounded border border-primary/60 text-primary bg-primary/10">DIGITAL TWIN</span>
                    )}
                    {typeof r.success === "boolean" && (
                      <span className={`text-[10px] font-mono uppercase tracking-[0.14em] px-2 py-1 rounded border ${
                        r.success
                          ? "border-success/60 text-success bg-success/10"
                          : "border-critical/60 text-critical bg-critical/10"
                      }`}>{r.success ? "SUCCESS" : "FAILED"}</span>
                    )}
                  </div>

                  {/* 2. Summary tiles */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="panel-2 p-3">
                      <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">Degradation</div>
                      <div className="text-xl font-display font-bold text-critical mt-1">
                        {r.mission_degradation_percent != null ? `${Math.round(Number(r.mission_degradation_percent))}%` : "—"}
                      </div>
                    </div>
                    <div className="panel-2 p-3">
                      <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">Cost</div>
                      <div className="text-xl font-display font-bold text-high mt-1">
                        {r.estimated_cost_usd != null ? `$${Number(r.estimated_cost_usd).toLocaleString()}` : "—"}
                      </div>
                    </div>
                    <div className="panel-2 p-3">
                      <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">Recovery</div>
                      <div className="text-xl font-display font-bold text-primary mt-1">
                        {r.recovery_time_hours != null ? `${Number(r.recovery_time_hours).toFixed(1)}h` : "—"}
                      </div>
                    </div>
                    <div className="panel-2 p-3">
                      <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">Time</div>
                      <div className="text-xl font-display font-bold text-foreground mt-1">
                        {completedAt ? completedAt.toLocaleTimeString() : "—"}
                      </div>
                    </div>
                  </div>

                  {/* 3. Threat actor */}
                  {r.threat_actor_profile && r.threat_actor_display && (
                    <div
                      className="panel-2 p-4 border-l-4"
                      style={{ borderLeftColor: actorColor }}
                    >
                      <div className="text-sm font-display font-bold tracking-wide" style={{ color: actorColor }}>
                        {String(r.threat_actor_display).toUpperCase()}
                      </div>
                      {r.threat_actor_summary && (
                        <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{r.threat_actor_summary}</div>
                      )}
                    </div>
                  )}

                  {/* 4. Impact summary */}
                  {r.impact_summary && (
                    <div className="text-sm leading-relaxed">{r.impact_summary}</div>
                  )}

                  {/* 5. Config used */}
                  {r.engine && r.config_used && (
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground mb-2">Config Used By Engine</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                        {cfgU?.adcs?.pointing_accuracy_deg != null && <KV k="ADCS Pointing" v={`${cfgU.adcs.pointing_accuracy_deg}°`} />}
                        {cfgU?.adcs?.num_reaction_wheels != null && <KV k="Reaction Wheels" v={cfgU.adcs.num_reaction_wheels} />}
                        {cfgU?.adcs?.num_star_trackers != null && <KV k="Star Trackers" v={`${cfgU.adcs.num_star_trackers} (arcsec)`} />}
                        {cfgU?.adcs?.num_gyroscopes != null && <KV k="Gyros" v={`${cfgU.adcs.num_gyroscopes} · drift ${cfgU.adcs.gyro_drift_deg_per_hour ?? "—"} deg/hr`} />}
                        {cfgU?.eps?.solar_panel_area_m2 != null && <KV k="Solar Panels" v={`${cfgU.eps.solar_panel_area_m2}m² × ${cfgU.eps.num_solar_arrays ?? "—"}`} />}
                        {cfgU?.eps?.battery_capacity_wh != null && <KV k="Battery" v={`${cfgU.eps.battery_capacity_wh} Wh`} />}
                        {cfgU?.eps?.peak_power_draw_w != null && <KV k="Peak Draw" v={`${cfgU.eps.peak_power_draw_w} W`} />}
                        {enc != null && <KV k="Encryption" v={String(enc)} valueClass={encIsNone ? "text-critical" : "text-success"} />}
                        {cfgU?.ground_segment?.num_ground_stations != null && (
                          <KV k="Ground Stations" v={`${cfgU.ground_segment.num_ground_stations} (${cfgU.ground_segment.passes_per_day ?? "—"}/day)`} />
                        )}
                      </div>
                    </div>
                  )}

                  {/* 6. Orbital context */}
                  {r.engine && r.orbital_context && (
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground mb-2">Orbital Context (TLE)</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                        {orb?.altitude_km != null && <KV k="Altitude" v={`${Number(orb.altitude_km).toFixed(1)} km`} />}
                        {orb?.inclination_deg != null && <KV k="Inclination" v={`${Number(orb.inclination_deg).toFixed(2)}°`} />}
                        {orb?.orbit_type != null && <KV k="Orbit" v={String(orb.orbit_type)} />}
                        {orb?.in_eclipse != null && (
                          <KV k="Eclipse" v={orb.in_eclipse ? "YES" : "No"} valueClass={orb.in_eclipse ? "text-critical" : "text-success"} />
                        )}
                      </div>
                    </div>
                  )}

                  {/* 7. Subsystem health */}
                  {r.engine && r.final_health && (
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground mb-2">Subsystem Health</div>
                      <div className="space-y-2">
                        {subsystemOrder.map((s) => {
                          const before = Number(initial?.[s]?.overall_health ?? 100);
                          const finalH = final?.[s]?.overall_health;
                          const impact = Number(impacts?.[s] ?? 0);
                          const afterRaw = finalH != null ? Number(finalH) : before;
                          const after = Math.min(afterRaw, Math.max(0, before - impact));
                          const afterRounded = Math.round(after);
                          return (
                            <div key={s} className="panel-2 px-3 py-2">
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span>{s}</span>
                                <span>
                                  <span className="text-muted-foreground">{Math.round(before)}% → </span>
                                  <span className={healthColor(after)}>{afterRounded}%</span>
                                </span>
                              </div>
                              <div className="mt-1.5 h-1.5 rounded-full bg-surface-2 border border-border overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, afterRounded))}%`, background: healthBg(after) }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 7b. Cascade dependency graph */}
                  {r.subsystem_impacts && <CascadeGraph result={r} />}

                  {/* 8. Recovery timeline */}
                  {r.engine && Array.isArray(r.recovery_timeline) && r.recovery_timeline.filter((p: any) => p?.status === "required").length > 0 && (() => {
                    const phases = (r.recovery_timeline as any[]).filter((p) => p?.status === "required");
                    const maxDur = Math.max(...phases.map((p) => Number(p.duration_hours) || 0), 0.0001);
                    const total = phases.reduce((acc, p) => acc + (Number(p.duration_hours) || 0), 0);
                    const barColor = (h: number) => h > 2 ? "oklch(0.65 0.22 22)" : h > 0.5 ? "oklch(0.78 0.16 75)" : "oklch(0.7 0.18 145)";
                    return (
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground mb-2">Recovery Timeline</div>
                        <div className="space-y-2">
                          {phases.map((p, i) => {
                            const h = Number(p.duration_hours) || 0;
                            const pct = (h / maxDur) * 100;
                            return (
                              <div key={i} className="panel-2 px-3 py-2">
                                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                                  <span className="truncate pr-2">{i + 1}. {p.description}</span>
                                  <span>{h.toFixed(1)}h</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-surface-2 border border-border overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor(h) }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-2 text-[11px] font-mono text-muted-foreground">Total Recovery: {total.toFixed(1)}h</div>
                      </div>
                    );
                  })()}

                  {/* 9. Uncertainty bounds */}
                  {r.uncertainty_bounds?.mission_degradation && (() => {
                    const ub = r.uncertainty_bounds as any;
                    const md = ub.mission_degradation;
                    const rt = ub.recovery_time_hours;
                    const subs = (ub.subsystem_impacts ?? {}) as Record<string, any>;
                    const rows: { label: string; low: any; nom: any; high: any; suffix: string }[] = [];
                    if (md) rows.push({ label: "Degradation", low: md.low, nom: md.nominal, high: md.high, suffix: "%" });
                    if (rt) rows.push({ label: "Recovery Time", low: rt.low, nom: rt.nominal, high: rt.high, suffix: "h" });
                    for (const s of subsystemOrder) {
                      const v = subs[s];
                      if (v && (v.low != null || v.nominal != null || v.high != null)) {
                        rows.push({ label: s, low: v.low, nom: v.nominal, high: v.high, suffix: "%" });
                      }
                    }
                    const fmt = (n: any, suf: string) => n != null ? `${Number(n).toFixed(1)}${suf}` : "—";
                    return (
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-cyan mb-2">
                          {(() => {
                            const n = ub.num_samples ?? ub.samples;
                            if (n != null) return `Uncertainty Bounds (${n} LHS samples)`;
                            return "Uncertainty Bounds (LHS samples)";
                          })()}
                        </div>
                        <div className="panel-2 overflow-hidden">
                          <div className="grid grid-cols-4 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground border-b border-border px-3 py-1.5">
                            <div></div><div className="text-right">Low</div><div className="text-right">Nominal</div><div className="text-right">High</div>
                          </div>
                          {rows.map((r2) => (
                            <div key={r2.label} className="grid grid-cols-4 text-xs font-mono px-3 py-1.5 border-b border-border/40 last:border-b-0">
                              <div>{r2.label}</div>
                              <div className="text-right text-muted-foreground">{fmt(r2.low, r2.suffix)}</div>
                              <div className="text-right">{fmt(r2.nom, r2.suffix)}</div>
                              <div className="text-right text-muted-foreground">{fmt(r2.high, r2.suffix)}</div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-1.5 text-[10px] font-mono text-muted-foreground">Low — Nominal — High</div>
                      </div>
                    );
                  })()}

                  {/* 10. Sensitivity */}
                  {Array.isArray(r.sensitivity_ranking) && r.sensitivity_ranking.length > 0 && (() => {
                    const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                    const levelOf = (s: number): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" =>
                      s > 10 ? "CRITICAL" : s > 2 ? "HIGH" : s > 0.5 ? "MEDIUM" : "LOW";
                    const barBg = (lvl: string) =>
                      lvl === "CRITICAL" ? "bg-critical/40" : lvl === "HIGH" ? "bg-high/40" : lvl === "MEDIUM" ? "bg-medium/40" : "bg-low/40";

                    const renderTable = (ranking: [string, number][]) => {
                      const maxSwing = Math.max(...ranking.map(([, s]) => Math.abs(Number(s) || 0)), 0.0001);
                      return (
                        <div className="space-y-2">
                          {ranking.map(([name, swing], i) => {
                            const s = Math.abs(Number(swing) || 0);
                            const pct = (s / maxSwing) * 100;
                            const lvl = levelOf(s);
                            return (
                              <div key={`${name}-${i}`} className="panel-2 px-3 py-2">
                                <div className="flex items-center justify-between gap-3 text-xs font-mono mb-1.5">
                                  <span className="truncate pr-2">{titleCase(String(name))}</span>
                                  <StatusBadge level={lvl} />
                                </div>
                                <div className="h-4 rounded-sm bg-surface-2 border border-border overflow-hidden relative">
                                  <div className={`h-full ${barBg(lvl)}`} style={{ width: `${pct}%` }} />
                                  <div className="absolute inset-0 flex items-center px-2 text-[10px] font-mono text-foreground">
                                    {s.toFixed(1)}%
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    };

                    const rankingAtk = r.sensitivity_ranking as [string, number][];
                    const rankingDef = Array.isArray(r.sensitivity_ranking_defense) ? (r.sensitivity_ranking_defense as [string, number][]) : [];
                    const dualMode = rankingDef.length > 0;
                    const autonomy = typeof r.autonomy_recovery_swing === "number" ? r.autonomy_recovery_swing : null;

                    if (!dualMode) {
                      return (
                        <div>
                          <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground mb-1">Sensitivity Analysis</div>
                          <div className="text-[11px] font-mono text-muted-foreground mb-2">Parameter swing under ±20% perturbation</div>
                          {renderTable(rankingAtk)}
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-5">
                        <div>
                          <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground mb-1">Attack Intensity Sensitivity</div>
                          <div className="text-[11px] font-mono text-muted-foreground mb-2">How much each attacker capability changes mission degradation (±20% perturbation)</div>
                          {renderTable(rankingAtk)}
                        </div>
                        <div>
                          <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground mb-1">Defensive Resilience Sensitivity</div>
                          <div className="text-[11px] font-mono text-muted-foreground mb-2">How much each defense reduces ADCS pointing impact (±20% perturbation)</div>
                          {renderTable(rankingDef)}
                        </div>
                        {autonomy !== null && (
                          <div className="panel-2 px-4 py-3 border-l-2 border-accent">
                            <div className="text-xs font-mono font-bold text-accent mb-1.5">Recovery Autonomy (separate metric)</div>
                            <div className="text-[11px] font-mono text-muted-foreground leading-relaxed">
                              Onboard autonomy is the highest-leverage recovery investment — it reduces operational recovery cost by ~{autonomy.toFixed(0)}% of baseline. This is measured on recovery cost, not pointing impact, so it is not comparable to the swings above. Autonomy does not reduce pointing degradation during the attack; it shortens and cheapens recovery afterward.
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* 11. Validation */}
                  {r.validation_checks && (() => {
                    const vc = r.validation_checks as Record<string, any>;
                    const entries = Object.entries(vc).filter(([k]) => k !== "_summary");
                    const total = entries.length;
                    const passed = entries.filter(([, v]) => v?.passed === true).length;
                    const allPassed = total > 0 && passed === total;
                    return (
                      <div>
                        <div className={`text-[10px] font-mono uppercase tracking-[0.14em] mb-2 ${allPassed ? "text-success" : "text-critical"}`}>
                          {allPassed ? "Validation — All Checks Passed" : "Validation — Issues Detected"}
                          <span className="text-muted-foreground"> ({passed}/{total})</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                          {entries.map(([k, v]: [string, any]) => {
                            const passed = !!v?.passed;
                            return (
                              <div key={k} className="flex items-center gap-2 text-xs font-mono panel-2 px-3 py-1.5">
                                <span className={`text-[10px] font-mono uppercase tracking-[0.14em] px-1.5 py-0.5 rounded border ${
                                  passed ? "border-success/60 text-success bg-success/10" : "border-critical/60 text-critical bg-critical/10"
                                }`}>{passed ? "PASS" : "FAIL"}</span>
                                <span className="truncate">{k.replace(/_/g, " ")}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 12. Event Timeline */}
                  {r.engine && Array.isArray(r.timeline) && r.timeline.length > 0 && (() => {
                    const SUBSYS = ["ADCS", "EPS", "Comms", "Thermal", "Payload", "GroundSegment"] as const;
                    const colorMap: Record<string, string> = {
                      ADCS: "oklch(0.78 0.14 220)",
                      EPS: "oklch(0.85 0.16 95)",
                      Comms: "oklch(0.75 0.18 145)",
                      Thermal: "oklch(0.75 0.18 55)",
                      Payload: "oklch(0.70 0.18 305)",
                      GroundSegment: "oklch(0.65 0.22 22)",
                    };
                    const labelOf = (s: string) => s === "GroundSegment" ? "Ground" : s;
                    const events = (r.timeline as any[]).map((e, i) => ({ ...e, _i: i }))
                      .filter((e) => subsysFilter[e.subsystem] !== false);
                    return (
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground mb-2">Event Timeline</div>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {SUBSYS.map((s) => {
                            const on = subsysFilter[s] !== false;
                            return (
                              <button key={s} type="button"
                                onClick={() => setSubsysFilter((prev) => ({ ...prev, [s]: !on }))}
                                className={`text-[10px] font-mono uppercase tracking-[0.14em] px-2 py-1 rounded border ${on ? "bg-surface-2" : "opacity-40"}`}
                                style={{ borderColor: colorMap[s], color: on ? colorMap[s] : undefined }}>
                                {labelOf(s)}
                              </button>
                            );
                          })}
                        </div>
                        <div className="space-y-1.5">
                          {events.map((e: any) => {
                            const ts = e.time ?? e.sim_time_s;
                            const tsStr = typeof ts === "number" ? `${ts.toFixed(1)}s` : String(ts ?? "—");
                            const et = String(e.event_type ?? "event").toLowerCase();
                            const badgeColor =
                              et === "damage" ? "border-critical/60 text-critical bg-critical/10" :
                              et === "warning" ? "border-amber/60 text-amber bg-amber/10" :
                              et === "cascade" ? "border-primary/60 text-primary bg-primary/10" :
                              et === "mode" ? "border-border text-muted-foreground bg-surface-2" :
                              "border-border text-muted-foreground bg-surface-2";
                            const sub = e.subsystem ?? "—";
                            const isOpen = expandedEvent === e._i;
                            const details = (e.details ?? {}) as Record<string, any>;
                            const detailKeys = [
                              "snr_db","jsr_db","link_margin_db","data_rate_mbps","pointing_error_deg",
                              "control_mode","angular_rate_deg_s","power_generation_w","power_draw_w",
                              "power_margin_w","battery_charge_pct","drain_rate_pct_hr","time_to_depletion_h",
                              "hot_side_delta_c","cold_side_delta_c","max_temp_c","min_temp_c",
                              "stations_operational","stations_total","next_contact_min",
                            ].filter((k) => details?.[k] !== undefined && details?.[k] !== null);
                            return (
                              <div key={e._i} className="panel-2">
                                <button type="button" onClick={() => setExpandedEvent(isOpen ? null : e._i)}
                                  className="w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-surface-2/50">
                                  <span className="text-[11px] font-mono text-muted-foreground w-16 shrink-0">{tsStr}</span>
                                  <span className="flex items-center gap-1.5 w-24 shrink-0">
                                    <span className="h-2 w-2 rounded-full" style={{ background: colorMap[sub] ?? "currentColor" }} />
                                    <span className="text-[11px] font-mono" style={{ color: colorMap[sub] ?? undefined }}>{labelOf(sub)}</span>
                                  </span>
                                  <span className={`text-[10px] font-mono uppercase tracking-[0.14em] px-1.5 py-0.5 rounded border shrink-0 ${badgeColor}`}>{et}</span>
                                  <span className="text-xs flex-1 truncate">{e.description ?? ""}</span>
                                </button>
                                {isOpen && detailKeys.length > 0 && (
                                  <div className="px-3 py-2 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                    {detailKeys.map((k) => (
                                      <div key={k} className="flex justify-between text-[11px] font-mono">
                                        <span className="text-muted-foreground">{k.replace(/_/g, " ")}</span>
                                        <span>{String(details[k])}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 12b. Cascade Log */}
                  {r.engine && Array.isArray(r.timeline) && r.timeline.length > 0 && (
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground mb-2">Cascade Log</div>
                      <div className="panel-2 p-3 max-h-64 overflow-auto">
                        {(r.timeline as any[]).map((e, i) => {
                          const ts = e.time ?? e.sim_time_s;
                          const tsStr = typeof ts === "number" ? `${ts.toFixed(1)}s` : String(ts ?? "—");
                          return (
                            <div key={i} className="text-[11px] font-mono whitespace-pre-wrap">
                              {tsStr} | {e.subsystem ?? "—"} | {e.description ?? ""}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 13. PDF Export */}
                  {r.engine === true && (
                    <div className="pt-2 space-y-2">
                      <button type="button" disabled={pdfPending || sensitivityLoading} onClick={exportPdf}
                        className="w-full h-10 rounded-md border border-primary/60 bg-primary/10 text-primary text-[11px] font-mono uppercase tracking-[0.14em] hover:bg-primary/20 disabled:opacity-50">
                        {pdfPending
                          ? "Generating PDF..."
                          : sensitivityLoading
                            ? "Finalizing sensitivity analysis…"
                            : "Export PDF Report"}
                      </button>
                      {sensitivityFailed && !sensitivityLoading && (
                        <div className="text-[10px] font-mono text-muted-foreground">
                          Sensitivity analysis unavailable — PDF will export without sensitivity section.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Panel>
            );
          })()}

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
              <div className="flex justify-between"><span className="text-muted-foreground">TARGET</span><span>{activeName ?? "—"}</span></div>
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
