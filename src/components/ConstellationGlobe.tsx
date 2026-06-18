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
const EARTH_KM = 6371;
const CYAN = "#22d3ee";
const NEUTRAL = "#7c8a99";

// altitude_km -> world-units distance from Earth center.
// LEO (~700 km) ≈ 1.10, GEO (~35,786 km) ≈ 2.70. Log-compressed so both fit in frame
// while making the LEO-vs-GEO regime visually unmistakable.
function altToRadius(altKm: number): number {
  const a = Math.max(120, altKm);
  const LO_ALT = 700;
  const HI_ALT = 35786;
  const LO_R = 1.1;
  const HI_R = 2.7;
  const t = (Math.log10(a) - Math.log10(LO_ALT)) / (Math.log10(HI_ALT) - Math.log10(LO_ALT));
  const r = LO_R + (HI_R - LO_R) * t;
  return Math.min(3.0, Math.max(1.05, r));
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
  const base = new THREE.Color(NEUTRAL);
  const red = new THREE.Color("#b94a4a");
  return base.clone().lerp(red, 0.3 + 0.7 * t);
}

function Graticule() {
  const lines = useMemo(() => {
    const segs: THREE.Vector3[][] = [];
    const r = EARTH_R * 1.001;
    for (let lat = -75; lat <= 75; lat += 15) {
      const pts: THREE.Vector3[] = [];
      for (let lon = -180; lon <= 180; lon += 5) pts.push(latLonAltToVec3(lat, lon, r));
      segs.push(pts);
    }
    for (let lon = -180; lon < 180; lon += 15) {
      const pts: THREE.Vector3[] = [];
      for (let lat = -90; lat <= 90; lat += 5) pts.push(latLonAltToVec3(lat, lon, r));
      segs.push(pts);
    }
    return segs;
  }, []);

  return (
    <group>
      {lines.map((pts, i) => (
        <Line key={i} points={pts} color={CYAN} opacity={0.18} transparent lineWidth={1} />
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

// Build vertices on the unit sphere for a spherical cap centered at (lat,lon)
// with the given angular half-radius (radians).
function capRimPoints(latDeg: number, lonDeg: number, halfAngle: number, segments = 64, radius = 1.002) {
  const c = latLonAltToVec3(latDeg, lonDeg, 1).normalize();
  const helper = Math.abs(c.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(helper, c).normalize();
  const v = new THREE.Vector3().crossVectors(c, u).normalize();
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const p = new THREE.Vector3()
      .addScaledVector(c, Math.cos(halfAngle))
      .addScaledVector(u, Math.sin(halfAngle) * Math.cos(theta))
      .addScaledVector(v, Math.sin(halfAngle) * Math.sin(theta))
      .normalize()
      .multiplyScalar(radius);
    pts.push(p);
  }
  return { center: c.clone().multiplyScalar(radius), rim: pts };
}

function CoverageFootprint({ latDeg, lonDeg, halfAngle, emphasize }: {
  latDeg: number;
  lonDeg: number;
  halfAngle: number;
  emphasize: boolean;
}) {
  const { capGeom, rim } = useMemo(() => {
    const { center, rim } = capRimPoints(latDeg, lonDeg, halfAngle, 72, 1.003);
    const positions: number[] = [];
    const indices: number[] = [];
    positions.push(center.x, center.y, center.z);
    for (const p of rim) positions.push(p.x, p.y, p.z);
    for (let i = 1; i <= rim.length - 1; i++) indices.push(0, i, i + 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return { capGeom: g, rim };
  }, [latDeg, lonDeg, halfAngle]);

  // Translucent cap (alpha-stacking creates natural brightening where footprints overlap).
  return (
    <group>
      <mesh geometry={capGeom}>
        <meshBasicMaterial
          color={CYAN}
          transparent
          opacity={emphasize ? 0.16 : 0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <Line
        points={rim}
        color={CYAN}
        opacity={emphasize ? 0.55 : 0.32}
        transparent
        lineWidth={1}
      />
    </group>
  );
}

function SatelliteNode({ position, color, size, isPrimary }: {
  position: THREE.Vector3;
  color: THREE.Color;
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
    </group>
  );
}

// Label with leader line + back-side occlusion (hides when satellite is on the far hemisphere).
function SatelliteLabel({ position, label, stagger }: {
  position: THREE.Vector3;
  label: string;
  stagger: number;
}) {
  const labelEndRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const labelEnd = useMemo(() => {
    const dir = position.clone().normalize();
    const r = position.length() + 0.22 + stagger * 0.18;
    return dir.multiplyScalar(r);
  }, [position, stagger]);
  labelEndRef.current = labelEnd;

  const leaderPts = useMemo(() => [position, labelEnd], [position, labelEnd]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const lineGroupRef = useRef<THREE.Group>(null);

  useFrame(({ camera }) => {
    const camDir = camera.position.clone().normalize();
    const satDir = position.clone().normalize();
    const dot = camDir.dot(satDir);
    const visible = dot > 0.08;
    if (wrapRef.current) wrapRef.current.style.opacity = visible ? "1" : "0";
    if (lineGroupRef.current) lineGroupRef.current.visible = visible;
  });

  return (
    <group>
      <group ref={lineGroupRef}>
        <Line points={leaderPts} color={CYAN} opacity={0.45} transparent lineWidth={1} />
      </group>
      <Html center distanceFactor={6} position={labelEnd} style={{ pointerEvents: "none" }}>
        <div
          ref={wrapRef}
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 10,
            color: "#cfd6df",
            background: "rgba(8,14,22,0.78)",
            border: "1px solid rgba(34,211,238,0.32)",
            padding: "1px 5px",
            borderRadius: 2,
            whiteSpace: "nowrap",
            letterSpacing: "0.05em",
            transition: "opacity 120ms linear",
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

type SatViz = {
  item: RosterItem;
  op: OrbitalParams;
  position: THREE.Vector3;
  color: THREE.Color;
  size: number;
  isPrimary: boolean;
  orbitRadius: number;
  inclination: number;
  raan: number;
  halfAngle: number;
  labelStagger: number;
};

function Scene({ sats, links }: {
  sats: SatViz[];
  links: Array<{ from: THREE.Vector3; to: THREE.Vector3; label: string }>;
}) {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 2, 4]} intensity={0.9} />
      <Earth />
      {sats.map((s) => (
        <CoverageFootprint
          key={`f-${s.item.id}`}
          latDeg={s.op.latitude_deg}
          lonDeg={s.op.longitude_deg}
          halfAngle={s.halfAngle}
          emphasize={s.isPrimary}
        />
      ))}
      {sats.map((s) => (
        <OrbitRing
          key={`o-${s.item.id}`}
          radius={s.orbitRadius}
          inclinationDeg={s.inclination}
          raanDeg={s.raan}
          color={s.isPrimary ? CYAN : "#3a4a5c"}
          opacity={s.isPrimary ? 0.55 : 0.28}
        />
      ))}
      {sats.map((s) => (
        <SatelliteNode
          key={`s-${s.item.id}`}
          position={s.position}
          color={s.color}
          size={s.size}
          isPrimary={s.isPrimary}
        />
      ))}
      {sats.map((s) => (
        <SatelliteLabel
          key={`l-${s.item.id}`}
          position={s.position}
          label={s.item.name}
          stagger={s.labelStagger}
        />
      ))}
      {links.map((l, i) => (
        <CascadeArc key={`c-${i}`} from={l.from} to={l.to} label={l.label} />
      ))}
      <OrbitControls
        enablePan={false}
        enableZoom
        autoRotate
        autoRotateSpeed={0.35}
        minDistance={2.2}
        maxDistance={9}
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

  const sats = useMemo<SatViz[]>(() => {
    // Pre-sort by longitude so adjacent labels get different vertical staggers.
    const items = roster
      .filter((r) => typeof r.norad_id === "number" && params[r.norad_id!])
      .map((r) => ({ r, op: params[r.norad_id!] }))
      .sort((a, b) => a.op.longitude_deg - b.op.longitude_deg);

    return items.map(({ r, op }, idx) => {
      const orbitRadius = altToRadius(op.altitude_km);
      const position = latLonAltToVec3(op.latitude_deg, op.longitude_deg, orbitRadius);
      const sr = resByName[r.name];
      const deg = sr?.mission_degradation_percent ?? 0;
      const color = damageColor(deg);
      const valueFrac = (r.asset_value_usd ?? 0) / maxAsset;
      const size = 0.022 + 0.028 * valueFrac;
      const isGeo = (op.orbit_type ?? "").toUpperCase().includes("GEO");
      const inclination = isGeo ? 0 : Math.max(Math.abs(op.latitude_deg), 25);
      const raan = op.longitude_deg;
      // Real Earth-coverage half-angle (radians) from altitude.
      const halfAngle = Math.acos(EARTH_KM / (EARTH_KM + Math.max(120, op.altitude_km)));
      return {
        item: r,
        op,
        position,
        color,
        size,
        isPrimary: r.name === primaryName,
        orbitRadius,
        inclination,
        raan,
        halfAngle,
        labelStagger: idx % 4,
      };
    });
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
            camera={{ position: [0, 1.2, 4.2], fov: 45 }}
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
