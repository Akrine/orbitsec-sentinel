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

const W = 900;
const H = 470;
const LEFT = 160;
const RIGHT = 740;
const SINGLE_ROW_Y = 160;
const ROW_TOP_Y = 140;
const ROW_BOT_Y = 310;
const HUB_X = 450;
const HUB_Y = 415;
const LINK_Y = 180; // link entry just under glyph
const HUB_LINK_Y = 391; // top of hub

function layoutPositions(n: number): { x: number; y: number; row: 0 | 1 }[] {
  if (n <= 0) return [];
  if (n === 1) return [{ x: 450, y: SINGLE_ROW_Y, row: 0 }];
  if (n <= 6) {
    const pos = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      pos.push({ x: LEFT + (RIGHT - LEFT) * t, y: SINGLE_ROW_Y, row: 0 as const });
    }
    return pos;
  }
  // two rows
  const topCount = Math.ceil(n / 2);
  const botCount = n - topCount;
  const pos: { x: number; y: number; row: 0 | 1 }[] = [];
  for (let i = 0; i < topCount; i++) {
    const t = topCount === 1 ? 0.5 : i / (topCount - 1);
    pos.push({ x: LEFT + (RIGHT - LEFT) * t, y: ROW_TOP_Y, row: 0 });
  }
  for (let i = 0; i < botCount; i++) {
    const t = botCount === 1 ? 0.5 : i / (botCount - 1);
    pos.push({ x: LEFT + (RIGHT - LEFT) * t, y: ROW_BOT_Y, row: 1 });
  }
  return pos;
}

function worstSubsystem(impacts?: SubsystemImpact): { name: string; val: number } | null {
  if (!impacts) return null;
  const entries = Object.entries(impacts);
  if (!entries.length) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return { name: entries[0][0], val: entries[0][1] };
}

function parseSharedFromDesc(desc?: string): string | null {
  if (!desc) return null;
  const m = desc.match(/(\d+)\s*\/\s*(\d+)/);
  if (!m) return null;
  return `${m[1]}/${m[2]}`;
}

type NodeState = "nominal" | "entry" | "cascade";
const COLORS = {
  bg: "#0a0e14",
  grid: "#1a2430",
  muted: "#5a6a7a",
  dim: "#3a4a5a",
  fg: "#e0e8f0",
  cyan: "#2bd4d4",
  cyanLight: "#4ae0e0",
  green: "#3fae5f",
  amber: "#e0a045",
  amberLight: "#ffb84d",
  red: "#e0555a",
  redLight: "#ff6b6b",
  redPulse: "#ff8888",
  panelStrokeNom: "#2bd4d4",
  panelFillNom: "#14202e",
  bodyStrokeNom: "#4ae0e0",
  bodyFillNom: "#1c2b3a",
  panelStrokeRed: "#e0555a",
  panelFillRed: "#2a1414",
  bodyStrokeRed: "#ff6b6b",
  bodyFillRed: "#3a1a1a",
  panelStrokeAmb: "#e0a045",
  panelFillAmb: "#241c10",
  bodyStrokeAmb: "#ffb84d",
  bodyFillAmb: "#2a2010",
};

function colorsFor(state: NodeState) {
  if (state === "entry")
    return {
      panelFill: COLORS.panelFillRed,
      panelStroke: COLORS.panelStrokeRed,
      bodyFill: COLORS.bodyFillRed,
      bodyStroke: COLORS.bodyStrokeRed,
      windowStroke: COLORS.redLight,
      status: COLORS.red,
    };
  if (state === "cascade")
    return {
      panelFill: COLORS.panelFillAmb,
      panelStroke: COLORS.panelStrokeAmb,
      bodyFill: COLORS.bodyFillAmb,
      bodyStroke: COLORS.bodyStrokeAmb,
      windowStroke: COLORS.amberLight,
      status: COLORS.amber,
    };
  return {
    panelFill: COLORS.panelFillNom,
    panelStroke: COLORS.panelStrokeNom,
    bodyFill: COLORS.bodyFillNom,
    bodyStroke: COLORS.bodyStrokeNom,
    windowStroke: COLORS.cyan,
    status: COLORS.green,
  };
}

function SatelliteGlyph({
  x,
  y,
  state,
  bobDur,
}: {
  x: number;
  y: number;
  state: NodeState;
  bobDur: number;
}) {
  const c = colorsFor(state);
  return (
    <g>
      <animateTransform
        attributeName="transform"
        type="translate"
        values="0 0; 0 -5; 0 0"
        dur={`${bobDur}s`}
        repeatCount="indefinite"
      />
      <g transform={`translate(${x},${y}) scale(0.78)`}>
        {/* Left panel */}
        <rect x={-78} y={-16} width={38} height={32} rx={2} fill={c.panelFill} stroke={c.panelStroke} strokeWidth={1} />
        <line x1={-65} y1={-16} x2={-65} y2={16} stroke={c.panelStroke} strokeOpacity={0.35} strokeWidth={0.8} />
        <line x1={-53} y1={-16} x2={-53} y2={16} stroke={c.panelStroke} strokeOpacity={0.35} strokeWidth={0.8} />
        {/* Right panel */}
        <rect x={40} y={-16} width={38} height={32} rx={2} fill={c.panelFill} stroke={c.panelStroke} strokeWidth={1} />
        <line x1={53} y1={-16} x2={53} y2={16} stroke={c.panelStroke} strokeOpacity={0.35} strokeWidth={0.8} />
        <line x1={65} y1={-16} x2={65} y2={16} stroke={c.panelStroke} strokeOpacity={0.35} strokeWidth={0.8} />
        {/* Connectors */}
        <line x1={-40} y1={0} x2={-18} y2={0} stroke={COLORS.dim} strokeWidth={2} />
        <line x1={18} y1={0} x2={40} y2={0} stroke={COLORS.dim} strokeWidth={2} />
        {/* Body */}
        <rect x={-18} y={-20} width={36} height={40} rx={3} fill={c.bodyFill} stroke={c.bodyStroke} strokeWidth={1.5} />
        <rect x={-12} y={-13} width={24} height={9} rx={1.5} fill={COLORS.bg} stroke={c.windowStroke} strokeWidth={0.8} />
        {/* Antenna */}
        <line x1={0} y1={-20} x2={0} y2={-30} stroke={c.bodyStroke} strokeWidth={1.2} />
        <ellipse cx={0} cy={-33} rx={8} ry={4} fill="none" stroke={c.bodyStroke} strokeWidth={1.2} />
      </g>
    </g>
  );
}

export function ConstellationNetwork({
  roster,
  result,
  sharedStations = 0,
  totalStations = 0,
  loading = false,
  error = null,
}: Props) {
  const positions = useMemo(() => layoutPositions(roster.length), [roster.length]);

  const resByName = useMemo(() => {
    const m = new Map<string, SatelliteResult>();
    (result?.satellite_results ?? []).forEach((r) => m.set(r.satellite_name, r));
    return m;
  }, [result]);

  // Primary target = cascade source / highest asset value
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
      title={result ? "CONSTELLATION — CASCADE PROPAGATION" : "CONSTELLATION — FLEET TOPOLOGY"}
      action={
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          {result ? "POST-ATTACK" : `${roster.length} ASSETS · STANDBY`}
        </span>
      }
    >
      <div className="p-3">
        {/* Info readout above the SVG */}
        {result && (
          <div className="mb-2 grid grid-cols-3 gap-2">
            <div className="panel-2 px-3 py-1.5">
              <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Primary</div>
              <div className="text-xs font-mono font-semibold truncate">{primary?.name ?? "—"}</div>
            </div>
            <div className="panel-2 px-3 py-1.5">
              <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                Aggregate Degradation
              </div>
              <div className="text-xs font-mono font-semibold">
                {result.aggregate_degradation_percent.toFixed(1)}%
              </div>
            </div>
            <div className="panel-2 px-3 py-1.5">
              <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Cascade Affected</div>
              <div className="text-xs font-mono font-semibold">
                {cascadeCount} / {roster.length}
              </div>
            </div>
          </div>
        )}

        <div className="relative w-full rounded overflow-hidden" style={{ height: 440, background: COLORS.bg }}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            width="100%"
            height="100%"
            fontFamily="ui-monospace, monospace"
          >
            <defs>
              <marker id="cn-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <polygon points="0,0 10,5 0,10" fill={COLORS.redLight} />
              </marker>
            </defs>

            {/* Background */}
            <rect width={W} height={H} fill={COLORS.bg} />

            {/* Grid */}
            <g stroke={COLORS.grid} strokeWidth={1} opacity={0.5}>
              <line x1={0} y1={110} x2={900} y2={110} />
              <line x1={0} y1={240} x2={900} y2={240} />
              <line x1={0} y1={370} x2={900} y2={370} />
              <line x1={225} y1={0} x2={225} y2={470} />
              <line x1={450} y1={0} x2={450} y2={470} />
              <line x1={675} y1={0} x2={675} y2={470} />
            </g>


            {/* Hub links */}
            {positions.map((p, i) => {
              const x1 = HUB_X;
              const y1 = HUB_LINK_Y;
              const x2 = p.x;
              const y2 = p.row === 0 ? LINK_Y : p.y + 60;
              return (
                <line
                  key={`link-${i}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={COLORS.cyan}
                  strokeOpacity={0.3}
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
              );
            })}

            {/* Flowing dots along links */}
            {positions.map((p, i) => {
              const x2 = p.x;
              const y2 = p.row === 0 ? LINK_Y : p.y + 60;
              const dur = 3 + ((i * 0.13) % 0.8);
              return (
                <circle key={`flow-${i}`} r={2.5} fill={COLORS.cyan} opacity={0.7}>
                  <animateMotion path={`M ${HUB_X} ${HUB_LINK_Y} L ${x2} ${y2}`} dur={`${dur}s`} repeatCount="indefinite" />
                </circle>
              );
            })}

            {/* HUB */}
            <g>
              <circle cx={HUB_X} cy={HUB_Y} r={26} fill="#0d1620" stroke={COLORS.dim} strokeWidth={1.2} />
              {/* dish glyph */}
              <g stroke="#7a8a9a" strokeWidth={1.4} fill="none">
                <path d={`M ${HUB_X - 11} ${HUB_Y - 2} A 11 11 0 0 1 ${HUB_X + 11} ${HUB_Y - 2}`} />
                <line x1={HUB_X} y1={HUB_Y - 2} x2={HUB_X} y2={HUB_Y + 8} />
                <circle cx={HUB_X} cy={HUB_Y + 10} r={2} fill="#7a8a9a" />
              </g>
              <text x={HUB_X} y={HUB_Y + 40} textAnchor="middle" fontSize={12} letterSpacing={2} fill={COLORS.muted}>
                SHARED GROUND SEGMENT
              </text>
              <text x={HUB_X} y={HUB_Y + 54} textAnchor="middle" fontSize={11} letterSpacing={1.5} fill={COLORS.dim}>
                {sharedStations}/{totalStations} STATIONS SHARED
              </text>
            </g>

            {/* Cascade arcs */}
            {result && primaryPos &&
              roster.map((s, i) => {
                if (i === primaryIdx) return null;
                const r = resByName.get(s.name);
                if (!r || !r.cascade_applied) return null;
                const p = positions[i];
                const x1 = primaryPos.x;
                const y1 = primaryPos.y;
                const x2 = p.x;
                const y2 = p.y;
                const mx = (x1 + x2) / 2;
                const my = Math.min(y1, y2) - 55;
                const path = `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
                const sharedLbl =
                  parseSharedFromDesc(r.cascade_description) ?? `${sharedStations}/${totalStations}`;
                return (
                  <g key={`arc-${i}`}>
                    <path
                      d={path}
                      fill="none"
                      stroke={COLORS.redLight}
                      strokeWidth={2}
                      strokeDasharray="6 5"
                      markerEnd="url(#cn-arrow)"
                      opacity={0.9}
                    />
                    <circle r={3.5} fill={COLORS.redPulse}>
                      <animateMotion path={path} dur="1.6s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0;1;1;0" dur="1.6s" repeatCount="indefinite" />
                    </circle>
                    <text
                      x={mx}
                      y={my + 4}
                      textAnchor="middle"
                      fontSize={10}
                      fill={COLORS.redPulse}
                      letterSpacing={0.5}
                    >
                      via {sharedLbl} shared stations
                    </text>
                  </g>
                );
              })}

            {/* Satellites */}
            {roster.map((s, i) => {
              const p = positions[i];
              const r = resByName.get(s.name);
              const deg = r?.mission_degradation_percent ?? 0;
              const isPrimary = result ? i === primaryIdx : false;
              const isAffected = !!r?.cascade_applied;
              const state: NodeState = isPrimary ? "entry" : isAffected ? "cascade" : "nominal";
              const c = colorsFor(state);
              const worst = worstSubsystem(r?.subsystem_impacts);
              const bobDur = 5 + ((i * 0.37) % 1.5);

              // Label Ys: relative to glyph row
              const nameY = p.y + 78;
              const subY = p.y + 95;
              const statusY = p.y + 111;

              const altDisplay =
                s.altitude_km != null
                  ? `${(s.orbit_type ?? "ORB").toUpperCase()} · ${Math.round(s.altitude_km)} km`
                  : (s.orbit_type ?? "—").toUpperCase();

              let statusText = "";
              if (state === "nominal") statusText = result ? `NOMINAL · ${deg.toFixed(0)}%` : "NOMINAL · STANDBY";
              else if (state === "entry") statusText = `ENTRY · DEG ${deg.toFixed(0)}%`;
              else
                statusText = worst
                  ? `${worst.name.toUpperCase()} ${Math.round(worst.val)}% · DEG ${deg.toFixed(0)}%`
                  : `CASCADE · DEG ${deg.toFixed(0)}%`;

              return (
                <g key={s.id}>
                  {/* Primary halo */}
                  {isPrimary && (
                    <>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={60}
                        fill="none"
                        stroke={COLORS.cyanLight}
                        strokeDasharray="3 4"
                        strokeWidth={1}
                      >
                        <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2s" repeatCount="indefinite" />
                      </circle>
                      <text
                        x={p.x}
                        y={p.y - 73}
                        textAnchor="middle"
                        fontSize={10}
                        letterSpacing={2}
                        fill={COLORS.cyanLight}
                      >
                        ENTRY POINT
                      </text>
                    </>
                  )}

                  <SatelliteGlyph x={p.x} y={p.y} state={state} bobDur={bobDur} />

                  {/* Labels */}
                  <text
                    x={p.x}
                    y={nameY}
                    textAnchor="middle"
                    fontSize={14}
                    fontWeight={700}
                    fill={COLORS.fg}
                  >
                    {s.name.length > 22 ? s.name.slice(0, 21) + "…" : s.name}
                  </text>
                  <text x={p.x} y={subY} textAnchor="middle" fontSize={11} fill={COLORS.muted}>
                    {altDisplay}
                  </text>
                  <text x={p.x} y={statusY} textAnchor="middle" fontSize={11} fill={c.status} letterSpacing={0.5}>
                    {statusText}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </Panel>
  );
}

export default ConstellationNetwork;
