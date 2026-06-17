import { useEffect, useMemo, useRef, useState } from "react";
import { geoEquirectangular, geoPath, geoGraticule } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { apiFetch } from "@/lib/api";

type Pt = { lat: number; lon: number };
type GroundTrack = { norad_id: number; orbital_period_min: number; points: Pt[] };
type OrbitalParams = {
  sun_angle_deg: number;
  in_eclipse: boolean;
  altitude_km: number;
  inclination_deg: number;
  orbit_type: string;
  latitude_deg: number;
  longitude_deg: number;
};

const LAND_TOPOJSON = "https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json";
const LAND_GEOJSON_FALLBACK =
  "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

let landCache: FeatureCollection | null = null;
async function loadLand(): Promise<FeatureCollection> {
  if (landCache) return landCache;
  try {
    const res = await fetch(LAND_TOPOJSON);
    if (!res.ok) throw new Error("topojson http");
    const topo = await res.json();
    const obj = topo.objects?.land ?? Object.values(topo.objects ?? {})[0];
    const fc = feature(topo, obj as never) as unknown as FeatureCollection;
    landCache = fc;
    return fc;
  } catch {
    const res = await fetch(LAND_GEOJSON_FALLBACK);
    const fc = (await res.json()) as FeatureCollection;
    landCache = fc;
    return fc;
  }
}

function subsolarPoint(now: Date): { lat: number; lon: number } {
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  const lon = -(utcHours - 12) * 15;
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const doy = Math.floor((now.getTime() - start) / 86400000);
  const decl = 23.44 * Math.sin(((2 * Math.PI) / 365) * (doy - 81));
  return { lat: decl, lon };
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
    } else {
      cur.push(p);
    }
  }
  segs.push(cur);
  return segs;
}

export function OrbitalTrack({
  noradId,
  satelliteName,
}: {
  noradId: number;
  satelliteName: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [land, setLand] = useState<FeatureCollection | null>(null);
  const [track, setTrack] = useState<GroundTrack | null>(null);
  const [params, setParams] = useState<OrbitalParams | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  const MAP_MAX_HEIGHT = 300;

  // resize observer
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

  // clock for terminator
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  // land once
  useEffect(() => {
    let cancelled = false;
    loadLand()
      .then((fc) => !cancelled && setLand(fc))
      .catch(() => !cancelled && setLand(null));
    return () => {
      cancelled = true;
    };
  }, []);

  // satellite data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setTrack(null);
    setParams(null);
    Promise.all([
      apiFetch(`/api/satellite/${noradId}/ground_track`).then((r) => {
        if (!r.ok) throw new Error("track");
        return r.json() as Promise<GroundTrack>;
      }),
      apiFetch(`/api/satellite/${noradId}/orbital_params`).then((r) => {
        if (!r.ok) throw new Error("params");
        return r.json() as Promise<OrbitalParams>;
      }),
    ])
      .then(([gt, op]) => {
        if (cancelled) return;
        setTrack(gt);
        setParams(op);
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
  }, [noradId]);

  const renderHeight = Math.min(MAP_MAX_HEIGHT, Math.round(containerWidth / 2));
  const renderWidth = renderHeight * 2;

  const projection = useMemo(() => {
    return geoEquirectangular()
      .scale(renderWidth / (2 * Math.PI))
      .translate([renderWidth / 2, renderHeight / 2]);
  }, [renderWidth, renderHeight]);

  const pathGen = useMemo(() => geoPath(projection), [projection]);

  const graticulePath = useMemo(() => {
    const g = geoGraticule().step([30, 30]);
    return pathGen(g()) ?? "";
  }, [pathGen]);

  const landPaths = useMemo(() => {
    if (!land) return [] as string[];
    return (land.features as Feature<Geometry>[])
      .map((f) => pathGen(f))
      .filter((d): d is string => !!d);
  }, [land, pathGen]);

  const trackPaths = useMemo(() => {
    if (!track) return [] as string[];
    const segs = splitAntimeridian(track.points);
    return segs
      .map((seg) => {
        if (seg.length < 2) return "";
        const pts = seg.map((p) => projection([p.lon, p.lat]) ?? [NaN, NaN]);
        const valid = pts.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
        if (valid.length < 2) return "";
        return (
          "M" +
          valid.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join("L")
        );
      })
      .filter(Boolean);
  }, [track, projection]);

  const currentXY = useMemo(() => {
    if (!track || track.points.length === 0) return null;
    const p = track.points[0];
    const xy = projection([p.lon, p.lat]);
    return xy ? { x: xy[0], y: xy[1], lat: p.lat, lon: p.lon } : null;
  }, [track, projection]);

  // day/night terminator polygon as filled circles of "night" – approximate as a path of points 180° from subsolar
  const nightPath = useMemo(() => {
    if (!now) return "";
    const sub = subsolarPoint(now);
    // For each longitude, the terminator latitude is where sun is at horizon:
    // tan(lat) = -cos(lon - subLon) / tan(decl)
    const decl = (sub.lat * Math.PI) / 180;
    const pts: [number, number][] = [];
    const step = 2;
    for (let lon = -180; lon <= 180; lon += step) {
      const h = ((lon - sub.lon) * Math.PI) / 180;
      const latRad = Math.atan(-Math.cos(h) / Math.tan(decl || 1e-6));
      const lat = (latRad * 180) / Math.PI;
      pts.push([lon, lat]);
    }
    // night hemisphere = side opposite the sun. If decl > 0 (N summer), night pole = south, so close the polygon down.
    const closeLat = decl >= 0 ? -90 : 90;
    const ring: [number, number][] = [...pts, [180, closeLat], [-180, closeLat], pts[0]];
    const projected = ring
      .map(([lon, lat]) => projection([lon, lat]) ?? [NaN, NaN])
      .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
    if (projected.length < 3) return "";
    return (
      "M" +
      projected.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join("L") +
      "Z"
    );
  }, [now, projection]);

  return (
    <div className="panel rounded-lg overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border bg-primary/5">
        <span className="h-4 w-1 rounded-sm bg-primary" />
        <span className="text-xs font-mono uppercase tracking-[0.18em] font-semibold text-primary">
          ORBITAL GROUND TRACK — {satelliteName}
        </span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">
          NORAD {noradId}
        </span>
      </div>

      <div className="p-3">
        <div ref={containerRef} className="w-full relative flex justify-center">
          {loading && (
            <div
              className="w-full flex items-center justify-center text-[11px] font-mono tracking-[0.18em] text-muted-foreground"
              style={{ height: renderHeight }}
            >
              ACQUIRING ORBITAL TRACK…
            </div>
          )}
          {error && !loading && (
            <div
              className="w-full flex items-center justify-center text-[11px] font-mono tracking-[0.18em] text-critical"
              style={{ height: renderHeight }}
            >
              ORBITAL DATA UNAVAILABLE
            </div>
          )}
          {!loading && !error && (
            <svg
              width={renderWidth}
              height={renderHeight}
              viewBox={`0 0 ${renderWidth} ${renderHeight}`}
              className="block bg-[oklch(0.18_0.02_240/0.4)] border border-border rounded-md"
            >
              {/* graticule */}
              <path d={graticulePath} fill="none" stroke="currentColor" className="text-border" strokeOpacity={0.25} strokeWidth={0.5} />
              {/* land */}
              {landPaths.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  fill="oklch(0.28 0.02 240)"
                  stroke="oklch(0.42 0.02 240)"
                  strokeOpacity={0.6}
                  strokeWidth={0.5}
                />
              ))}
              {/* night terminator */}
              {nightPath && (
                <path d={nightPath} fill="oklch(0.08 0.02 240)" fillOpacity={0.35} stroke="none" />
              )}
              {/* track */}
              {trackPaths.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke="currentColor"
                  className="text-primary"
                  strokeWidth={1.5}
                  strokeOpacity={0.9}
                />
              ))}
              {/* current marker */}
              {currentXY && (
                <g transform={`translate(${currentXY.x},${currentXY.y})`}>
                  <circle r={4} className="fill-primary" />
                  <circle r={4} className="fill-none stroke-primary" strokeWidth={1.5}>
                    <animate attributeName="r" from="4" to="14" dur="2s" repeatCount="indefinite" />
                    <animate
                      attributeName="opacity"
                      from="0.9"
                      to="0"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              )}
            </svg>
          )}
        </div>

        {/* info overlay */}
        {!loading && !error && params && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-6 gap-2">
            <Info label="ORBIT TYPE" value={params.orbit_type} />
            <Info label="ALTITUDE" value={`${params.altitude_km.toFixed(1)} km`} />
            <Info label="INCLINATION" value={`${params.inclination_deg.toFixed(2)}°`} />
            <Info
              label="PERIOD"
              value={track ? `${track.orbital_period_min.toFixed(1)} min` : "—"}
            />
            <Info
              label="LAT / LON"
              value={`${params.latitude_deg.toFixed(2)}, ${params.longitude_deg.toFixed(2)}`}
            />
            <div className="panel-2 px-2.5 py-1.5 flex flex-col justify-center">
              <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
                STATUS
              </div>
              <div
                className={`text-[11px] font-mono font-semibold ${
                  params.in_eclipse ? "text-warning" : "text-success"
                }`}
              >
                {params.in_eclipse ? "IN ECLIPSE" : "SUNLIT"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-2 px-2.5 py-1.5">
      <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="text-[11px] font-mono font-semibold text-foreground truncate">{value}</div>
    </div>
  );
}
