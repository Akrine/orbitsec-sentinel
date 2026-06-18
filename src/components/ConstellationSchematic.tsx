import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type OrbitalParams = {
  altitude_km: number;
  orbit_type: string;
  latitude_deg: number;
  longitude_deg: number;
};

export type RosterItem = {
  id: string;
  name: string;
  norad_id?: number;
  orbit_type?: string;
  asset_value_usd?: number;
};

export type SatResult = {
  satellite_name: string;
  mission_degradation_percent: number;
  cascade_applied?: boolean;
  cascade_description?: string;
};

export type ConstellationResult = {
  aggregate_degradation_percent: number;
  satellite_results: SatResult[];
} | null;

const CYAN = "#22d3ee";
const NEUTRAL = "#7c8a99";
const RED = "#b94a4a";

const CX = 400;
const CY = 250;
const EARTH_R = 55;

// altitude_km -> ring radius (px), log-compressed, hard-capped at 210
function altToRingRadius(altKm: number): number {
  const a = Math.max(120, altKm);
  const LO_ALT = 700;
  const HI_ALT = 35786;
  const LO_R = 90;
  const HI_R = 200;
  const t =
    (Math.log10(a) - Math.log10(LO_ALT)) /
    (Math.log10(HI_ALT) - Math.log10(LO_ALT));
  const r = LO_R + (HI_R - LO_R) * t;
  return Math.min(210, Math.max(75, r));
}

function damageColor(deg: number): string {
  if (deg <= 0.5) return NEUTRAL;
  const t = Math.min(1, deg / 100);
  // lerp NEUTRAL -> RED with min 0.3 mix
  const mix = 0.3 + 0.7 * t;
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * mix);
  const n = { r: 0x7c, g: 0x8a, b: 0x99 };
  const r2 = { r: 0xb9, g: 0x4a, b: 0x4a };
  return `rgb(${lerp(n.r, r2.r)}, ${lerp(n.g, r2.g)}, ${lerp(n.b, r2.b)})`;
}

function parseSharedStations(desc?: string): string | null {
  if (!desc) return null;
  const m = desc.match(/(\d+\s*\/\s*\d+)\s*shared/i);
  if (m) return `${m[1]} shared`;
  const m2 = desc.match(/(\d+)\s*shared/i);
  return m2 ? `${m2[1]} shared` : null;
}

type Node = {
  id: string;
  name: string;
  norad_id?: number;
  asset_value_usd: number;
  params: OrbitalParams | null;
  ringR: number;
  angle: number; // radians
  x: number;
  y: number;
  side: "left" | "right";
};

export function ConstellationSchematic({
  roster,
  result,
}: {
  roster: RosterItem[];
  result: ConstellationResult;
}) {
  const [paramsMap, setParamsMap] = useState<Record<string, OrbitalParams>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const entries = await Promise.all(
          roster
            .filter((r) => r.norad_id)
            .map(async (r) => {
              try {
                const res = await apiFetch(
                  `/api/satellite/${r.norad_id}/orbital_params`
                );
                if (!res.ok) return [r.id, null] as const;
                const p = (await res.json()) as OrbitalParams;
                return [r.id, p] as const;
              } catch {
                return [r.id, null] as const;
              }
            })
        );
        if (cancelled) return;
        const map: Record<string, OrbitalParams> = {};
        for (const [id, p] of entries) if (p) map[id] = p;
        setParamsMap(map);
      } catch (e) {
        if (!cancelled) setError("Failed to load orbital data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (roster.length) run();
    else {
      setLoading(false);
      setParamsMap({});
    }
    return () => {
      cancelled = true;
    };
  }, [roster.map((r) => r.norad_id).join(",")]);

  const nodes: Node[] = useMemo(() => {
    return roster.map((r) => {
      const p = paramsMap[r.id] || null;
      const alt = p?.altitude_km ?? (r.orbit_type === "GEO" ? 35786 : 700);
      const ringR = altToRingRadius(alt);
      // angle from longitude; lon=0 -> right (+x). Convert deg to rad.
      const lon = p?.longitude_deg ?? 0;
      const angle = (lon * Math.PI) / 180;
      const ry = ringR * 0.55;
      const x = CX + ringR * Math.cos(angle);
      const y = CY + ry * Math.sin(angle);
      const side: "left" | "right" = x < CX ? "left" : "right";
      return {
        id: r.id,
        name: r.name,
        norad_id: r.norad_id,
        asset_value_usd: r.asset_value_usd ?? 0,
        params: p,
        ringR,
        angle,
        x,
        y,
        side,
      };
    });
  }, [roster, paramsMap]);

  // Result lookups
  const resultByName = useMemo(() => {
    const m: Record<string, SatResult> = {};
    for (const r of result?.satellite_results ?? []) m[r.satellite_name] = r;
    return m;
  }, [result]);

  // Primary target: highest asset value among non-cascaded affected sats; fallback first
  const primaryId = useMemo(() => {
    if (!result) return null;
    const candidates = nodes
      .map((n) => ({ n, r: resultByName[n.name] }))
      .filter((x) => x.r && !x.r.cascade_applied);
    if (!candidates.length) return null;
    candidates.sort(
      (a, b) => (b.n.asset_value_usd || 0) - (a.n.asset_value_usd || 0)
    );
    return candidates[0].n.id;
  }, [nodes, result, resultByName]);

  const primary = nodes.find((n) => n.id === primaryId) || null;

  const cascadeTargets = useMemo(() => {
    if (!result || !primary) return [];
    return nodes
      .map((n) => ({ n, r: resultByName[n.name] }))
      .filter((x) => x.r?.cascade_applied && x.n.id !== primary.id);
  }, [nodes, result, resultByName, primary]);

  const cascadeCount = cascadeTargets.length;
  const assetCount = nodes.length;

  // Sort orbit ring radii uniquely for drawing
  const uniqueRings = useMemo(() => {
    const map = new Map<number, number>();
    for (const n of nodes) map.set(Math.round(n.ringR), n.ringR);
    return Array.from(map.values()).sort((a, b) => a - b);
  }, [nodes]);

  // Stagger label vertical offsets to reduce overlap (sort by y on each side)
  const labelOffsets = useMemo(() => {
    const off: Record<string, { lx: number; ly: number; anchor: "start" | "end" }> = {};
    const leftSorted = [...nodes].filter((n) => n.side === "left").sort((a, b) => a.y - b.y);
    const rightSorted = [...nodes].filter((n) => n.side === "right").sort((a, b) => a.y - b.y);
    const place = (list: Node[], side: "left" | "right") => {
      const baseX = side === "left" ? -14 : 14;
      list.forEach((n, i) => {
        const lx = n.x + baseX;
        // small vertical nudge per node to avoid stack
        const ly = n.y + (i - (list.length - 1) / 2) * 2; // tiny base; we'll mostly rely on positional spread
        off[n.id] = { lx, ly, anchor: side === "left" ? "end" : "start" };
      });
    };
    place(leftSorted, "left");
    place(rightSorted, "right");
    return off;
  }, [nodes]);

  return (
    <div className="panel p-3 flex flex-col" style={{ height: 440 }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-mono tracking-widest text-muted-foreground">
          CONSTELLATION — {assetCount} ASSET{assetCount === 1 ? "" : "S"}
        </div>
        {result && (
          <div className="text-[11px] font-mono text-muted-foreground">
            AGG DEG{" "}
            <span className="text-foreground">
              {result.aggregate_degradation_percent.toFixed(1)}%
            </span>
            {" · "}
            CASCADE <span className="text-foreground">{cascadeCount}</span>
            {primary && (
              <>
                {" · "}TGT <span className="text-foreground">{primary.name}</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="relative flex-1 min-h-0 panel-2 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 grid place-items-center text-[11px] font-mono text-muted-foreground">
            LOADING CONSTELLATION…
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 grid place-items-center text-[11px] font-mono text-destructive">
            {error}
          </div>
        )}
        {!loading && !error && (
          <svg
            viewBox="0 0 800 500"
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid meet"
            style={{ display: "block" }}
          >
            <defs>
              <radialGradient id="earthGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0e1722" />
                <stop offset="100%" stopColor="#060b12" />
              </radialGradient>
              <style>{`
                @keyframes dashflow { to { stroke-dashoffset: -24; } }
                .cascade-arc { animation: dashflow 1.6s linear infinite; }
                @keyframes halo { 0%,100% { opacity: 0.35 } 50% { opacity: 0.9 } }
                .primary-halo { animation: halo 1.8s ease-in-out infinite; }
              `}</style>
            </defs>

            {/* Orbit rings */}
            {uniqueRings.map((rx, i) => (
              <ellipse
                key={i}
                cx={CX}
                cy={CY}
                rx={rx}
                ry={rx * 0.55}
                fill="none"
                stroke={CYAN}
                strokeOpacity={0.22}
                strokeWidth={1}
              />
            ))}

            {/* Earth */}
            <g>
              <circle cx={CX} cy={CY} r={EARTH_R} fill="url(#earthGrad)" stroke={CYAN} strokeOpacity={0.55} strokeWidth={1} />
              {/* graticule arcs */}
              <ellipse cx={CX} cy={CY} rx={EARTH_R} ry={EARTH_R * 0.35} fill="none" stroke={CYAN} strokeOpacity={0.18} />
              <ellipse cx={CX} cy={CY} rx={EARTH_R * 0.65} ry={EARTH_R} fill="none" stroke={CYAN} strokeOpacity={0.18} />
              <ellipse cx={CX} cy={CY} rx={EARTH_R * 0.3} ry={EARTH_R} fill="none" stroke={CYAN} strokeOpacity={0.12} />
              <text x={CX} y={CY + EARTH_R + 12} textAnchor="middle" fontSize={9} fontFamily="ui-monospace, monospace" fill={CYAN} opacity={0.55}>
                EARTH
              </text>
            </g>

            {/* Cascade arcs */}
            {primary &&
              cascadeTargets.map(({ n, r }) => {
                const x1 = primary.x;
                const y1 = primary.y;
                const x2 = n.x;
                const y2 = n.y;
                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2;
                // bend outward away from Earth
                const dx = mx - CX;
                const dy = my - CY;
                const len = Math.max(1, Math.hypot(dx, dy));
                const bend = 40;
                const cxp = mx + (dx / len) * bend;
                const cyp = my + (dy / len) * bend;
                const label = parseSharedStations(r.cascade_description);
                // midpoint of quadratic at t=0.5
                const lx = 0.25 * x1 + 0.5 * cxp + 0.25 * x2;
                const ly = 0.25 * y1 + 0.5 * cyp + 0.25 * y2;
                return (
                  <g key={n.id}>
                    <path
                      d={`M ${x1} ${y1} Q ${cxp} ${cyp} ${x2} ${y2}`}
                      fill="none"
                      stroke={CYAN}
                      strokeOpacity={0.7}
                      strokeWidth={1.2}
                      strokeDasharray="4 4"
                      className="cascade-arc"
                    />
                    {label && (
                      <g>
                        <rect
                          x={lx - 26}
                          y={ly - 7}
                          width={52}
                          height={12}
                          rx={2}
                          fill="#060b12"
                          stroke={CYAN}
                          strokeOpacity={0.45}
                        />
                        <text
                          x={lx}
                          y={ly + 2}
                          textAnchor="middle"
                          fontSize={8}
                          fontFamily="ui-monospace, monospace"
                          fill={CYAN}
                        >
                          {label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

            {/* Satellites */}
            {nodes.map((n) => {
              const res = resultByName[n.name];
              const deg = res?.mission_degradation_percent ?? 0;
              const color = result ? damageColor(deg) : NEUTRAL;
              const isPrimary = primary?.id === n.id;
              const size = 3 + Math.min(3, Math.log10(Math.max(1, n.asset_value_usd / 1e6 + 1)));
              const lbl = labelOffsets[n.id];
              const orbitTag = n.params?.orbit_type || (n.ringR > 150 ? "GEO" : "LEO");
              const leaderX = n.x + (n.side === "left" ? -8 : 8);
              const leaderY = n.y;
              return (
                <g key={n.id}>
                  {isPrimary && (
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={size + 5}
                      fill="none"
                      stroke={CYAN}
                      strokeWidth={1.2}
                      className="primary-halo"
                    />
                  )}
                  <circle cx={n.x} cy={n.y} r={size} fill={color} stroke={isPrimary ? CYAN : "#0b1320"} strokeWidth={1} />
                  {/* leader line */}
                  <line
                    x1={n.x}
                    y1={n.y}
                    x2={lbl.lx}
                    y2={lbl.ly}
                    stroke={CYAN}
                    strokeOpacity={0.35}
                    strokeWidth={0.8}
                  />
                  <text
                    x={lbl.lx + (lbl.anchor === "end" ? -3 : 3)}
                    y={lbl.ly - 1}
                    textAnchor={lbl.anchor}
                    fontSize={9}
                    fontFamily="ui-monospace, monospace"
                    fill="currentColor"
                    className="text-foreground"
                  >
                    {n.name}
                  </text>
                  <text
                    x={lbl.lx + (lbl.anchor === "end" ? -3 : 3)}
                    y={lbl.ly + 9}
                    textAnchor={lbl.anchor}
                    fontSize={7}
                    fontFamily="ui-monospace, monospace"
                    fill={CYAN}
                    opacity={0.7}
                  >
                    {orbitTag}
                    {n.params?.altitude_km
                      ? ` · ${Math.round(n.params.altitude_km)} km`
                      : ""}
                  </text>
                  {/* leader endpoint dot */}
                  <circle cx={leaderX} cy={leaderY} r={0.8} fill={CYAN} opacity={0.4} />
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}

export default ConstellationSchematic;
