import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Panel, StatusBadge } from "@/components/AppShell";
import { Search, Filter, Download, FileDown } from "lucide-react";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports Library — OrbitSec" },
      { name: "description", content: "Archived satellite cybersecurity assessments. Filter, search, and export PDF." },
    ],
  }),
  component: Reports,
});

const SATS = ["Sentinel-1A", "SBIRS-GEO-5", "WorldView-3", "GOES-18", "WGS-10"];
const ATTACKS = ["AI-Adaptive GNSS Spoofing", "RF Jamming", "Command Injection", "Ground Station Compromise", "GPS Spoofing"];
const ACTORS = ["Nation-State", "Sophisticated APT", "Insider Threat"];

const ROWS = Array.from({ length: 18 }).map((_, i) => {
  const deg = +(95 - (i * 4.2 + (i % 3) * 2)).toFixed(1);
  const risk = deg > 70 ? "CRITICAL" : deg > 50 ? "HIGH" : deg > 30 ? "MEDIUM" : "LOW";
  const d = new Date(Date.UTC(2026, 5, 11 - i, 14 - (i % 8), (i * 7) % 60));
  return {
    id: `OSIM-${44219 - i}`,
    sat: SATS[i % SATS.length],
    attack: ATTACKS[i % ATTACKS.length],
    actor: ACTORS[i % ACTORS.length],
    date: d.toISOString().replace("T", " ").slice(0, 16) + "Z",
    deg, risk,
  };
});

function Reports() {
  return (
    <AppShell title="Reports Library" subtitle={`${ROWS.length} ASSESSMENTS · 412 TOTAL IN VAULT`} actions={
      <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90">
        <FileDown className="h-3.5 w-3.5" /> Bulk Export
      </button>
    }>
      <Panel>
        <div className="p-4 flex flex-wrap items-center gap-2 border-b border-border">
          <div className="flex items-center gap-2 panel-2 px-2.5 py-1.5 text-xs flex-1 min-w-[240px]">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input placeholder="Search report ID, satellite, attack…" className="bg-transparent outline-none flex-1" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select className="panel-2 px-2.5 py-1.5 text-xs font-mono bg-surface-2 border border-border rounded">
              <option>All Risk</option><option>CRITICAL</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option>
            </select>
            <select className="panel-2 px-2.5 py-1.5 text-xs font-mono bg-surface-2 border border-border rounded">
              <option>All Attacks</option>{ATTACKS.map((a) => <option key={a}>{a}</option>)}
            </select>
            <select className="panel-2 px-2.5 py-1.5 text-xs font-mono bg-surface-2 border border-border rounded">
              <option>Last 30 days</option><option>Last 7 days</option><option>Last 24 hours</option><option>Custom range</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
                <th className="text-left font-medium px-4 py-2.5"><input type="checkbox" className="accent-primary" /></th>
                <th className="text-left font-medium px-4 py-2.5">Report ID</th>
                <th className="text-left font-medium px-4 py-2.5">Satellite</th>
                <th className="text-left font-medium px-4 py-2.5">Attack Vector</th>
                <th className="text-left font-medium px-4 py-2.5">Threat Actor</th>
                <th className="text-left font-medium px-4 py-2.5">Date · UTC</th>
                <th className="text-right font-medium px-4 py-2.5">Degradation</th>
                <th className="text-left font-medium px-4 py-2.5">Risk</th>
                <th className="text-right font-medium px-4 py-2.5">PDF</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-surface-2/50">
                  <td className="px-4 py-3"><input type="checkbox" className="accent-primary" /></td>
                  <td className="px-4 py-3 font-mono text-[12px] text-primary">{r.id}</td>
                  <td className="px-4 py-3 font-mono text-[13px]">{r.sat}</td>
                  <td className="px-4 py-3">{r.attack}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.actor}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{r.date}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    <span className={r.deg >= 70 ? "text-critical" : r.deg >= 50 ? "text-high" : r.deg >= 30 ? "text-medium" : "text-low"}>{r.deg}%</span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge level={r.risk as any} /></td>
                  <td className="px-4 py-3 text-right">
                    <button className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/40">
                      <Download className="h-3 w-3" /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <span>Showing 1–{ROWS.length} of 412</span>
          <div className="flex gap-1">
            <button className="px-2 py-1 rounded border border-border hover:bg-surface-2">‹ Prev</button>
            <button className="px-2 py-1 rounded border border-primary bg-primary/10 text-primary">1</button>
            <button className="px-2 py-1 rounded border border-border hover:bg-surface-2">2</button>
            <button className="px-2 py-1 rounded border border-border hover:bg-surface-2">3</button>
            <button className="px-2 py-1 rounded border border-border hover:bg-surface-2">Next ›</button>
          </div>
        </div>
      </Panel>
    </AppShell>
  );
}
