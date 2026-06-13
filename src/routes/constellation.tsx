import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Panel, StatusBadge } from "@/components/AppShell";

export const Route = createFileRoute("/constellation")({
  head: () => ({
    meta: [
      { title: "Constellation Mode — OrbitSec" },
      { name: "description", content: "Multi-asset cascading attack simulation across a satellite constellation." },
    ],
  }),
  component: Constellation,
});

type Sat = {
  id: string;
  name: string;
  orbit: string;
  alt: string;
  value: string;
  tags: [string, string, string];
};

const INITIAL: Sat[] = [
  { id: "s1", name: "Sentinel-1A", orbit: "LEO", alt: "693km", value: "$380M", tags: ["AES-128", "HMAC-SHA256", "Basic"] },
  { id: "s2", name: "SBIRS-GEO-5", orbit: "GEO", alt: "35,786km", value: "$2.1B", tags: ["AES-256", "Digital Sig", "Zero-Trust"] },
  { id: "s3", name: "WorldView-3", orbit: "LEO", alt: "617km", value: "$650M", tags: ["AES-256", "HMAC-SHA256", "Zero-Trust"] },
  { id: "s4", name: "GOES-18", orbit: "GEO", alt: "35,786km", value: "$500M", tags: ["AES-128", "Seq Counter", "Basic"] },
];

const ATTACKS_LIVE = [
  { id: "gnss", label: "GPS / GNSS Spoofing" },
  { id: "rf", label: "RF Jamming" },
  { id: "cmd", label: "Command Injection" },
  { id: "gs", label: "Ground Station Compromise" },
  { id: "ai", label: "AI-Adaptive GNSS Spoofing" },
];

const RESULTS = [
  {
    id: "s1", name: "Sentinel-1A", orbit: "LEO · 693km",
    deg: 84.2, rec: "4.2h", risk: "CRITICAL" as const, accent: true,
    cascade: "GS cascade from primary: +18.6% via 4/8 shared stations",
    subs: [["ADCS", 92], ["COMMS", 78], ["PAYLOAD", 71]] as const,
  },
  {
    id: "s2", name: "SBIRS-GEO-5", orbit: "GEO · 35,786km",
    deg: 61.3, rec: "3.1h", risk: "HIGH" as const, accent: true,
    cascade: "Shared Vandenberg GS: +12.4% secondary impact",
    subs: [["COMMS", 74], ["PAYLOAD", 58], ["EPS", 41]] as const,
  },
  {
    id: "s3", name: "WorldView-3", orbit: "LEO · 617km",
    deg: 47.8, rec: "2.4h", risk: "HIGH" as const,
    subs: [["ADCS", 62], ["PAYLOAD", 48], ["THERMAL", 32]] as const,
  },
  {
    id: "s4", name: "GOES-18", orbit: "GEO · 35,786km",
    deg: 40.1, rec: "1.8h", risk: "MEDIUM" as const,
    subs: [["COMMS", 55], ["EPS", 38], ["PAYLOAD", 29]] as const,
  },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}

const inputCls = "w-full panel-2 px-2.5 py-1.5 text-xs font-mono bg-transparent rounded outline-none focus:border-primary/50";

function Constellation() {
  const [sats, setSats] = useState<Sat[]>(INITIAL);
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

  const addSat = () => {
    if (sats.length >= 12) return;
    const n = sats.length + 1;
    setSats([...sats, {
      id: `n${Date.now()}`, name: `OSIM-NODE-${n}`, orbit: "LEO", alt: "550km", value: "$120M",
      tags: ["AES-256", "HMAC-SHA256", "Basic"],
    }]);
  };
  const removeSat = (id: string) => setSats(sats.filter((s) => s.id !== id));

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
              <button onClick={addSat} disabled={sats.length >= 12} className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-primary hover:text-primary/80 disabled:opacity-40">
                Add Satellite
              </button>
            }
          >
            <div className="p-3 space-y-2 max-h-[420px] overflow-auto">
              {sats.length === 0 && (
                <div className="text-xs font-mono text-muted-foreground text-center py-8 panel-2">
                  Add 2–12 satellites to the constellation
                </div>
              )}
              {sats.map((s) => (
                <div key={s.id} className="panel-2 p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-[10px] font-mono font-bold text-primary">SAT</span>
                    <span className="text-xs font-mono font-semibold flex-1 truncate">{s.name}</span>
                    <button className="h-5 w-5 rounded hover:bg-background text-muted-foreground hover:text-primary flex items-center justify-center">
                      <span className="text-[9px] font-mono">EDIT</span>
                    </button>
                    <button onClick={() => removeSat(s.id)} className="h-5 w-5 rounded hover:bg-background text-muted-foreground hover:text-critical flex items-center justify-center">
                      <span className="text-[9px] font-mono">DEL</span>
                    </button>
                  </div>
                  <div className="mt-1 text-[10px] font-mono text-muted-foreground">
                    {s.orbit} · {s.alt} · <span className="text-foreground">{s.value}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {s.tags.map((t) => (
                      <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-border bg-background/60 text-muted-foreground">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
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

        {/* CENTER: SVG Diagram */}
        <Panel className="xl:col-span-6" title="Constellation Topology" action={<span className="text-[10px] font-mono text-muted-foreground">{sats.length} ASSETS · 3 GROUND STATIONS</span>}>
          <div className="p-4">
            <div className="relative panel-2 rounded-md overflow-hidden hud-grid" style={{ height: 440 }}>
              <svg viewBox="0 0 800 440" className="w-full h-full">
                <defs>
                  <radialGradient id="halo2">
                    <stop offset="0%" stopColor="oklch(0.65 0.24 22 / 0.5)" />
                    <stop offset="100%" stopColor="oklch(0.65 0.24 22 / 0)" />
                  </radialGradient>
                </defs>

                {/* Earth horizon */}
                <ellipse cx="400" cy="440" rx="500" ry="80" fill="oklch(0.22 0.04 240)" stroke="oklch(0.36 0.02 240)" />
                <ellipse cx="400" cy="440" rx="500" ry="80" fill="none" stroke="oklch(0.78 0.16 195 / 0.3)" />

                {/* Orbit arc */}
                <path d="M 40 180 Q 400 -10 760 180" stroke="oklch(0.36 0.02 240)" strokeWidth="1" fill="none" strokeDasharray="2 4" />

                {(() => {
                  const positions = [
                    { x: 130, y: 110 }, { x: 320, y: 70 }, { x: 510, y: 80 }, { x: 680, y: 130 },
                  ];
                  const stations = [
                    { x: 180, y: 340, name: "SVALBARD" },
                    { x: 400, y: 340, name: "MCMURDO" },
                    { x: 620, y: 340, name: "WALLOPS" },
                  ];
                  const display = sats.slice(0, 4);
                  return (
                    <>
                      {/* sat → gs nominal lines */}
                      {display.map((s, i) => {
                        const p = positions[i % positions.length];
                        const g = stations[i % stations.length];
                        return <line key={`l${s.id}`} x1={p.x} y1={p.y} x2={g.x} y2={g.y} stroke="oklch(0.36 0.02 240)" strokeWidth="1" />;
                      })}

                      {/* cascade dashed red lines from primary */}
                      <line x1={positions[0].x} y1={positions[0].y} x2={stations[0].x} y2={stations[0].y} stroke="oklch(0.65 0.24 22)" strokeWidth="1.5" strokeDasharray="4 4" className="flow-line" />
                      <line x1={stations[0].x} y1={stations[0].y} x2={positions[1].x} y2={positions[1].y} stroke="oklch(0.65 0.24 22)" strokeWidth="1.5" strokeDasharray="4 4" className="flow-line" />
                      <line x1={positions[1].x} y1={positions[1].y} x2={stations[1].x} y2={stations[1].y} stroke="oklch(0.65 0.24 22 / 0.7)" strokeWidth="1.5" strokeDasharray="4 4" className="flow-line" />
                      <line x1={stations[1].x} y1={stations[1].y} x2={positions[2].x} y2={positions[2].y} stroke="oklch(0.74 0.18 50 / 0.8)" strokeWidth="1.5" strokeDasharray="4 4" className="flow-line" />
                      <line x1={positions[2].x} y1={positions[2].y} x2={stations[2].x} y2={stations[2].y} stroke="oklch(0.74 0.18 50 / 0.6)" strokeWidth="1" strokeDasharray="3 3" />

                      {/* satellites */}
                      {display.map((s, i) => {
                        const p = positions[i % positions.length];
                        const r = RESULTS[i];
                        const breach = i < 2;
                        const color = r.deg > 70 ? "oklch(0.65 0.24 22)" : r.deg > 40 ? "oklch(0.74 0.18 50)" : "oklch(0.78 0.16 195)";
                        return (
                          <g key={s.id}>
                            {breach && <circle cx={p.x} cy={p.y} r="22" fill="url(#halo2)" className="pulse-dot" />}
                            <circle cx={p.x} cy={p.y} r="7" fill={color} />
                            <circle cx={p.x} cy={p.y} r="11" fill="none" stroke={color} strokeOpacity="0.5" />
                            <text x={p.x} y={p.y - 18} textAnchor="middle" fontSize="10" className="font-mono" fill="oklch(0.92 0.005 240)">{s.name}</text>
                            <text x={p.x} y={p.y + 24} textAnchor="middle" fontSize="9" className="font-mono" fill={color}>{r.deg}%</text>
                          </g>
                        );
                      })}

                      {/* ground stations */}
                      {stations.map((g) => (
                        <g key={g.name}>
                          <path d={`M ${g.x - 10} ${g.y + 8} L ${g.x} ${g.y - 10} L ${g.x + 10} ${g.y + 8} Z`} fill="oklch(0.205 0.015 240)" stroke="oklch(0.78 0.16 195)" strokeWidth="1.2" />
                          <text x={g.x} y={g.y + 26} textAnchor="middle" fontSize="9" className="font-mono" fill="oklch(0.66 0.018 240)">{g.name}</text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>

              <div className="absolute top-3 left-3 panel-2 px-2 py-1.5 text-[10px] font-mono space-y-1">
                <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-critical pulse-dot" /> CASCADE PATH</div>
                <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> NOMINAL LINK</div>
              </div>
              <div className="absolute bottom-3 right-3 panel-2 px-2 py-1 text-[10px] font-mono text-muted-foreground">FRAME ECI · EPOCH 2026-167T14:32Z</div>
            </div>
          </div>
        </Panel>

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

          <button className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-md bg-gradient-to-r from-primary to-accent text-primary-foreground font-display font-bold tracking-wider hover:brightness-110 shadow-[0_0_30px_-8px_oklch(0.78_0.16_195_/_0.6)]">
            RUN CONSTELLATION ATTACK
          </button>
        </div>
      </div>

      {/* RESULTS */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-xs font-mono uppercase tracking-[0.16em] text-muted-foreground">Constellation Results</h2>
          <span className="text-[10px] font-mono text-muted-foreground">· LAST RUN 14:32:08Z · 500 MC SAMPLES</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="panel p-4">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground"><Activity className="h-3 w-3" /> Aggregate Degradation</div>
            <div className="mt-2 text-3xl font-display font-bold">58.4%</div>
            <div className="text-[10px] font-mono text-muted-foreground mt-1">weighted by asset value</div>
          </div>
          <div className="panel p-4 border-critical/40">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground"><ShieldAlert className="h-3 w-3" /> Peak Degradation</div>
            <div className="mt-2 text-3xl font-display font-bold text-critical">84.2%</div>
            <div className="text-[10px] font-mono text-muted-foreground mt-1">Sentinel-1A · primary target</div>
          </div>
          <div className="panel p-4 border-high/40">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground"><Clock className="h-3 w-3" /> Max Recovery Time</div>
            <div className="mt-2 text-3xl font-display font-bold text-high">6.8h</div>
            <div className="text-[10px] font-mono text-muted-foreground mt-1">end-to-end constellation</div>
          </div>
          <div className="panel p-4 border-success/40">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground"><DollarSign className="h-3 w-3" /> Total Cost</div>
            <div className="mt-2 text-3xl font-display font-bold text-success">$4.2M</div>
            <div className="text-[10px] font-mono text-muted-foreground mt-1">downtime + recovery ops</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {RESULTS.map((r) => (
            <div key={r.id} className={`panel p-4 ${r.accent ? "border-l-4 border-l-high" : ""}`}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <SatIcon className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-mono font-semibold">{r.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">· {r.orbit}</span>
                  </div>
                </div>
                <StatusBadge level={r.risk} />
              </div>

              <div className="mt-3 flex items-end gap-6">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Degradation</div>
                  <div className={`text-2xl font-display font-bold ${r.deg > 70 ? "text-critical" : r.deg > 40 ? "text-high" : "text-medium"}`}>{r.deg}%</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Recovery</div>
                  <div className="text-2xl font-display font-bold">{r.rec}</div>
                </div>
              </div>

              <div className="mt-2 h-1 rounded bg-background overflow-hidden">
                <div className={`h-full ${r.deg > 70 ? "bg-critical" : r.deg > 40 ? "bg-high" : "bg-medium"}`} style={{ width: `${r.deg}%` }} />
              </div>

              {r.cascade && (
                <div className="mt-3 panel-2 px-2.5 py-1.5 text-[10px] font-mono text-high border-high/30">
                  ↳ {r.cascade}
                </div>
              )}

              <div className="mt-3 grid grid-cols-3 gap-2">
                {r.subs.map(([name, v]) => (
                  <div key={name} className="panel-2 p-2">
                    <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{name}</div>
                    <div className={`text-sm font-mono font-semibold ${v > 70 ? "text-critical" : v > 40 ? "text-high" : "text-medium"}`}>{v}%</div>
                    <div className="mt-1 h-0.5 bg-background rounded overflow-hidden">
                      <div className={`h-full ${v > 70 ? "bg-critical" : v > 40 ? "bg-high" : "bg-medium"}`} style={{ width: `${v}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <button className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-gradient-to-r from-primary to-accent text-primary-foreground font-display font-bold tracking-wider hover:brightness-110 shadow-[0_0_30px_-8px_oklch(0.78_0.16_195_/_0.6)]">
            <Download className="h-4 w-4" /> EXPORT CONSTELLATION REPORT
          </button>
        </div>
      </div>
    </AppShell>
  );
}
