import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Panel } from "@/components/AppShell";
import { Satellite, Save, Trash2, Upload, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/configure")({
  head: () => ({
    meta: [
      { title: "Satellite Configuration — OrbitSec" },
      { name: "description", content: "Define satellite physical, RF, and software parameters for cybersecurity simulation." },
    ],
  }),
  component: Configure,
});

const SAVED = [
  { name: "Sentinel-1A", orbit: "LEO · 693km · 98.18°", enc: 3, wheels: 4, mod: "QPSK" },
  { name: "SBIRS-GEO-5", orbit: "GEO · 35,786km · 0.05°", enc: 5, wheels: 4, mod: "8PSK" },
  { name: "WorldView-3", orbit: "LEO · 617km · 97.97°", enc: 4, wheels: 4, mod: "8PSK" },
  { name: "GOES-18", orbit: "GEO · 35,786km · 0.12°", enc: 4, wheels: 4, mod: "QPSK" },
  { name: "WGS-10", orbit: "GEO · 35,786km · 0.03°", enc: 5, wheels: 6, mod: "8PSK" },
];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground">{label}</label>
      {children}
      {hint && <div className="text-[10px] font-mono text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} className={`w-full bg-input border border-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary/60 ${props.className ?? ""}`} />
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button onClick={() => onChange(!checked)} className="flex items-center gap-3 w-full panel-2 px-3 py-2.5 hover:border-primary/40">
      <span className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-primary" : "bg-surface-2 border border-border"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </span>
      <span className="text-sm">{label}</span>
      <span className="ml-auto text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{checked ? "ENABLED" : "DISABLED"}</span>
    </button>
  );
}

function Configure() {
  const [encryption, setEncryption] = useState(3);
  const [netSeg, setNetSeg] = useState(true);
  const [firmware, setFirmware] = useState(true);
  const [mod, setMod] = useState("QPSK");

  return (
    <AppShell title="Satellite Configuration" subtitle="ASSET PROFILE BUILDER · v3">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <Panel title="Physical Parameters" action={<span className="text-[10px] font-mono text-muted-foreground">ASSET ID · OSEC-{Math.floor(Math.random()*9000+1000)}</span>}>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Satellite Name"><Input defaultValue="Sentinel-1A" /></Field>
              <Field label="Altitude (km)" hint="LEO 160-2000 · MEO 2000-35,786 · GEO 35,786"><Input type="number" defaultValue={693} /></Field>
              <Field label="Inclination (degrees)"><Input type="number" defaultValue={98.18} step={0.01} /></Field>
              <Field label="Reaction Wheels (count)" hint="Triple-redundant recommended"><Input type="number" defaultValue={4} /></Field>
              <Field label="Battery Capacity (Wh)"><Input type="number" defaultValue={324} /></Field>
              <Field label="Ground Station Count"><Input type="number" defaultValue={3} /></Field>
            </div>
          </Panel>

          <Panel title="RF & Comms">
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Modulation Scheme">
                <div className="grid grid-cols-3 gap-2">
                  {["BPSK", "QPSK", "8PSK"].map((m) => (
                    <button key={m} onClick={() => setMod(m)} className={`px-3 py-2 text-xs font-mono rounded-md border transition-colors ${
                      mod === m ? "bg-primary/15 border-primary text-primary" : "panel-2 text-muted-foreground hover:text-foreground"
                    }`}>{m}</button>
                  ))}
                </div>
              </Field>
              <Field label={`Encryption Level: ${encryption} / 5`} hint={["NONE", "BASIC", "AES-128", "AES-256", "QUANTUM-SAFE", "QKD"][encryption]}>
                <input type="range" min={1} max={5} value={encryption} onChange={(e) => setEncryption(+e.target.value)} className="w-full accent-primary" />
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                  <span>1 · WEAK</span><span>3 · STD</span><span>5 · QUANTUM</span>
                </div>
              </Field>
            </div>
          </Panel>

          <Panel title="Security Posture">
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Toggle checked={netSeg} onChange={setNetSeg} label="Network Segmentation" />
              <Toggle checked={firmware} onChange={setFirmware} label="Firmware Verification" />
            </div>
          </Panel>

          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">
              <Save className="h-4 w-4" /> Save Configuration
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md panel-2 text-sm hover:border-primary/40">
              <Upload className="h-4 w-4" /> Import TLE / JSON
            </button>
            <div className="ml-auto flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-success" /> CONFIG VALIDATED · 12 PARAMETERS
            </div>
          </div>
        </div>

        <Panel title="Saved Configurations" action={<span className="text-[10px] font-mono text-muted-foreground">{SAVED.length} ASSETS</span>}>
          <div className="divide-y divide-border">
            {SAVED.map((s) => (
              <div key={s.name} className="p-4 hover:bg-surface-2/50">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                    <Satellite className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold font-mono truncate">{s.name}</div>
                    <div className="text-[10px] font-mono text-muted-foreground truncate">{s.orbit}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-mono">
                  <div className="panel-2 px-2 py-1.5"><div className="text-muted-foreground">ENC</div><div className="text-foreground">L{s.enc}</div></div>
                  <div className="panel-2 px-2 py-1.5"><div className="text-muted-foreground">RW</div><div className="text-foreground">{s.wheels}</div></div>
                  <div className="panel-2 px-2 py-1.5"><div className="text-muted-foreground">MOD</div><div className="text-foreground">{s.mod}</div></div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="flex-1 text-xs py-1.5 rounded-md bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25">Load</button>
                  <button className="px-3 py-1.5 rounded-md panel-2 text-muted-foreground hover:text-critical hover:border-critical/40"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
