import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, Panel } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/configure")({
  head: () => ({
    meta: [
      { title: "Satellite Configuration — OrbitSec" },
      {
        name: "description",
        content:
          "Define satellite physical, RF, and software parameters for cybersecurity simulation.",
      },
    ],
  }),
  component: Configure,
});


// ---------- primitives ----------
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-input border border-border rounded-md px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-primary/60 ${
        props.className ?? ""
      }`}
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-input border border-border rounded-md px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-primary/60"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2.5 panel-2 px-2.5 py-2 cursor-pointer hover:border-primary/40">
      <span
        onClick={() => onChange(!checked)}
        className={`h-4 w-4 rounded-sm border flex items-center justify-center transition-colors ${
          checked ? "bg-primary border-primary" : "border-border bg-surface-2"
        }`}
      >
        {checked && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
      </span>
      <span className="text-xs">{label}</span>
    </label>
  );
}

const ACCENT: Record<string, { bar: string; text: string; chip: string }> = {
  grey: { bar: "bg-muted-foreground/60", text: "text-muted-foreground", chip: "bg-muted-foreground/10 border-muted-foreground/30" },
  cyan: { bar: "bg-primary", text: "text-primary", chip: "bg-primary/10 border-primary/30" },
  yellow: { bar: "bg-warning", text: "text-warning", chip: "bg-warning/10 border-warning/30" },
  green: { bar: "bg-success", text: "text-success", chip: "bg-success/10 border-success/30" },
  orange: { bar: "bg-orange-500", text: "text-orange-400", chip: "bg-orange-500/10 border-orange-500/30" },
  purple: { bar: "bg-purple-500", text: "text-purple-400", chip: "bg-purple-500/10 border-purple-500/30" },
  red: { bar: "bg-critical", text: "text-critical", chip: "bg-critical/10 border-critical/30" },
  darkpurple: { bar: "bg-purple-700", text: "text-purple-300", chip: "bg-purple-700/10 border-purple-700/40" },
  darkgreen: { bar: "bg-emerald-700", text: "text-emerald-300", chip: "bg-emerald-700/10 border-emerald-700/40" },
};

function Section({
  title,
  accent,
  defaultOpen = true,
  children,
}: {
  title: string;
  accent: keyof typeof ACCENT;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const a = ACCENT[accent];
  return (
    <div className="panel rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-2.5 px-4 py-2.5 border-b border-border ${a.chip} hover:brightness-110`}
      >
        <span className={`h-4 w-1 rounded-sm ${a.bar}`} />
        <span className={`text-xs font-mono uppercase tracking-[0.18em] font-semibold ${a.text}`}>
          {title}
        </span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">{open ? "OPEN" : "CLOSED"}</span>
      </button>
      {open && <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">{children}</div>}
    </div>
  );
}

// ---------- main ----------
function Configure() {
  const [mission, setMission] = useState("Earth Observation");

  // ADCS
  const [hasThrusters, setHasThrusters] = useState(false);
  const [anomalyDet, setAnomalyDet] = useState(false);
  const [backupMode, setBackupMode] = useState("None");
  const [autonomy, setAutonomy] = useState("Low");

  // EPS
  const [redundantPower, setRedundantPower] = useState(true);

  // Comms
  const [hasKa, setHasKa] = useState(false);
  const [commsEnc, setCommsEnc] = useState("AES-256");
  const [multiGNSS, setMultiGNSS] = useState(false);
  const [spread, setSpread] = useState("None");
  const [modulation, setModulation] = useState("BPSK");
  const [cmdAuth, setCmdAuth] = useState("None");
  const [fallback, setFallback] = useState({ ka: false, x: true, s: true, uhf: false });

  // Thermal
  const [coating, setCoating] = useState("White Paint");

  // Ground
  const [crosslinks, setCrosslinks] = useState(false);
  const [gsEnc, setGsEnc] = useState("AES-256");
  const [netSeg, setNetSeg] = useState("Basic");
  const [firmware, setFirmware] = useState("Software Signature");
  const [region, setRegion] = useState("Global Distribution");

  const [configs, setConfigs] = useState<Array<{ name: string; created_at: string; config: Record<string, unknown> }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [configName, setConfigName] = useState("");
  const [saving, setSaving] = useState(false);

  const loadConfigs = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await apiFetch("/api/configs");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setConfigs(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const handleDelete = async (name: string) => {
    if (!window.confirm(`Delete config '${name}'?`)) return;
    try {
      const res = await apiFetch(`/api/configs/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || "Failed");
      setConfigs((prev) => prev.filter((c) => c.name !== name));
      toast.success("Configuration deleted");
    } catch (err) {
      toast.error("Failed to delete configuration", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleSave = async () => {
    const name = configName.trim();
    if (!name) {
      toast.error("Enter a config name");
      return;
    }
    const mission_type = mission.toLowerCase().replace(/\s+/g, "_");
    const config = {
      mission_type,
      adcs: {
        has_thrusters: hasThrusters,
        anomaly_detection: anomalyDet,
        backup_mode: backupMode,
        autonomy,
      },
      eps: {
        redundant_power: redundantPower,
      },
      comms: {
        has_ka: hasKa,
        encryption: commsEnc,
        multi_gnss: multiGNSS,
        spread_spectrum: spread,
        modulation,
        command_auth: cmdAuth,
        fallback_chain: fallback,
      },
      thermal: {
        coating,
      },
      payload: {},
      ground_segment: {
        crosslinks,
        encryption: gsEnc,
        net_segmentation: netSeg,
        firmware_verification: firmware,
        region,
      },
      financial: {},
    };
    setSaving(true);
    try {
      const res = await apiFetch("/api/configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, config }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || "Failed");
      toast.success("Configuration saved");
      setConfigName("");
      await loadConfigs();
    } catch (err) {
      toast.error("Failed to save configuration", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Satellite Configuration" subtitle="ASSET PROFILE BUILDER · v3">
      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-4">
        {/* LEFT: Saved + TLE */}
        <div className="space-y-4">
          <Panel
            title="Saved Configurations"
            action={
              <span className="text-[10px] font-mono text-muted-foreground">
                {configs.length} ASSETS
              </span>
            }
          >
            {loading && (
              <div className="p-3.5 text-[10px] font-mono text-muted-foreground">
                Loading configurations…
              </div>
            )}
            {error && (
              <div className="p-3.5 text-[10px] font-mono text-red-400">
                Failed to load configurations
              </div>
            )}
            {!loading && !error && (
              <div className="divide-y divide-border">
                {configs.map((s) => (
                  <div key={s.name} className="p-3.5 hover:bg-surface-2/50">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                        <span className="text-[10px] font-mono font-bold">SAT</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold font-mono truncate">{s.name}</div>
                        <div className="text-[10px] font-mono text-muted-foreground truncate">
                          {s.config?.mission_type ? String(s.config.mission_type) : new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                      <div className="panel-2 px-2 py-1">
                        <div className="text-muted-foreground">ENC</div>
                        <div>{String(s.config?.enc ?? "—")}</div>
                      </div>
                      <div className="panel-2 px-2 py-1">
                        <div className="text-muted-foreground">RW</div>
                        <div>{String(s.config?.wheels ?? "—")}</div>
                      </div>
                      <div className="panel-2 px-2 py-1">
                        <div className="text-muted-foreground">MOD</div>
                        <div>{String(s.config?.mod ?? "—")}</div>
                      </div>
                    </div>
                    <div className="mt-2.5 flex gap-2">
                      <button className="flex-1 text-xs py-1.5 rounded-md bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25">
                        Load
                      </button>
                      <button className="px-3 py-1.5 rounded-md panel-2 text-muted-foreground hover:text-critical hover:border-critical/40">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            title="Custom TLE"
            action={
              <span className="text-[10px] font-mono text-muted-foreground">
                TWO-LINE ELEMENT SET
              </span>
            }
          >
            <div className="p-4 space-y-3">
              <Field label="Name (optional)">
                <Input placeholder="CUSTOM-SAT-01" />
              </Field>
              <Field label="TLE Line 1">
                <textarea
                  rows={2}
                  placeholder="1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9994"
                  className="w-full bg-input border border-border rounded-md px-2.5 py-1.5 text-[10px] font-mono focus:outline-none focus:border-primary/60 resize-none"
                />
              </Field>
              <Field label="TLE Line 2">
                <textarea
                  rows={2}
                  placeholder="2 25544  51.6400 337.6640 0007417  35.4720  68.5060 15.49309239433400"
                  className="w-full bg-input border border-border rounded-md px-2.5 py-1.5 text-[10px] font-mono focus:outline-none focus:border-primary/60 resize-none"
                />
              </Field>
              <div className="flex gap-2 pt-1">
                <button className="flex-1 text-xs py-2 rounded-md bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 font-semibold">
                  Load Satellite
                </button>
                <button className="px-4 text-xs py-2 rounded-md panel-2 hover:border-border text-muted-foreground">
                  Cancel
                </button>
              </div>
            </div>
          </Panel>
        </div>

        {/* RIGHT: Form */}
        <div className="space-y-3">
          <div className="panel rounded-lg p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
                Mission Type
              </div>
            </div>
            <div className="w-72">
              <Select
                value={mission}
                onChange={setMission}
                options={["Earth Observation", "Communications", "Navigation", "Scientific"]}
              />
            </div>
          </div>

          <Section title="Orbital Parameters" accent="grey">
            <Field label="Altitude (km)">
              <Input type="number" defaultValue={400} min={200} max={40000} />
            </Field>
            <Field label="Inclination (deg)">
              <Input type="number" defaultValue={51.6} step={0.1} />
            </Field>
          </Section>

          <Section title="ADCS" accent="cyan">
            <Field label="Pointing Accuracy (deg)"><Input type="number" defaultValue={0.1} step={0.01} /></Field>
            <Field label="Reaction Wheels"><Input type="number" defaultValue={4} /></Field>
            <Field label="Star Trackers"><Input type="number" defaultValue={2} /></Field>
            <Field label="ST Accuracy (arcsec)"><Input type="number" defaultValue={10} /></Field>
            <Field label="Gyroscopes"><Input type="number" defaultValue={4} /></Field>
            <Field label="Gyro Drift (deg/hr)"><Input type="number" defaultValue={1.0} step={0.1} /></Field>
            <Field label="Slew Rate (deg/s)"><Input type="number" defaultValue={1.0} step={0.1} /></Field>
            <Field label="Wheel Momentum (Nms)"><Input type="number" defaultValue={50} /></Field>
            <Field label="Sun Sensors"><Input type="number" defaultValue={6} /></Field>
            <Field label="Magnetometers"><Input type="number" defaultValue={3} /></Field>
            <Field label="Magnetorquers"><Input type="number" defaultValue={3} /></Field>
            <div className="col-span-2 md:col-span-3 grid grid-cols-2 gap-3">
              <CheckRow checked={hasThrusters} onChange={setHasThrusters} label="Has Thrusters" />
              <CheckRow checked={anomalyDet} onChange={setAnomalyDet} label="Anomaly Detection" />
            </div>
            <Field label="Backup ADCS Mode">
              <Select value={backupMode} onChange={setBackupMode} options={["None", "Thruster-Based", "Magnetorquer-Based"]} />
            </Field>
            {backupMode !== "None" && (
              <Field label="Backup Pointing (deg)"><Input type="number" defaultValue={1.0} step={0.1} /></Field>
            )}
            {backupMode === "Thruster-Based" && (
              <Field label="Switchover Time (s)"><Input type="number" defaultValue={60} /></Field>
            )}
            <Field label="Onboard Autonomy">
              <Select value={autonomy} onChange={setAutonomy} options={["Low", "Medium", "High"]} />
            </Field>
            {autonomy !== "Low" && (
              <Field label="Detection Threshold (s)"><Input type="number" defaultValue={30} /></Field>
            )}
            <Field label="Propellant Remaining (kg)"><Input type="number" defaultValue={100} /></Field>
            <Field label="Specific Impulse (s)"><Input type="number" defaultValue={220} /></Field>
          </Section>

          <Section title="EPS" accent="yellow">
            <Field label="Solar Panel Area (m²)"><Input type="number" defaultValue={4.0} step={0.1} /></Field>
            <Field label="Cell Efficiency"><Input type="number" defaultValue={0.30} step={0.01} /></Field>
            <Field label="Solar Arrays"><Input type="number" defaultValue={2} /></Field>
            <Field label="Battery (Wh)"><Input type="number" defaultValue={1000} /></Field>
            <Field label="Battery Cells"><Input type="number" defaultValue={48} /></Field>
            <Field label="Battery Voltage (V)"><Input type="number" defaultValue={28} /></Field>
            <Field label="Power Buses"><Input type="number" defaultValue={2} /></Field>
            <Field label="Nominal Draw (W)"><Input type="number" defaultValue={200} /></Field>
            <Field label="Peak Draw (W)"><Input type="number" defaultValue={400} /></Field>
            <div className="col-span-2 md:col-span-3">
              <CheckRow checked={redundantPower} onChange={setRedundantPower} label="Redundant Power" />
            </div>
          </Section>

          <Section title="Comms" accent="green">
            <Field label="S-Band Antennas"><Input type="number" defaultValue={2} /></Field>
            <Field label="S-Band Gain (dBi)"><Input type="number" defaultValue={12.0} step={0.1} /></Field>
            <Field label="S-Band Freq (MHz)"><Input type="number" defaultValue={2200} /></Field>
            <Field label="S-Band Tx Power (W)"><Input type="number" defaultValue={5.0} step={0.1} /></Field>
            <Field label="S-Band Data (Mbps)"><Input type="number" defaultValue={10} /></Field>
            <Field label="X-Band Antennas"><Input type="number" defaultValue={1} /></Field>
            <Field label="X-Band Gain (dBi)"><Input type="number" defaultValue={25} /></Field>
            <Field label="X-Band Freq (MHz)"><Input type="number" defaultValue={8400} /></Field>
            <Field label="X-Band Tx Power (W)"><Input type="number" defaultValue={10} /></Field>
            <Field label="X-Band Data (Mbps)"><Input type="number" defaultValue={100} /></Field>
            <Field label="Rx Sensitivity (dBm)"><Input type="number" defaultValue={-110} /></Field>
            <div className="col-span-2 md:col-span-3 grid grid-cols-2 gap-3">
              <CheckRow checked={hasKa} onChange={setHasKa} label="Has Ka-Band" />
              <CheckRow checked={multiGNSS} onChange={setMultiGNSS} label="Multi-GNSS" />
            </div>
            <Field label="Encryption">
              <Select value={commsEnc} onChange={setCommsEnc} options={["AES-256", "AES-128", "None"]} />
            </Field>
            <Field label="Spread Spectrum">
              <Select value={spread} onChange={setSpread} options={["None", "FHSS", "DSSS"]} />
            </Field>
            <Field label="GPS Anti-Jam Margin (dB)"><Input type="number" defaultValue={0} max={30} /></Field>
            <Field label="Modulation Scheme">
              <Select value={modulation} onChange={setModulation} options={["BPSK", "QPSK", "8PSK"]} />
            </Field>
            <Field label="Command Authentication">
              <Select value={cmdAuth} onChange={setCmdAuth} options={["None", "Seq Counter", "HMAC-SHA256", "Digital Sig"]} />
            </Field>
            <div className="col-span-2 md:col-span-3 panel-2 p-3 rounded-md">
              <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground mb-2">
                Frequency Fallback Chain · Ordered Ka→X→S→UHF (checked = included)
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <CheckRow checked={fallback.ka} onChange={(v) => setFallback({ ...fallback, ka: v })} label="Ka-Band" />
                <CheckRow checked={fallback.x} onChange={(v) => setFallback({ ...fallback, x: v })} label="X-Band" />
                <CheckRow checked={fallback.s} onChange={(v) => setFallback({ ...fallback, s: v })} label="S-Band" />
                <CheckRow checked={fallback.uhf} onChange={(v) => setFallback({ ...fallback, uhf: v })} label="UHF" />
              </div>
            </div>
          </Section>

          <Section title="Thermal" accent="orange">
            <Field label="Radiator Area (m²)"><Input type="number" defaultValue={2.0} step={0.1} /></Field>
            <Field label="Emissivity"><Input type="number" defaultValue={0.85} step={0.01} /></Field>
            <Field label="Heaters"><Input type="number" defaultValue={6} /></Field>
            <Field label="Heater Power (W)"><Input type="number" defaultValue={10} /></Field>
            <Field label="MLI Layers"><Input type="number" defaultValue={15} /></Field>
            <Field label="Min Op Temp (°C)"><Input type="number" defaultValue={-20} /></Field>
            <Field label="Max Op Temp (°C)"><Input type="number" defaultValue={50} /></Field>
            <Field label="Batt Min Temp (°C)"><Input type="number" defaultValue={0} /></Field>
            <Field label="Batt Max Temp (°C)"><Input type="number" defaultValue={40} /></Field>
            <Field label="Heat Pipes"><Input type="number" defaultValue={4} /></Field>
            <Field label="Coating">
              <Select value={coating} onChange={setCoating} options={["White Paint", "OSR", "Gold Foil"]} />
            </Field>
          </Section>

          <Section title="Payload" accent="purple">
            <Field label="Optical Aperture (m)"><Input type="number" defaultValue={0.5} step={0.1} /></Field>
            <Field label="Focal Length (m)"><Input type="number" defaultValue={5.0} step={0.1} /></Field>
            <Field label="GSD (m)"><Input type="number" defaultValue={1.0} step={0.1} /></Field>
            <Field label="Data Rate (Gbps)"><Input type="number" defaultValue={2.0} step={0.1} /></Field>
            <Field label="Storage (GB)"><Input type="number" defaultValue={500} /></Field>
            <Field label="Power Draw (W)"><Input type="number" defaultValue={100} /></Field>
            <Field label="Pointing Req (deg)"><Input type="number" defaultValue={0.01} step={0.01} /></Field>
          </Section>

          <Section title="Ground Segment" accent="red">
            <Field label="Ground Stations"><Input type="number" defaultValue={3} /></Field>
            <Field label="Uplink Freq (MHz)"><Input type="number" defaultValue={2025} /></Field>
            <Field label="Downlink Freq (MHz)"><Input type="number" defaultValue={2200} /></Field>
            <Field label="Antenna Gain (dBi)"><Input type="number" defaultValue={20} /></Field>
            <Field label="Ground Tx Power (W)"><Input type="number" defaultValue={100} /></Field>
            <Field label="Contact Window (min)"><Input type="number" defaultValue={10} /></Field>
            <Field label="Passes/Day"><Input type="number" defaultValue={6} /></Field>
            <div className="col-span-2 md:col-span-3">
              <CheckRow checked={crosslinks} onChange={setCrosslinks} label="Has Crosslinks" />
            </div>
            <Field label="Encryption">
              <Select value={gsEnc} onChange={setGsEnc} options={["AES-256", "AES-128", "None"]} />
            </Field>
            <Field label="Net Segmentation">
              <Select value={netSeg} onChange={setNetSeg} options={["Basic", "None", "Zero-Trust"]} />
            </Field>
            <Field label="Firmware Verification">
              <Select value={firmware} onChange={setFirmware} options={["Software Signature", "Hardware Root of Trust", "No Verification"]} />
            </Field>
            <Field label="GS Region">
              <Select value={region} onChange={setRegion} options={["Global Distribution", "North America", "Europe", "Middle East", "Asia Pacific"]} />
            </Field>
          </Section>

          <Section title="Radiation Hardening" accent="darkpurple">
            <Field label="Total Ionizing Dose (krad)"><Input type="number" defaultValue={20} /></Field>
          </Section>

          <Section title="Financial Parameters" accent="darkgreen">
            <Field label="Downtime Rate ($/hr)"><Input type="number" defaultValue={15000} /></Field>
            <Field label="Asset Value ($M)"><Input type="number" defaultValue={300} /></Field>
            <Field label="Recovery Ops Rate ($/hr)"><Input type="number" defaultValue={5000} /></Field>
          </Section>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-success/10 border border-success/50 text-success text-sm font-semibold hover:bg-success/20"
            >
              Save Config
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md panel-2 text-sm hover:border-primary/40">
              Import TLE / JSON
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
