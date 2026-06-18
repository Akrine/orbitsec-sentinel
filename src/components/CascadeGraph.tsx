import { useMemo } from "react";

type Subsystem = "ADCS" | "EPS" | "Comms" | "Thermal" | "Payload" | "GroundSegment";

const NODES: { id: Subsystem; x: number; y: number }[] = [
  { id: "GroundSegment", x: 70, y: 60 },
  { id: "Comms", x: 250, y: 60 },
  { id: "ADCS", x: 250, y: 200 },
  { id: "EPS", x: 450, y: 130 },
  { id: "Thermal", x: 450, y: 270 },
  { id: "Payload", x: 660, y: 200 },
];

const EDGES: [Subsystem, Subsystem][] = [
  ["ADCS", "EPS"],
  ["ADCS", "Comms"],
  ["ADCS", "Thermal"],
  ["ADCS", "Payload"],
  ["EPS", "ADCS"],
  ["EPS", "Comms"],
  ["EPS", "Thermal"],
  ["EPS", "Payload"],
  ["Comms", "ADCS"],
  ["Comms", "Payload"],
  ["Thermal", "EPS"],
  ["Thermal", "Payload"],
  ["GroundSegment", "Comms"],
  ["GroundSegment", "ADCS"],
];

const ATTACK_SOURCE_MAP: Record<string, Subsystem> = {
  gps_spoofing: "ADCS",
  ai_adaptive_spoofing: "ADCS",
  rf_jamming: "Comms",
  ground_station: "GroundSegment",
  command_injection: "ADCS",
};

const NODE_W = 124;
const NODE_H = 46;

function reachable(source: Subsystem, impacts: Record<string, number>): Set<Subsystem> {
  const visited = new Set<Subsystem>([source]);
  const stack: Subsystem[] = [source];
  while (stack.length) {
    const n = stack.pop()!;
    for (const [a, b] of EDGES) {
      if (a === n && (impacts[b] ?? 0) >= 2 && !visited.has(b)) {
        visited.add(b);
        stack.push(b);
      }
    }
  }
  return visited;
}

export function CascadeGraph({ result }: { result: any }) {
  const impacts: Record<string, number> = result?.subsystem_impacts ?? {};

  const source: Subsystem = useMemo(() => {
    const mapped = ATTACK_SOURCE_MAP[String(result?.attack_type ?? "")];
    if (mapped) return mapped;
    let best: Subsystem = "ADCS";
    let bestV = -1;
    for (const n of NODES) {
      const v = Number(impacts[n.id] ?? 0);
      if (v > bestV) { bestV = v; best = n.id; }
    }
    return best;
  }, [result?.attack_type, impacts]);

  const reached = useMemo(() => reachable(source, impacts), [source, impacts]);
  const nodeMap = new Map(NODES.map((n) => [n.id, n]));

  // edge endpoint on node border (rect edge intersection)
  function endpoint(from: { x: number; y: number }, to: { x: number; y: number }) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (dx === 0 && dy === 0) return to;
    const hw = NODE_W / 2;
    const hh = NODE_H / 2;
    const sx = dx === 0 ? Infinity : hw / Math.abs(dx);
    const sy = dy === 0 ? Infinity : hh / Math.abs(dy);
    const s = Math.min(sx, sy);
    return { x: to.x - dx * s, y: to.y - dy * s };
  }

  function nodeFill(id: Subsystem) {
    const v = Math.max(0, Math.min(100, Number(impacts[id] ?? 0)));
    if (v <= 0.5) return "hsl(220 15% 12%)";
    const alpha = 0.12 + (v / 100) * 0.68;
    return `oklch(0.5 0.18 22 / ${alpha.toFixed(3)})`;
  }
  function nodeStroke(id: Subsystem) {
    const v = Math.max(0, Math.min(100, Number(impacts[id] ?? 0)));
    if (v <= 0.5) return "hsl(220 12% 28%)";
    const alpha = 0.45 + (v / 100) * 0.5;
    return `oklch(0.62 0.2 22 / ${alpha.toFixed(3)})`;
  }

  if (!result?.subsystem_impacts) return null;

  const VB_W = 760;
  const VB_H = 340;

  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground mb-2">
        Subsystem Cascade Propagation
      </div>
      <div className="panel-2 p-3">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-3">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm border" style={{ borderColor: "hsl(190 80% 55%)", background: "transparent" }} />
            <span>Entry Point</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Damage Intensity</span>
            <span
              className="inline-block w-20 h-2 rounded-sm border border-border"
              style={{
                background:
                  "linear-gradient(to right, hsl(220 15% 12%), oklch(0.5 0.18 22 / 0.4), oklch(0.5 0.18 22 / 0.8))",
              }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-6 h-px" style={{ background: "hsl(190 70% 55%)" }} />
            <span>Active Path</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-6 h-px" style={{ background: "hsl(220 10% 40%)", opacity: 0.5 }} />
            <span>Dependency (inactive)</span>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="w-full h-auto"
            style={{ maxHeight: 360 }}
          >
            <defs>
              <marker id="arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="hsl(190 70% 55%)" opacity="0.9" />
              </marker>
              <marker id="arrow-inactive" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="hsl(220 10% 45%)" opacity="0.45" />
              </marker>
            </defs>

            {/* Edges */}
            {EDGES.map(([a, b], i) => {
              const fromN = nodeMap.get(a)!;
              const toN = nodeMap.get(b)!;
              const active =
                reached.has(a) && reached.has(b) && (Number(impacts[b] ?? 0) >= 2);
              const p1 = endpoint(toN, fromN);
              const p2 = endpoint(fromN, toN);
              return (
                <line
                  key={i}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={active ? "hsl(190 70% 55%)" : "hsl(220 10% 45%)"}
                  strokeWidth={active ? 1.6 : 0.9}
                  opacity={active ? 0.9 : 0.28}
                  markerEnd={active ? "url(#arrow-active)" : "url(#arrow-inactive)"}
                />
              );
            })}

            {/* Nodes */}
            {NODES.map((n) => {
              const isSource = n.id === source;
              const impact = Number(impacts[n.id] ?? 0);
              return (
                <g key={n.id}>
                  <rect
                    x={n.x - NODE_W / 2}
                    y={n.y - NODE_H / 2}
                    width={NODE_W}
                    height={NODE_H}
                    rx={6}
                    ry={6}
                    fill={nodeFill(n.id)}
                    stroke={isSource ? "hsl(190 80% 55%)" : nodeStroke(n.id)}
                    strokeWidth={isSource ? 1.8 : 1}
                  />
                  <text
                    x={n.x}
                    y={n.y - 4}
                    textAnchor="middle"
                    fontSize="11"
                    fontFamily="ui-monospace, monospace"
                    fill="hsl(220 15% 92%)"
                    style={{ letterSpacing: "0.05em" }}
                  >
                    {n.id.toUpperCase()}
                  </text>
                  <text
                    x={n.x}
                    y={n.y + 12}
                    textAnchor="middle"
                    fontSize="10"
                    fontFamily="ui-monospace, monospace"
                    fill="hsl(220 10% 70%)"
                  >
                    {impact.toFixed(1)}%
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="mt-2 text-[10px] font-mono text-muted-foreground">
          Edges show the engine's subsystem dependency topology; highlighted paths indicate propagation observed in this run.
        </div>
      </div>
    </div>
  );
}

export default CascadeGraph;
