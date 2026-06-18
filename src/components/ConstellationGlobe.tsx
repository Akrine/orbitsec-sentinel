import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Line } from "@react-three/drei";
import * as THREE from "three";
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

const EARTH_R = 1;
const CYAN = "#22d3ee";
const NEUTRAL = "#7c8a99";

// altitude_km -> world units above globe surface
function altToRadius(altKm: number): number {
  const a = Math.max(100, altKm);
  // log scale: LEO ~700km -> ~1.18; GEO ~35786 -> ~1.95
  return EARTH_R + 0.25 * Math.log10(1 + a / 200);
}

function latLonAltToVec3(latDeg: number, lonDeg: number, r: number): THREE.Vector3 {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const x = r * Math.cos(lat) * Math.cos(lon);
  const y = r * Math.sin(lat);
  const z = -r * Math.cos(lat) * Math.sin(lon);
  return new THREE.Vector3(x, y, z);
}

function damageColor(deg: number): THREE.Color {
  if (deg <= 0.5) return new THREE.Color(NEUTRAL);
  const t = Math.min(1, deg / 100);
  // mix slate -> muted red
  const base = new THREE.Color(NEUTRAL);
  const red = new THREE.Color("#b94a4a");
  return base.clone().lerp(red, 0.3 + 0.7 * t);
}

function Graticule() {
  const lines = useMemo(() => {
    const segs: THREE.Vector3[][] = [];
    const r = EARTH_R * 1.001;
    // parallels every 15°
    for (let lat = -75; lat <= 75; lat += 15) {
      const pts: THREE.Vector3[] = [];
      for (let lon = -180; lon <= 180; lon += 5) {
        pts.push(latLonAltToVec3(lat, lon, r));
      }
      segs.push(pts);
    }
    // meridians every 15°
    for (let lon = -180; lon < 180; lon += 15) {
      const pts: THREE.Vector3[] = [];
      for (let lat = -90; lat <= 90; lat += 5) {
        pts.push(latLonAltToVec3(lat, lon, r));
      }
      segs.push(pts);
    }
    return segs;
  }, []);

  return (
    <group>
      {lines.map((pts, i) => (
        <Line
          key={i}
          points={pts}
          color={CYAN}
          opacity={0.18}
          transparent
          lineWidth={1}
        />
      ))}
    </group>
  );
}

function Earth() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[EARTH_R * 0.995, 64, 64]} />
        <meshStandardMaterial
          color="#0a1420"
          roughness={1}
          metalness={0}
          emissive="#06121c"
          emissiveIntensity={0.4}
        />
      </mesh>
      {/* subtle outer glow */}
      <mesh>
        <sphereGeometry args={[EARTH_R * 1.01, 48, 48]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
      <Graticule />
    </group>
  );
}

function OrbitRing({ radius, inclinationDeg, raanDeg, color, opacity }: {
  radius: number;
  inclinationDeg: number;
  raanDeg: number;
  color: string;
  opacity: number;
}) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const t = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius));
    }
    return pts;
  }, [radius]);

  const rot: [number, number, number] = useMemo(
    () => [0, (raanDeg * Math.PI) / 180, (inclinationDeg * Math.PI) / 180],
    [inclinationDeg, raanDeg],
  );

  return (
    <group rotation={rot}>
      <Line points={points} color={color} opacity={opacity} transparent lineWidth={1} />
    </group>
  );
}

function SatelliteMarker({ position, color, label, size, isPrimary }: {
  position: THREE.Vector3;
  color: THREE.Color;
  label: string;
  size: number;
  isPrimary: boolean;
}) {
  const haloRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (isPrimary && haloRef.current) {
      const t = (clock.getElapsedTime() % 2.4) / 2.4;
      const s = 1 + t * 1.8;
      haloRef.current.scale.set(s, s, s);
      (haloRef.current.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - t);
    }
  });
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[size, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {isPrimary && (
        <>
          <mesh>
            <ringGeometry args={[size * 1.8, size * 2.0, 32]} />
            <meshBasicMaterial color={CYAN} side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>
          <mesh ref={haloRef}>
            <ringGeometry args={[size * 1.8, size * 2.1, 32]} />
            <meshBasicMaterial color={CYAN} side={THREE.DoubleSide} transparent opacity={0.5} />
          </mesh>
        </>
      )}
      <Html
        center
        distanceFactor={6}
        position={[0, size * 2.5, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 10,
            color: "#cfd6df",
            background: "rgba(8,14,22,0.65)",
            border: "1px solid rgba(34,211,238,0.25)",
            padding: "1px 5px",
            borderRadius: 2,
            whiteSpace: "nowrap",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}

function CascadeArc({ from, to, label }: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  label: string;
}) {
  const curve = useMemo(() => {
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const lift = from.distanceTo(to) * 0.35 + 0.2;
    mid.normalize().multiplyScalar(Math.max(from.length(), to.length()) + lift);
    return new THREE.QuadraticBezierCurve3(from, mid, to);
  }, [from, to]);

  const points = useMemo(() => curve.getPoints(64), [curve]);
  const pulseRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!pulseRef.current) return;
    const t = (clock.getElapsedTime() % 2.6) / 2.6;
    const p = curve.getPoint(t);
    pulseRef.current.position.copy(p);
    const mat = pulseRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.sin(t * Math.PI);
  });

  const midPoint = useMemo(() => curve.getPoint(0.5), [curve]);

  return (
    <group>
      <Line points={points} color={CYAN} opacity={0.55} transparent lineWidth={1.4} />
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.018, 12, 12]} />
        <meshBasicMaterial color={CYAN} transparent />
      </mesh>
      <Html center distanceFactor={7} position={midPoint} style={{ pointerEvents: "none" }}>
        <div
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 9,
            color: "#9aa6b2",
            background: "rgba(8,14,22,0.55)",
            padding: "1px 4px",
            borderRadius: 2,
            whiteSpace: "nowrap",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}

function Scene({ sats, links }: {
  sats: Array<{
    item: RosterItem;
    op: OrbitalParams;
    position: THREE.Vector3;
    color: THREE.Color;
    size: number;
    isPrimary: boolean;
    orbitRadius: number;
    inclination: number;
    raan: number;
  }>;
  links: Array<{ from: THREE.Vector3; to: THREE.Vector3; label: string }>;
}) {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 2, 4]} intensity={0.9} />
      <Earth />
      {sats.map((s) => (
        <OrbitRing
          key={`o-${s.item.id}`}
          radius={s.orbitRadius}
          inclinationDeg={s.inclination}
          raanDeg={s.raan}
          color={s.isPrimary ? CYAN : "#3a4a5c"}
          opacity={s.isPrimary ? 0.55 : 0.32}
        />
      ))}
      {sats.map((s) => (
        <SatelliteMarker
          key={`s-${s.item.id}`}
          position={s.position}
          color={s.color}
          label={s.item.name}
          size={s.size}
          isPrimary={s.isPrimary}
        />
      ))}
      {links.map((l, i) => (
        <CascadeArc key={`l-${i}`} from={l.from} to={l.to} label={l.label} />
      ))}
      <OrbitControls
        enablePan={false}
        enableZoom
        autoRotate
        autoRotateSpeed={0.35}
        minDistance={2.2}
        maxDistance={8}
      />
    </>
  );
}

export function ConstellationGlobe({
  roster,
  result,
}: {
  roster: RosterItem[];
  result: ConstellationResult;
}) {
  const [params, setParams] = useState<Record<number, OrbitalParams>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
      return;
    }
    setLoading(true);
    setError(false);
    Promise.all(
      noradIds.map((id) =>
        apiFetch(`/api/satellite/${id}/orbital_params`).then((r) => {
          if (!r.ok) throw new Error("params");
          return r.json().then((op: OrbitalParams) => ({ id, op }));
        }),
      ),
    )
      .then((arr) => {
        if (cancelled) return;
        const p: Record<number, OrbitalParams> = {};
        for (const { id, op } of arr) p[id] = op;
        setParams(p);
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

  const resByName = useMemo(() => {
    const m: Record<string, SatResult> = {};
    if (result) for (const sr of result.satellite_results) m[sr.satellite_name] = sr;
    return m;
  }, [result]);

  const primaryName = useMemo(() => {
    if (!result) return null;
    const candidates = roster
      .map((r) => ({ r, sr: resByName[r.name] }))
      .filter((x) => x.sr && x.sr.cascade_applied === false);
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => (b.r.asset_value_usd ?? 0) - (a.r.asset_value_usd ?? 0));
    return candidates[0].r.name;
  }, [result, roster, resByName]);

  const maxAsset = useMemo(
    () => Math.max(1, ...roster.map((r) => r.asset_value_usd ?? 0)),
    [roster],
  );

  const sats = useMemo(() => {
    const out = [];
    for (const r of roster) {
      if (typeof r.norad_id !== "number") continue;
      const op = params[r.norad_id];
      if (!op) continue;
      const orbitRadius = altToRadius(op.altitude_km);
      const position = latLonAltToVec3(op.latitude_deg, op.longitude_deg, orbitRadius);
      const sr = resByName[r.name];
      const deg = sr?.mission_degradation_percent ?? 0;
      const color = damageColor(deg);
      const valueFrac = (r.asset_value_usd ?? 0) / maxAsset;
      const size = 0.022 + 0.028 * valueFrac;
      const isGeo = (op.orbit_type ?? "").toUpperCase().includes("GEO");
      const inclination = isGeo ? 0 : Math.max(Math.abs(op.latitude_deg), 25);
      const raan = op.longitude_deg; // visually distributes orbits
      out.push({
        item: r,
        op,
        position,
        color,
        size,
        isPrimary: r.name === primaryName,
        orbitRadius,
        inclination,
        raan,
      });
    }
    return out;
  }, [roster, params, resByName, primaryName, maxAsset]);

  const positionByName = useMemo(() => {
    const m: Record<string, THREE.Vector3> = {};
    for (const s of sats) m[s.item.name] = s.position;
    return m;
  }, [sats]);

  const links = useMemo(() => {
    if (!result || !primaryName) return [];
    const from = positionByName[primaryName];
    if (!from) return [];
    const arr: Array<{ from: THREE.Vector3; to: THREE.Vector3; label: string }> = [];
    for (const sr of result.satellite_results) {
      if (!sr.cascade_applied) continue;
      const to = positionByName[sr.satellite_name];
      if (!to) continue;
      const desc = sr.cascade_description ?? "";
      const m = desc.match(/(\d+)\s*\/\s*(\d+)\s*shared/i);
      const label = m ? `${m[1]}/${m[2]} shared stations` : "cascade";
      arr.push({ from, to, label });
    }
    return arr;
  }, [result, primaryName, positionByName]);

  const affectedCount = links.length;

  return (
    <div className="panel rounded-lg overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border bg-primary/5">
        <span className="h-4 w-1 rounded-sm bg-primary" />
        <span className="text-xs font-mono uppercase tracking-[0.18em] font-semibold text-primary">
          CONSTELLATION — {roster.length} {roster.length === 1 ? "ASSET" : "ASSETS"}
        </span>
      </div>

      <div className="relative" style={{ height: 460 }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-[11px] font-mono tracking-[0.18em] text-muted-foreground">
            INITIALIZING ORBITAL VIEW…
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center text-[11px] font-mono tracking-[0.18em] text-critical">
            CONSTELLATION TELEMETRY UNAVAILABLE
          </div>
        )}
        {!loading && !error && (
          <Canvas
            camera={{ position: [0, 1.2, 3.6], fov: 45 }}
            style={{ background: "transparent" }}
            gl={{ alpha: true, antialias: true }}
          >
            <Scene sats={sats} links={links} />
          </Canvas>
        )}

        {!loading && !error && (
          <div className="absolute top-2 left-2 pointer-events-none">
            <div
              className="font-mono text-[10px] leading-snug px-2 py-1.5 rounded-sm border border-border"
              style={{ background: "rgba(8,14,22,0.7)", color: "#cfd6df", letterSpacing: "0.05em" }}
            >
              <div className="text-muted-foreground">ASSETS</div>
              <div>{sats.length}</div>
              {result && (
                <>
                  <div className="text-muted-foreground mt-1">PRIMARY TARGET</div>
                  <div>{primaryName ?? "—"}</div>
                  <div className="text-muted-foreground mt-1">AGGREGATE DEGRADATION</div>
                  <div>{result.aggregate_degradation_percent.toFixed(1)}%</div>
                  <div className="text-muted-foreground mt-1">CASCADE AFFECTED</div>
                  <div>{affectedCount}</div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConstellationGlobe;
