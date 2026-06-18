import { useEffect, useMemo, useRef, useState } from "react";
import { geoEquirectangular, geoPath, geoGraticule } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { apiFetch } from "@/lib/api";

type Pt = { lat: number; lon: number };
type GroundTrack = { norad_id: number; points: Pt[] };
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

const LAND_TOPOJSON = "https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json";

let landCache: FeatureCollection | null = null;
async function loadLand(): Promise<FeatureCollection | null> {
  if (landCache) return landCache;
  try {
    const res = await fetch(LAND_TOPOJSON);
    if (!res.ok) throw new Error("topo");
    const topo = await res.json();
    const obj = topo.objects?.land ?? Object.values(topo.objects ?? {})[0];
    const fc = feature(topo, obj as never) as unknown as FeatureCollection;
    landCache = fc;
    return fc;
  } catch {
    return null;
  }
}

function splitAntimeridian(points: Pt[]): Pt[][] {
  if (points.length === 0) return [];
  const segs: Pt[][] = [];
  let cur: Pt[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const p = points[i];
    if (Math.abs(p.lon - prev.lon) > 180) {
      segs.push(cur);
      cur = [p];
    } else cur.push(p);
  }
  segs.push(cur);
  return segs;
}

// red intensity scaling 0..100 → fill color
function damageFill(deg: number): string {
  if (deg <= 0.5) return "oklch(0.32 0.015 240)";
  const t = Math.min(1, deg / 100);
  // mix from neutral slate toward muted red
  const chroma = 0.06 + 0.14 * t;
  const lightness = 0.42 - 0.08 * t;
  return `oklch(${lightness.toFixed(3)} ${chroma.toFixed(3)} 25)`;
}

export function ConstellationMap({
  roster,
  result,
}: {
  roster: RosterItem[];
  result: ConstellationResult;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [land, setLand] = useState<FeatureCollection | null>(null);
  const [params, setParams] = useState<Record<number, OrbitalParams>>({});
  const [tracks, setTracks] = useState<Record<number, GroundTrack>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const MAP_MAX_HEIGHT = 360;

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setContainerWidth(Math.max(320, e.contentRect.width));
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth || 800);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadLand().then((fc) => !cancelled && setLand(fc));
    return () => {
      cancelled = true;
    };
  }, []);

  // satellites with norad ids — stable key for refetch
  const noradIds = useMemo(
    () => roster.map((r) => r.norad_id).filter((n): n is number => typeof n === "number"),
    [roster],
  );
  const noradKey = noradIds.join(",");

  useEffect(() => {
    let cancelled = false;
    if (noradIds.length === 0) {
      setLoading(false);
      setParams({});
      setTracks({});
      return;
    }
    setLoading(true);
    setError(false);
    Promise.all(
      noradIds.map(async (id) => {
        const [op, gt] = await Promise.all([
          apiFetch(`/api/satellite/${id}/orbital_params`).then((r) => {
            if (!r.ok) throw new Error("params");
            return r.json() as Promise<OrbitalParams>;
          }),
          apiFetch(`/api/satellite/${id}/ground_track`)
            .then((r) => (r.ok ? (r.json() as Promise<GroundTrack>) : null))
            .catch(() => null),
        ]);
        return { id, op, gt };
      }),
    )
      .then((arr) => {
        if (cancelled) return;
        const p: Record<number, OrbitalParams> = {};
        const t: Record<number, GroundTrack> = {};
        for (const { id, op, gt } of arr) {
          p[id] = op;
          if (gt) t[id] = gt;
        }
        setParams(p);
        setTracks(t);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noradKey]);

  const renderHeight = Math.min(MAP_MAX_HEIGHT, Math.round(containerWidth / 2));
  const renderWidth = renderHeight * 2;

  const projection = useMemo(
    () =>
      geoEquirectangular()
        .scale(renderWidth / (2 * Math.PI))
        .translate([renderWidth / 2, renderHeight / 2]),
    [renderWidth, renderHeight],
  );
  const pathGen = useMemo(() => geoPath(projection), [projection]);
  const graticulePath = useMemo(
    () => pathGen(geoGraticule().step([30, 30])()) ?? "",
    [pathGen],
  );
  const landPaths = useMemo(() => {
    if (!land) return [] as string[];
    return (land.features as Feature<Geometry>[])
      .map((f) => pathGen(f))
      .filter((d): d is string => !!d);
  }, [land, pathGen]);

  // result lookup by name
  const resByName = useMemo(() => {
    const m: Record<string, SatResult> = {};
    if (result) for (const sr of result.satellite_results) m[sr.satellite_name] = sr;
    return m;
  }, [result]);

  // primary target: cascade_applied=false with highest asset_value
  const primaryName = useMemo(() => {
    if (!result) return null;
    const candidates = roster
      .map((r) => ({ r, sr: resByName[r.name] }))
      .filter((x) => x.sr && x.sr.cascade_applied === false);
    if (candidates.length === 0) return null;
    candidates.sort(
      (a, b) => (b.r.asset_value_usd ?? 0) - (a.r.asset_value_usd ?? 0),
    );
    return candidates[0].r.name;
  }, [result, roster, resByName]);

  // satellite plot list with projected coords
  type Plotted = {
    r: RosterItem;
    op: OrbitalParams;
    x: number;
    y: number;
    sr?: SatResult;
    isPrimary: boolean;
  };
  const plotted: Plotted[] = useMemo(() => {
    const out: Plotted[] = [];
    for (const r of roster) {
      if (typeof r.norad_id !== "number") continue;
      const op = params[r.norad_id];
      if (!op) continue;
      const xy = projection([op.longitude_deg, op.latitude_deg]);
      if (!xy) continue;
      out.push({
        r,
        op,
        x: xy[0],
        y: xy[1],
        sr: resByName[r.name],
        isPrimary: r.name === primaryName,
      });
    }
    return out;
  }, [roster, params, projection, resByName, primaryName]);

  // primary satellite track (lightly)
  const primaryTrackPaths = useMemo(() => {
    if (!primaryName) return [] as string[];
    const r = roster.find((x) => x.name === primaryName);
    if (!r || typeof r.norad_id !== "number") return [];
    const gt = tracks[r.norad_id];
    if (!gt) return [];
    return splitAntimeridian(gt.points)
      .map((seg) => {
        if (seg.length < 2) return "";
        const pts = seg
          .map((p) => projection([p.lon, p.lat]) ?? [NaN, NaN])
          .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
        if (pts.length < 2) return "";
        return "M" + pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join("L");
      })
      .filter(Boolean);
  }, [primaryName, roster, tracks, projection]);

  // cascade links
  type Link = { from: Plotted; to: Plotted; label: string };
  const cascadeLinks: Link[] = useMemo(() => {
    if (!result || !primaryName) return [];
    const source = plotted.find((p) => p.isPrimary);
    if (!source) return [];
    const links: Link[] = [];
    for (const p of plotted) {
      if (p.r.name === primaryName) continue;
      const sr = p.sr;
      if (!sr?.cascade_applied) continue;
      // extract "via N/M shared stations" if present, else short version
      const desc = sr.cascade_description ?? "";
      const m = desc.match(/(\d+)\s*\/\s*(\d+)\s*shared/i);
      const label = m ? `via ${m[1]}/${m[2]} shared stations` : "cascade";
      links.push({ from: source, to: p, label });
    }
    return links;
  }, [result, plotted, primaryName]);

  const affectedCount = cascadeLinks.length;

  return (
    <div className="panel rounded-lg overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border bg-primary/5">
        <span className="h-4 w-1 rounded-sm bg-primary" />
        <span className="text-xs font-mono uppercase tracking-[0.18em] font-semibold text-primary">
          CONSTELLATION — {roster.length} {roster.length === 1 ? "ASSET" : "ASSETS"}
        </span>
        {result && (
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">
            AGGREGATE {result.aggregate_degradation_percent.toFixed(1)}% · CASCADE{" "}
            {affectedCount}/{plotted.length > 0 ? plotted.length - 1 : 0}
          </span>
        )}
      </div>

      <div className="p-3">
        <div ref={containerRef} className="w-full relative flex justify-center">
          {loading && (
            <div
              className="w-full flex items-center justify-center text-[11px] font-mono tracking-[0.18em] text-muted-foreground"
              style={{ height: renderHeight }}
            >
              ACQUIRING CONSTELLATION POSITIONS…
            </div>
          )}
          {error && !loading && (
            <div
              className="w-full flex items-center justify-center text-[11px] font-mono tracking-[0.18em] text-critical"
              style={{ height: renderHeight }}
            >
              CONSTELLATION TELEMETRY UNAVAILABLE
            </div>
          )}
          {!loading && !error && (
            <svg
              width={renderWidth}
              height={renderHeight}
              viewBox={`0 0 ${renderWidth} ${renderHeight}`}
              className="block bg-[oklch(0.18_0.02_240/0.4)] border border-border rounded-md"
            >
              <defs>
                <marker
                  id="cm-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M0,0 L10,5 L0,10 z" className="fill-primary" />
                </marker>
              </defs>

              <path
                d={graticulePath}
                fill="none"
                stroke="currentColor"
                className="text-border"
                strokeOpacity={0.22}
                strokeWidth={0.5}
              />
              {landPaths.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  fill="oklch(0.26 0.018 240)"
                  stroke="oklch(0.40 0.02 240)"
                  strokeOpacity={0.55}
                  strokeWidth={0.5}
                />
              ))}

              {/* primary track (faint) */}
              {primaryTrackPaths.map((d, i) => (
                <path
                  key={`pt${i}`}
                  d={d}
                  fill="none"
                  stroke="currentColor"
                  className="text-primary"
                  strokeWidth={1}
                  strokeOpacity={0.35}
                  strokeDasharray="3 3"
                />
              ))}

              {/* cascade links */}
              {cascadeLinks.map((l, i) => {
                const dx = l.to.x - l.from.x;
                const dy = l.to.y - l.from.y;
                const mx = (l.from.x + l.to.x) / 2;
                const my = (l.from.y + l.to.y) / 2 - 8;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                return (
                  <g key={`lk${i}`}>
                    <line
                      x1={l.from.x}
                      y1={l.from.y}
                      x2={l.to.x}
                      y2={l.to.y}
                      stroke="currentColor"
                      className="text-primary"
                      strokeOpacity={0.55}
                      strokeWidth={1.2}
                      markerEnd="url(#cm-arrow)"
                    />
                    {/* pulse dot traveling along the line */}
                    <circle r={2.2} className="fill-primary">
                      <animateMotion
                        dur="2.6s"
                        repeatCount="indefinite"
                        path={`M${l.from.x},${l.from.y} L${l.to.x},${l.to.y}`}
                      />
                      <animate
                        attributeName="opacity"
                        values="0;1;0"
                        dur="2.6s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <text
                      x={mx}
                      y={my}
                      textAnchor="middle"
                      fontSize="8.5"
                      className="font-mono fill-muted-foreground"
                      style={{ paintOrder: "stroke" }}
                      stroke="oklch(0.16 0.02 240)"
                      strokeWidth="2"
                    >
                      {l.label}
                    </text>
                    <text
                      x={mx}
                      y={my}
                      textAnchor="middle"
                      fontSize="8.5"
                      className="font-mono fill-muted-foreground"
                    >
                      {l.label}
                    </text>
                    <title>{`${l.from.r.name} → ${l.to.r.name} (${len.toFixed(0)}px)`}</title>
                  </g>
                );
              })}

              {/* satellite markers */}
              {plotted.map((p) => {
                const deg = p.sr?.mission_degradation_percent ?? 0;
                const fill = damageFill(deg);
                return (
                  <g key={p.r.id} transform={`translate(${p.x},${p.y})`}>
                    {p.isPrimary && (
                      <>
                        <circle
                          r={11}
                          fill="none"
                          stroke="currentColor"
                          className="text-primary"
                          strokeWidth={1.2}
                          strokeOpacity={0.9}
                        />
                        <circle
                          r={11}
                          fill="none"
                          stroke="currentColor"
                          className="text-primary"
                          strokeWidth={1}
                          strokeOpacity={0.5}
                        >
                          <animate
                            attributeName="r"
                            from="11"
                            to="20"
                            dur="2.4s"
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="opacity"
                            from="0.6"
                            to="0"
                            dur="2.4s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      </>
                    )}
                    <rect
                      x={-4}
                      y={-4}
                      width={8}
                      height={8}
                      fill={fill}
                      stroke="oklch(0.78 0.03 240)"
                      strokeOpacity={0.8}
                      strokeWidth={0.8}
                    />
                    <text
                      x={0}
                      y={-9}
                      textAnchor="middle"
                      fontSize="9"
                      className="font-mono fill-foreground"
                      style={{ paintOrder: "stroke" }}
                      stroke="oklch(0.16 0.02 240)"
                      strokeWidth="2.2"
                    >
                      {p.r.name}
                    </text>
                    <text
                      x={0}
                      y={-9}
                      textAnchor="middle"
                      fontSize="9"
                      className="font-mono fill-foreground"
                    >
                      {p.r.name}
                    </text>
                    <text
                      x={0}
                      y={18}
                      textAnchor="middle"
                      fontSize="8"
                      className="font-mono fill-muted-foreground"
                    >
                      {p.op.orbit_type}
                      {p.sr ? ` · ${deg.toFixed(0)}%` : ""}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {/* readout */}
        {!loading && !error && (
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-1.5">
            <Info label="ASSETS" value={String(roster.length)} />
            <Info
              label="PRIMARY TARGET"
              value={primaryName ?? (result ? "—" : "PRE-RUN")}
            />
            <Info
              label="AGGREGATE DEG"
              value={result ? `${result.aggregate_degradation_percent.toFixed(1)}%` : "—"}
            />
            <Info
              label="CASCADE AFFECTED"
              value={result ? String(affectedCount) : "—"}
            />
          </div>
        )}

        <div className="mt-2 text-[9px] font-mono text-muted-foreground leading-relaxed">
          Satellite positions are live orbital data. Cascade links show cross-asset
          propagation via shared ground infrastructure (station count real; individual
          station locations not depicted).
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-2 px-2 py-1">
      <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="text-[11px] font-mono font-semibold text-foreground truncate">
        {value}
      </div>
    </div>
  );
}
