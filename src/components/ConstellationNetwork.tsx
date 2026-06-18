import { useMemo } from "react";
import { Panel } from "@/components/AppShell";

type RosterSat = {
  id: string;
  name: string;
  norad_id?: number | string;
  orbit_type?: string;
  altitude_km?: number;
  asset_value_usd?: number;
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

type Props = {
  roster: RosterSat[];
  result: ConstellationResponse | null;
  sharedStations?: number;
  totalStations?: number;
  loading?: boolean;
  error?: string | null;
};

// Lay nodes out in a gentle arc across the canvas, spaced by count.
function layout(n: number, w: number, h: number, topPad: number, bottomPad: number) {
  const positions: { x: number; y: number }[] = [];
  if (n <= 0) return positions;
  const leftPad = 90;
  const rightPad = 90;
  const usable = w - leftPad - rightPad;
  const cy = topPad + (h - topPad - bottomPad) / 2 - 30;
  const arcAmp = Math.min(60, 14 + n * 4);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x = leftPad + usable * t;
    // gentle arc: high at edges, low (up) in middle — alternating slight stagger
    const arc = Math.sin(t * Math.PI) * -arcAmp;
    const stagger = (i % 2 === 0 ? -1 : 1) * 10;
    positions.push({ x, y: cy + arc + stagger });
  }
  return positions;
}

function topSubsystem(impacts?: SubsystemImpact): string | null {
  if (!impacts) return null;
  const entries = Object.entries(impacts);
  if (!entries.length) return null;
  entries.sort((a, b) => b[1] - a[1]);
  const [name, val] = entries[0];
  return `${name} ${Math.round(val)}%`;
}

function damageRgba(deg: number, alpha = 1): string {
  // muted red intensity; neutral when low
  const d = Math.max(0, Math.min(100, deg)) / 100;
  if (d < 0.05) return `rgba(120, 140, 150, ${alpha * 0.55})`;
  // interpolate from muted slate -> muted red
  const r = Math.round(90 + d * 130);
  const g = Math.round(95 - d * 55);
  const b = Math.round(105 - d * 65);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function ConstellationNetwork({
  roster,
  result,
  sharedStations = 0,
  totalStations = 0,
  loading = false,
  error = null,
}: Props) {
  const W = 900;
  const H = 500;

  const positions = useMemo(() => layout(roster.length, W, H, 60, 140), [roster.length]);

  // Build result lookup
  const resByName = useMemo(() => {
    const m = new Map<string, SatelliteResult>();
    (result?.satellite_results ?? []).forEach((r) => m.set(r.satellite_name, r));
    return m;
  }, [result]);

  // Primary target = highest asset value (cascade source)
  const primaryIdx = useMemo(() => {
    if (!roster.length) return -1;
    let best = 0;
    let bestV = -Infinity;
    roster.forEach((s, i) => {
      const v = s.asset_value_usd ?? 0;
      if (v > bestV) {
        bestV = v;
        best = i;
      }
    });
    return best;
  }, [roster]);

  const hubX = W / 2;
  const hubY = H - 95;

  const cascadeCount = useMemo(
    () => (result?.satellite_results ?? []).filter((r) => r.cascade_applied).length,
    [result]
  );

  if (loading) {
    return (
      <Panel title="Constellation Network">
        <div className="flex items-center justify-center" style={{ height: 440 }}>
          <div className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground animate-pulse">
            LOADING CONSTELLATION…
          </div>
        </div>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel title="Constellation Network">
        <div className="flex items-center justify-center" style={{ height: 440 }}>
          <div className="text-xs font-mono text-critical">{error}</div>
        </div>
      </Panel>
    );
  }

  if (roster.length === 0) {
    return (
      <Panel title="Constellation Network">
        <div className="flex items-center justify-center" style={{ height: 440 }}>
          <div className="text-xs font-mono uppercase tracking-[0.16em] text-muted-foreground">
            ADD SATELLITES TO BUILD THE CONSTELLATION
          </div>
        </div>
      </Panel>
    );
  }

  const primary = primaryIdx >= 0 ? roster[primaryIdx] : null;
  const primaryPos = primaryIdx >= 0 ? positions[primaryIdx] : null;
  const primaryRes = primary ? resByName.get(primary.name) : undefined;

  return (
    <Panel
      title={result ? "CONSTELLATION — CASCADE PROPAGATION" : `CONSTELLATION — ${roster.length} ASSETS`}
      action={
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          {result ? "POST-ATTACK" : "STANDBY"}
        </span>
      }
    >
      <style>{`
        @keyframes cn-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes cn-bob2 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(3px); } }
        @keyframes cn-panel-spin { 0% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } 100% { transform: rotate(-3deg); } }
        @keyframes cn-idle-dash { to { stroke-dashoffset: -28; } }
        @keyframes cn-pulse-halo { 0%,100% { opacity: 0.35; r: 46; } 50% { opacity: 0.7; r: 54; } }
        @keyframes cn-cascade-dash { to { stroke-dashoffset: -60; } }
        @keyframes cn-cascade-fade { 0% { opacity: 0; } 30% { opacity: 1; } 100% { opacity: 0.9; } }
        @keyframes cn-spark { 0% { opacity: 0; } 25% { opacity: 1; } 100% { opacity: 0; } }
        .cn-node-bob { animation: cn-bob 6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .cn-node-bob.alt { animation-name: cn-bob2; animation-duration: 7s; }
        .cn-panel-sway { animation: cn-panel-spin 8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .cn-idle-link { stroke-dasharray: 4 6; animation: cn-idle-dash 6s linear infinite; }
        .cn-halo { animation: cn-pulse-halo 2.4s ease-in-out infinite; }
      `}</style>

      <div className="p-3">
        <div className="relative w-full panel-2 rounded" style={{ height: 440 }}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
            <defs>
              <radialGradient id="cn-hub-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="cn-cascade-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
                <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="1" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* Subtle grid backdrop */}
            <g opacity="0.08" stroke="hsl(var(--primary))" strokeWidth="1">
              {Array.from({ length: 9 }, (_, i) => (
                <line key={`v${i}`} x1={(i + 1) * (W / 10)} y1={20} x2={(i + 1) * (W / 10)} y2={H - 20} />
              ))}
              {Array.from({ length: 5 }, (_, i) => (
                <line key={`h${i}`} x1={20} y1={(i + 1) * (H / 6)} x2={W - 20} y2={(i + 1) * (H / 6)} />
              ))}
            </g>

            {/* Hub */}
            <g>
              <circle cx={hubX} cy={hubY} r={60} fill="url(#cn-hub-grad)" />
              <circle
                cx={hubX}
                cy={hubY}
                r={22}
                fill="hsl(var(--background))"
                stroke="hsl(var(--primary))"
                strokeOpacity="0.7"
                strokeWidth="1.2"
              />
              <circle cx={hubX} cy={hubY} r={6} fill="hsl(var(--primary))" opacity="0.85" />
              <text
                x={hubX}
                y={hubY + 42}
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
                fontSize="9"
                letterSpacing="2"
                fill="hsl(var(--muted-foreground))"
              >
                SHARED GROUND SEGMENT
              </text>
              <text
                x={hubX}
                y={hubY + 55}
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
                fontSize="9"
                letterSpacing="1.5"
                fill="hsl(var(--primary))"
                opacity="0.85"
              >
                {sharedStations}/{totalStations} STATIONS SHARED
              </text>
            </g>

            {/* Hub links (idle) */}
            {positions.map((p, i) => (
              <line
                key={`hub-${i}`}
                x1={p.x}
                y1={p.y + 8}
                x2={hubX}
                y2={hubY}
                stroke="hsl(var(--primary))"
                strokeOpacity="0.22"
                strokeWidth="1"
                className="cn-idle-link"
              />
            ))}

            {/* Inter-sat thin idle links (chain neighbors) */}
            {positions.map((p, i) => {
              if (i === positions.length - 1) return null;
              const n = positions[i + 1];
              return (
                <line
                  key={`chain-${i}`}
                  x1={p.x}
                  y1={p.y}
                  x2={n.x}
                  y2={n.y}
                  stroke="hsl(var(--primary))"
                  strokeOpacity="0.18"
                  strokeWidth="1"
                  className="cn-idle-link"
                />
              );
            })}

            {/* Cascade arcs (post-attack) from primary target to affected nodes */}
            {result && primaryPos &&
              roster.map((s, i) => {
                if (i === primaryIdx) return null;
                const r = resByName.get(s.name);
                if (!r || !r.cascade_applied) return null;
                const p = positions[i];
                const mx = (primaryPos.x + p.x) / 2;
                const my = Math.min(primaryPos.y, p.y) - 60;
                const delay = (i % 8) * 0.25;
                return (
                  <g key={`cas-${i}`} style={{ animation: `cn-cascade-fade 1.2s ease-out ${delay}s both` }}>
                    <path
                      d={`M ${primaryPos.x} ${primaryPos.y} Q ${mx} ${my} ${p.x} ${p.y}`}
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeOpacity="0.85"
                      strokeWidth="1.6"
                      strokeDasharray="10 14"
                      style={{ animation: `cn-cascade-dash 1.4s linear infinite` }}
                    />
                    <path
                      d={`M ${primaryPos.x} ${primaryPos.y} Q ${mx} ${my} ${p.x} ${p.y}`}
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeOpacity="0.18"
                      strokeWidth="4"
                    />
                  </g>
                );
              })}

            {/* Nodes */}
            {roster.map((s, i) => {
              const p = positions[i];
              const r = resByName.get(s.name);
              const deg = r?.mission_degradation_percent ?? 0;
              const isPrimary = i === primaryIdx;
              const isAffected = !!r?.cascade_applied;
              const bodyFill = result ? damageRgba(deg, 0.95) : "rgba(120,140,150,0.18)";
              const bodyStroke = result
                ? deg > 5
                  ? "hsl(var(--critical, 0 70% 55%))"
                  : "hsl(var(--primary))"
                : "hsl(var(--primary))";
              const status = r ? topSubsystem(r.subsystem_impacts) : null;
              const altDisplay =
                s.altitude_km != null ? `${s.orbit_type ?? "ORB"} · ${Math.round(s.altitude_km)} km` : (s.orbit_type ?? "—");

              const bobClass = i % 2 === 0 ? "cn-node-bob" : "cn-node-bob alt";

              return (
                <g key={s.id}>
                  {/* Primary halo */}
                  {result && isPrimary && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={46}
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeOpacity="0.55"
                      strokeWidth="1.4"
                      className="cn-halo"
                    />
                  )}

                  {/* Satellite glyph (group bobs as a whole) */}
                  <g className={bobClass} style={{ animationDelay: `${(i * 0.4) % 3}s` }}>
                    {/* Solar panel left */}
                    <g className="cn-panel-sway" style={{ animationDelay: `${i * 0.3}s` }}>
                      <rect
                        x={p.x - 42}
                        y={p.y - 9}
                        width={24}
                        height={18}
                        rx={1.5}
                        fill="hsl(var(--background))"
                        stroke="hsl(var(--primary))"
                        strokeOpacity="0.7"
                        strokeWidth="1"
                      />
                      {[0, 1, 2].map((k) => (
                        <line
                          key={k}
                          x1={p.x - 42 + (k + 1) * 6}
                          y1={p.y - 9}
                          x2={p.x - 42 + (k + 1) * 6}
                          y2={p.y + 9}
                          stroke="hsl(var(--primary))"
                          strokeOpacity="0.45"
                          strokeWidth="0.7"
                        />
                      ))}
                    </g>
                    {/* Solar panel right */}
                    <g className="cn-panel-sway" style={{ animationDelay: `${i * 0.3 + 1}s` }}>
                      <rect
                        x={p.x + 18}
                        y={p.y - 9}
                        width={24}
                        height={18}
                        rx={1.5}
                        fill="hsl(var(--background))"
                        stroke="hsl(var(--primary))"
                        strokeOpacity="0.7"
                        strokeWidth="1"
                      />
                      {[0, 1, 2].map((k) => (
                        <line
                          key={k}
                          x1={p.x + 18 + (k + 1) * 6}
                          y1={p.y - 9}
                          x2={p.x + 18 + (k + 1) * 6}
                          y2={p.y + 9}
                          stroke="hsl(var(--primary))"
                          strokeOpacity="0.45"
                          strokeWidth="0.7"
                        />
                      ))}
                    </g>
                    {/* Body */}
                    <rect
                      x={p.x - 18}
                      y={p.y - 14}
                      width={36}
                      height={28}
                      rx={4}
                      fill={bodyFill}
                      stroke={bodyStroke}
                      strokeWidth="1.4"
                    />
                    {/* Antenna */}
                    <line
                      x1={p.x}
                      y1={p.y - 14}
                      x2={p.x}
                      y2={p.y - 24}
                      stroke="hsl(var(--primary))"
                      strokeOpacity="0.8"
                      strokeWidth="1"
                    />
                    <circle cx={p.x} cy={p.y - 25} r={1.8} fill="hsl(var(--primary))" />
                  </g>

                  {/* TARGET tag */}
                  {result && isPrimary && (
                    <g>
                      <rect
                        x={p.x - 28}
                        y={p.y - 48}
                        width={56}
                        height={14}
                        rx={2}
                        fill="hsl(var(--background))"
                        stroke="hsl(var(--primary))"
                        strokeOpacity="0.8"
                      />
                      <text
                        x={p.x}
                        y={p.y - 38}
                        textAnchor="middle"
                        fontFamily="ui-monospace, monospace"
                        fontSize="9"
                        letterSpacing="2"
                        fill="hsl(var(--primary))"
                      >
                        ENTRY · TARGET
                      </text>
                    </g>
                  )}

                  {/* Label below */}
                  <text
                    x={p.x}
                    y={p.y + 38}
                    textAnchor="middle"
                    fontFamily="ui-monospace, monospace"
                    fontSize="11"
                    fontWeight={700}
                    fill="hsl(var(--foreground))"
                  >
                    {s.name.length > 22 ? s.name.slice(0, 21) + "…" : s.name}
                  </text>
                  <text
                    x={p.x}
                    y={p.y + 52}
                    textAnchor="middle"
                    fontFamily="ui-monospace, monospace"
                    fontSize="9"
                    letterSpacing="1.5"
                    fill="hsl(var(--muted-foreground))"
                  >
                    {altDisplay.toUpperCase()}
                  </text>

                  {/* Degradation readout (post-attack) */}
                  {result && (
                    <>
                      <text
                        x={p.x}
                        y={p.y + 66}
                        textAnchor="middle"
                        fontFamily="ui-monospace, monospace"
                        fontSize="10"
                        fontWeight={700}
                        fill={deg >= 50 ? "hsl(var(--critical, 0 70% 55%))" : deg >= 20 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                      >
                        DEG {deg.toFixed(0)}%
                      </text>
                      {status && isAffected && (
                        <text
                          x={p.x}
                          y={p.y + 79}
                          textAnchor="middle"
                          fontFamily="ui-monospace, monospace"
                          fontSize="9"
                          fill="hsl(var(--muted-foreground))"
                        >
                          {status.length > 28 ? status.slice(0, 27) + "…" : status}
                        </text>
                      )}
                    </>
                  )}
                </g>
              );
            })}

            {/* Top-left header strip */}
            <g>
              <text
                x={20}
                y={28}
                fontFamily="ui-monospace, monospace"
                fontSize="10"
                letterSpacing="2.5"
                fill="hsl(var(--muted-foreground))"
              >
                {result ? "CASCADE PROPAGATION MAP" : "FLEET TOPOLOGY"}
              </text>
              <text
                x={W - 20}
                y={28}
                textAnchor="end"
                fontFamily="ui-monospace, monospace"
                fontSize="10"
                letterSpacing="2"
                fill="hsl(var(--muted-foreground))"
              >
                {roster.length} ASSETS · {totalStations} GS
              </text>
            </g>
          </svg>
        </div>

        {/* Summary strip */}
        {result && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="panel-2 px-3 py-2">
              <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Primary</div>
              <div className="text-xs font-mono font-semibold truncate">
                {primary?.name ?? "—"}
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                {primaryRes ? `${primaryRes.mission_degradation_percent.toFixed(1)}% degraded` : "—"}
              </div>
            </div>
            <div className="panel-2 px-3 py-2">
              <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Aggregate Degradation</div>
              <div className="text-xs font-mono font-semibold">
                {result.aggregate_degradation_percent.toFixed(1)}%
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">weighted by value</div>
            </div>
            <div className="panel-2 px-3 py-2">
              <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Cascade Affected</div>
              <div className="text-xs font-mono font-semibold">
                {cascadeCount} / {roster.length}
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">propagated via shared infra</div>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

export default ConstellationNetwork;
