import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Panel, StatusBadge } from "@/components/AppShell";
import { Plus, X, Play, Network } from "lucide-react";

export const Route = createFileRoute("/constellation")({
  head: () => ({
    meta: [
      { title: "Constellation Mode — OrbitSec" },
      { name: "description", content: "Simulate cascading attack propagation across a multi-satellite constellation." },
    ],
  }),
  component: Constellation,
});

const SATS = [
  { id: "s1", name: "Sentinel-1A", x: 120, y: 80, gs: "g1", deg: 84, breach: true },
  { id: "s2", name: "SBIRS-GEO-5", x: 260, y: 50, gs: "g2", deg: 71, breach: true },
  { id: "s3", name: "WorldView-3", x: 400, y: 90, gs: "g1", deg: 58, breach: true },
  { id: "s4", name: "GOES-18", x: 540, y: 60, gs: "g2", deg: 42, breach: false },
  { id: "s5", name: "WGS-10", x: 680, y: 95, gs: "g3", deg: 18, breach: false },
  { id: "s6", name: "OSIM-NODE-7", x: 800, y: 70, gs: "g3", deg: 9, breach: false },
];

const GS = [
  { id: "g1", x: 180, y: 320, name: "DIEGO GARCIA" },
  { id: "g2", x: 420, y: 320, name: "VANDENBERG" },
  { id: "g3", x: 720, y: 320, name: "GUAM SCF" },
];

function Constellation() {
  const [pool] = useState(["WorldView-2", "Iridium-NEXT-3", "Starlink-OPS-44"]);

  return (
    <AppShell title="Constellation Mode" subtitle="MULTI-ASSET CASCADING ATTACK · LIVE">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel className="xl:col-span-2" title="Orbital Topology" action={<span className="text-[10px] font-mono text-muted-foreground">6 ASSETS · 3 GROUND STATIONS</span>}>
          <div className="p-4">
            <div className="relative panel-2 rounded-md overflow-hidden hud-grid" style={{ height: 420 }}>
              <svg viewBox="0 0 900 420" className="w-full h-full">
                <defs>
                  <linearGradient id="orb" x1="0" x2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.16 195 / 0.6)" />
                    <stop offset="100%" stopColor="oklch(0.78 0.16 195 / 0)" />
                  </linearGradient>
                  <radialGradient id="halo">
                    <stop offset="0%" stopColor="oklch(0.78 0.16 195 / 0.4)" />
                    <stop offset="100%" stopColor="oklch(0.78 0.16 195 / 0)" />
                  </radialGradient>
                </defs>

                {/* Earth horizon */}
                <ellipse cx="450" cy="420" rx="500" ry="80" fill="oklch(0.22 0.04 240)" stroke="oklch(0.36 0.02 240)" />
                <ellipse cx="450" cy="420" rx="500" ry="80" fill="none" stroke="oklch(0.78 0.16 195 / 0.3)" />

                {/* Orbit arcs */}
                <path d="M 60 140 Q 450 -40 850 140" stroke="oklch(0.36 0.02 240)" strokeWidth="1" fill="none" strokeDasharray="2 4" />
                <path d="M 60 200 Q 450 40 850 200" stroke="oklch(0.36 0.02 240)" strokeWidth="1" fill="none" strokeDasharray="2 4" />

                {/* GS to sat lines + propagation */}
                {SATS.map((s) => {
                  const gs = GS.find((g) => g.id === s.gs)!;
                  return (
                    <g key={s.id}>
                      <line x1={s.x} y1={s.y} x2={gs.x} y2={gs.y}
                        stroke={s.breach ? "oklch(0.65 0.24 22 / 0.7)" : "oklch(0.36 0.02 240)"}
                        strokeWidth={s.breach ? 1.5 : 1}
                        className={s.breach ? "flow-line" : ""}
                      />
                    </g>
                  );
                })}

                {/* Inter-satellite breach links */}
                <line x1={120} y1={80} x2={260} y2={50} stroke="oklch(0.65 0.24 22 / 0.8)" strokeWidth="1.5" className="flow-line" />
                <line x1={260} y1={50} x2={400} y2={90} stroke="oklch(0.65 0.24 22 / 0.8)" strokeWidth="1.5" className="flow-line" />
                <line x1={400} y1={90} x2={540} y2={60} stroke="oklch(0.74 0.18 50 / 0.6)" strokeWidth="1" strokeDasharray="3 3" />

                {/* Satellites */}
                {SATS.map((s) => (
                  <g key={s.id}>
                    {s.breach && <circle cx={s.x} cy={s.y} r="22" fill="url(#halo)" className="pulse-dot" />}
                    <circle cx={s.x} cy={s.y} r="6" fill={s.breach ? "oklch(0.65 0.24 22)" : "oklch(0.78 0.16 195)"} />
                    <circle cx={s.x} cy={s.y} r="10" fill="none" stroke={s.breach ? "oklch(0.65 0.24 22)" : "oklch(0.78 0.16 195)"} strokeOpacity="0.5" />
                    <text x={s.x} y={s.y - 16} textAnchor="middle" className="font-mono" fontSize="10" fill="oklch(0.92 0.005 240)">{s.name}</text>
                    <text x={s.x} y={s.y + 22} textAnchor="middle" className="font-mono" fontSize="9" fill={s.breach ? "oklch(0.65 0.24 22)" : "oklch(0.66 0.018 240)"}>{s.deg}%</text>
                  </g>
                ))}

                {/* Ground stations */}
                {GS.map((g) => (
                  <g key={g.id}>
                    <rect x={g.x - 8} y={g.y - 8} width="16" height="16" fill="oklch(0.205 0.015 240)" stroke="oklch(0.78 0.16 195)" />
                    <path d={`M ${g.x - 6} ${g.y - 8} L ${g.x} ${g.y - 14} L ${g.x + 6} ${g.y - 8}`} stroke="oklch(0.78 0.16 195)" fill="none" strokeWidth="1" />
                    <text x={g.x} y={g.y + 28} textAnchor="middle" className="font-mono" fontSize="9" fill="oklch(0.66 0.018 240)">{g.name}</text>
                  </g>
                ))}
              </svg>

              <div className="absolute top-3 left-3 panel-2 px-2 py-1.5 text-[10px] font-mono">
                <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-critical pulse-dot" /> ACTIVE BREACH PATH</div>
                <div className="flex items-center gap-2 mt-1"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> NOMINAL LINK</div>
              </div>
              <div className="absolute bottom-3 right-3 panel-2 px-2 py-1 text-[10px] font-mono text-muted-foreground">FRAME ECI · EPOCH 2026-167T14:32Z</div>
            </div>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Constellation Roster">
            <div className="p-3 space-y-1.5">
              {SATS.map((s) => (
                <div key={s.id} className="flex items-center gap-2 panel-2 px-2.5 py-2">
                  <Network className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-mono flex-1 truncate">{s.name}</span>
                  {s.breach && <StatusBadge level="CRITICAL" />}
                  <button className="h-6 w-6 rounded hover:bg-background text-muted-foreground hover:text-critical flex items-center justify-center">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-border">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Add from pool</div>
              {pool.map((p) => (
                <button key={p} className="w-full flex items-center gap-2 panel-2 px-2.5 py-2 mb-1 hover:border-primary/40 text-left">
                  <Plus className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-mono flex-1">{p}</span>
                </button>
              ))}
            </div>
          </Panel>

          <button className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-md bg-critical text-critical-foreground font-display font-bold tracking-wider hover:bg-critical/90 shadow-[0_0_30px_-8px_oklch(0.65_0.24_22_/_0.6)]">
            <Play className="h-4 w-4" /> RUN CONSTELLATION ATTACK
          </button>
        </div>
      </div>

      <Panel className="mt-4" title="Per-Satellite Degradation">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-4">
          {SATS.map((s) => (
            <div key={s.id} className="panel-2 p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">{s.name}</span>
                <StatusBadge level={s.deg > 70 ? "CRITICAL" : s.deg > 40 ? "HIGH" : s.deg > 20 ? "MEDIUM" : "LOW"} />
              </div>
              <div className="mt-2 flex items-end justify-between">
                <span className={`font-mono text-2xl ${s.deg > 70 ? "text-critical" : s.deg > 40 ? "text-high" : s.deg > 20 ? "text-medium" : "text-low"}`}>{s.deg}%</span>
                <span className="text-[10px] font-mono text-muted-foreground">via GS-{s.gs.toUpperCase()}</span>
              </div>
              <div className="mt-2 h-1 rounded bg-background overflow-hidden">
                <div className={`h-full ${s.deg > 70 ? "bg-critical" : s.deg > 40 ? "bg-high" : s.deg > 20 ? "bg-medium" : "bg-low"}`} style={{ width: `${s.deg}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </AppShell>
  );
}
