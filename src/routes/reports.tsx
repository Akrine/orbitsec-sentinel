import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, Panel, StatusBadge } from "@/components/AppShell";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports Library — OrbitSec" },
      { name: "description", content: "Assessment archive across all missions. Filter by risk, attack, actor, and date." },
    ],
  }),
  component: Reports,
});

type Row = {
  id: string;
  sat: string;
  attack: string;
  actor: string;
  path: string;
  date: string;
  deg: number;
  risk: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  cost: string;
};

const ROWS: Row[] = [
  { id: "OSIM-44219", sat: "Sentinel-1A",  attack: "AI-Adaptive GNSS Spoofing", actor: "Nation-State",      path: "RF · ML",                       date: "2026-06-11 14:22 UTC", deg: 84.2, risk: "CRITICAL", cost: "$1.06M" },
  { id: "OSIM-44218", sat: "SBIRS-GEO-5",  attack: "Command Injection",         actor: "Nation-State",      path: "C&DH",                          date: "2026-06-11 12:08 UTC", deg: 71.0, risk: "CRITICAL", cost: "$892K"  },
  { id: "OSIM-44217", sat: "WorldView-3",  attack: "RF Jamming",                actor: "Sophisticated APT", path: "RF · X-band",                   date: "2026-06-11 09:41 UTC", deg: 58.3, risk: "HIGH",     cost: "$634K"  },
  { id: "OSIM-44216", sat: "GOES-18",      attack: "Ground Station Compromise", actor: "Insider Threat",    path: "Network Intrusion",             date: "2026-06-10 23:15 UTC", deg: 47.1, risk: "HIGH",     cost: "$412K"  },
  { id: "OSIM-44215", sat: "WGS-10",       attack: "GPS Spoofing",              actor: "Nation-State",      path: "RF · L1/L2",                    date: "2026-06-10 18:50 UTC", deg: 33.4, risk: "MEDIUM",   cost: "$276K"  },
  { id: "OSIM-44214", sat: "Sentinel-1A",  attack: "RF Jamming",                actor: "Sophisticated APT", path: "RF · X-band",                   date: "2026-06-10 11:02 UTC", deg: 22.1, risk: "LOW",      cost: "$184K"  },
  { id: "OSIM-44213", sat: "SBIRS-GEO-5",  attack: "Ground Station Compromise", actor: "Nation-State",      path: "Terminal Firmware Exploitation", date: "2026-06-09 16:44 UTC", deg: 79.8, risk: "CRITICAL", cost: "$1.24M" },
  { id: "OSIM-44212", sat: "WorldView-3",  attack: "AI-Adaptive GNSS Spoofing", actor: "Nation-State",      path: "RF · ML",                       date: "2026-06-09 11:20 UTC", deg: 66.7, risk: "CRITICAL", cost: "$748K"  },
  { id: "OSIM-44211", sat: "GOES-18",      attack: "Command Injection",         actor: "Sophisticated APT", path: "C&DH",                          date: "2026-06-08 22:15 UTC", deg: 44.2, risk: "HIGH",     cost: "$389K"  },
  { id: "OSIM-44210", sat: "WGS-10",       attack: "RF Jamming",                actor: "Insider Threat",    path: "RF · X-band",                   date: "2026-06-08 14:33 UTC", deg: 38.9, risk: "MEDIUM",   cost: "$312K"  },
  { id: "OSIM-44209", sat: "Sentinel-1A",  attack: "GPS Spoofing",              actor: "Sophisticated APT", path: "RF · L1/L2",                    date: "2026-06-07 09:18 UTC", deg: 29.4, risk: "MEDIUM",   cost: "$241K"  },
  { id: "OSIM-44208", sat: "SBIRS-GEO-5",  attack: "Command Injection",         actor: "Insider Threat",    path: "C&DH",                          date: "2026-06-06 18:45 UTC", deg: 52.6, risk: "HIGH",     cost: "$521K"  },
];

const ATTACKS = ["GPS Spoofing", "RF Jamming", "Command Injection", "Ground Station Compromise", "AI-Adaptive GNSS Spoofing"];
const ACTORS = ["Nation-State", "Sophisticated APT", "Insider Threat"];

function degColor(d: number) {
  if (d > 70) return "text-critical";
  if (d > 50) return "text-high";
  if (d > 30) return "text-medium";
  return "text-low";
}

function StatTile({ label, value, tone }: { label: string; value: string; tone: "default" | "critical" | "high" | "primary" }) {
  const toneClass =
    tone === "critical" ? "text-critical" :
    tone === "high"     ? "text-high" :
    tone === "primary"  ? "text-primary" :
    "text-foreground";
  return (
    <div className="panel p-4">
      <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground mb-1">{label}</div>
      <div className={`font-display text-3xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function Reports() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState("All");
  const [attack, setAttack] = useState("All");
  const [actor, setActor] = useState("All");
  const [range, setRange] = useState("Last 30 days");

  const filtered = useMemo(() => {
    return ROWS.filter((r) => {
      if (risk !== "All" && r.risk !== risk) return false;
      if (attack !== "All" && r.attack !== attack) return false;
      if (actor !== "All" && r.actor !== actor) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!`${r.id} ${r.sat} ${r.attack} ${r.actor} ${r.path}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [query, risk, attack, actor]);

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) filtered.forEach((r) => next.delete(r.id));
    else filtered.forEach((r) => next.add(r.id));
    setSelected(next);
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <AppShell
      title="Reports Library"
      subtitle="ASSESSMENT ARCHIVE · ALL MISSIONS"
      actions={
        <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-primary/50 text-primary text-xs font-semibold hover:bg-primary/10">
          Bulk Export
        </button>
      }
    >
      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatTile label="Total Reports"      value="412"   tone="default" />
        <StatTile label="Critical Risk"      value="89"    tone="critical" />
        <StatTile label="Avg Degradation"    value="62.4%" tone="high" />
        <StatTile label="Reports This Week"  value="18"    tone="primary" />
      </div>

      <Panel>
        {/* Search + Filters */}
        <div className="p-4 flex flex-wrap items-center gap-2 border-b border-border">
          <div className="flex items-center gap-2 panel-2 px-2.5 py-1.5 text-xs flex-1 min-w-[280px] bg-surface-2 border border-border rounded">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search satellites, attack types, reports..."
              className="bg-transparent outline-none flex-1"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={risk} onChange={(e) => setRisk(e.target.value)} className="px-2.5 py-1.5 text-xs font-mono bg-surface-2 border border-border rounded">
              <option>All</option><option>CRITICAL</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option>
            </select>
            <select value={attack} onChange={(e) => setAttack(e.target.value)} className="px-2.5 py-1.5 text-xs font-mono bg-surface-2 border border-border rounded">
              <option>All</option>{ATTACKS.map((a) => <option key={a}>{a}</option>)}
            </select>
            <select value={actor} onChange={(e) => setActor(e.target.value)} className="px-2.5 py-1.5 text-xs font-mono bg-surface-2 border border-border rounded">
              <option>All</option>{ACTORS.map((a) => <option key={a}>{a}</option>)}
            </select>
            <select value={range} onChange={(e) => setRange(e.target.value)} className="px-2.5 py-1.5 text-xs font-mono bg-surface-2 border border-border rounded">
              <option>Last 7 days</option><option>Last 30 days</option><option>Last 90 days</option><option>All Time</option>
            </select>
          </div>
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="px-4 py-2.5 border-b border-border bg-primary/5 flex items-center justify-between text-xs font-mono">
            <span className="text-primary">{selected.size} report{selected.size === 1 ? "" : "s"} selected</span>
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-primary/50 text-primary hover:bg-primary/10">
                Export Selected PDF
              </button>
              <button className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-destructive/50 text-destructive hover:bg-destructive/10">
                Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground border-b border-border">
                <th className="text-left font-medium px-4 py-2.5">
                  <input type="checkbox" className="accent-primary" checked={allSelected} onChange={toggleAll} />
                </th>
                <th className="text-left font-medium px-4 py-2.5">Report ID</th>
                <th className="text-left font-medium px-4 py-2.5">Satellite</th>
                <th className="text-left font-medium px-4 py-2.5">Attack Type</th>
                <th className="text-left font-medium px-4 py-2.5">Threat Actor</th>
                <th className="text-left font-medium px-4 py-2.5">Attack Path</th>
                <th className="text-left font-medium px-4 py-2.5">Date</th>
                <th className="text-right font-medium px-4 py-2.5">Degradation</th>
                <th className="text-left font-medium px-4 py-2.5">Risk</th>
                <th className="text-right font-medium px-4 py-2.5">Op. Cost</th>
                <th className="text-right font-medium px-4 py-2.5">Download</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border/60 hover:bg-surface-2/60 transition-colors">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="accent-primary" checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} />
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-primary">{r.id}</td>
                  <td className="px-4 py-3 font-mono text-[13px]">{r.sat}</td>
                  <td className="px-4 py-3">{r.attack}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.actor}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{r.path}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{r.date}</td>
                  <td className={`px-4 py-3 text-right font-mono ${degColor(r.deg)}`}>{r.deg.toFixed(1)}%</td>
                  <td className="px-4 py-3"><StatusBadge level={r.risk as any} /></td>
                  <td className="px-4 py-3 text-right font-mono">{r.cost}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono rounded border border-primary/40 text-primary hover:bg-primary/10">
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-muted-foreground text-xs font-mono">No reports match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <span>Showing 1–{filtered.length} of 412 reports</span>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border hover:bg-surface-2">
              Previous
            </button>
            <span className="px-2">Page 1 of 35</span>
            <button className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border hover:bg-surface-2">
              Next
            </button>
          </div>
        </div>
      </Panel>
    </AppShell>
  );
}
