import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell, Panel, StatusBadge } from "@/components/AppShell";
import { apiFetch, pluralize } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports Library — OrbitSec" },
      { name: "description", content: "Assessment archive across all missions. Filter by risk, attack, actor, and date." },
    ],
  }),
  component: Reports,
});

type Report = {
  id: string;
  simulation_id?: string;
  target_satellite?: string;
  attack_type?: string;
  mission_degradation_percent?: number;
  recovery_time_hours?: number;
  success?: boolean;
  created_at?: string;
  attack_parameters?: Record<string, any> | null;
  impact_summary?: Record<string, any> | null;
};

type Risk = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

const PAGE_SIZE = 20;

function degColor(d: number) {
  if (d > 70) return "text-critical";
  if (d > 50) return "text-high";
  if (d > 30) return "text-medium";
  return "text-low";
}

function riskOf(d: number): Risk {
  if (d > 70) return "CRITICAL";
  if (d > 50) return "HIGH";
  if (d > 30) return "MEDIUM";
  return "LOW";
}

function titleCase(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAttack(raw: string | undefined) {
  if (!raw) return "—";
  if (raw.includes(":")) {
    const [prefix, rest] = raw.split(":", 2);
    return `${titleCase(prefix)}: ${titleCase(rest || "")}`;
  }
  return titleCase(raw);
}

function formatDate(iso: string | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi} UTC`;
}

function formatCost(impact: Record<string, any> | null | undefined): string {
  if (!impact) return "—";
  const raw = impact.estimated_cost_usd ?? impact.total_estimated_cost_usd ?? impact.total_cost_usd;
  if (raw == null || Number.isNaN(Number(raw))) return "—";
  const n = Number(raw);
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

function recordTypeOf(r: Report): string {
  const t = r.attack_parameters?.record_type;
  return typeof t === "string" ? t : "attack";
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
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState("All");
  const [attack, setAttack] = useState("All");
  const [actor, setActor] = useState("All");
  const [recordType, setRecordType] = useState("All");
  const [range, setRange] = useState("All Time");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/reports?limit=500");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReports(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const attackOptions = useMemo(() => {
    const s = new Set<string>();
    reports.forEach((r) => r.attack_type && s.add(r.attack_type));
    return Array.from(s).sort();
  }, [reports]);

  const actorOptions = useMemo(() => {
    const s = new Set<string>();
    reports.forEach((r) => {
      const a = r.attack_parameters?.threat_actor_profile;
      if (typeof a === "string" && a) s.add(a);
    });
    return Array.from(s).sort();
  }, [reports]);

  const rangeCutoff = useMemo(() => {
    const now = Date.now();
    if (range === "Last 7 days") return now - 7 * 86400_000;
    if (range === "Last 30 days") return now - 30 * 86400_000;
    if (range === "Last 90 days") return now - 90 * 86400_000;
    return 0;
  }, [range]);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const deg = r.mission_degradation_percent ?? 0;
      const rk = riskOf(deg);
      if (risk !== "All" && rk !== risk) return false;
      if (attack !== "All" && r.attack_type !== attack) return false;
      const ra = r.attack_parameters?.threat_actor_profile;
      if (actor !== "All" && ra !== actor) return false;
      if (recordType !== "All" && recordTypeOf(r) !== recordType) return false;
      if (rangeCutoff && r.created_at) {
        const t = new Date(r.created_at).getTime();
        if (!Number.isNaN(t) && t < rangeCutoff) return false;
      }
      if (query) {
        const q = query.toLowerCase();
        const hay = `${r.simulation_id || ""} ${r.id} ${r.target_satellite || ""} ${r.attack_type || ""} ${ra || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [reports, risk, attack, actor, recordType, rangeCutoff, query]);

  useEffect(() => { setPage(1); }, [query, risk, attack, actor, recordType, range]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    const total = reports.length;
    let critical = 0;
    let degSum = 0;
    let degCount = 0;
    let weekCount = 0;
    const weekCutoff = Date.now() - 7 * 86400_000;
    reports.forEach((r) => {
      const deg = r.mission_degradation_percent;
      if (typeof deg === "number") {
        degSum += deg;
        degCount += 1;
        if (riskOf(deg) === "CRITICAL") critical += 1;
      }
      if (r.created_at) {
        const t = new Date(r.created_at).getTime();
        if (!Number.isNaN(t) && t >= weekCutoff) weekCount += 1;
      }
    });
    return {
      total,
      critical,
      avgDeg: degCount ? (degSum / degCount).toFixed(1) + "%" : "—",
      week: weekCount,
    };
  }, [reports]);

  const allSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) pageRows.forEach((r) => next.delete(r.id));
    else pageRows.forEach((r) => next.add(r.id));
    setSelected(next);
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${pluralize(selected.size, "selected report")}?`)) return;
    setBusy(true);
    try {
      const ids = Array.from(selected);
      const results = await Promise.allSettled(
        ids.map((id) => apiFetch(`/api/reports/${id}`, { method: "DELETE" })),
      );
      const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)).length;
      if (failed) toast.error(`${failed} deletion(s) failed`);
      else toast.success(`Deleted ${pluralize(ids.length, "report")}`);
      setSelected(new Set());
      await load();
    } finally {
      setBusy(false);
    }
  };

  const clearAll = async () => {
    if (!window.confirm("Delete ALL reports? This cannot be undone.")) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/reports`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("All reports deleted");
      setSelected(new Set());
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to clear reports");
    } finally {
      setBusy(false);
    }
  };

  const showingFrom = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, filtered.length);

  return (
    <AppShell
      title="Reports Library"
      subtitle="ASSESSMENT ARCHIVE · ALL MISSIONS"
      actions={
        <button
          onClick={clearAll}
          disabled={busy || reports.length === 0}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-destructive/50 text-destructive text-xs font-semibold hover:bg-destructive/10 disabled:opacity-50"
        >
          Clear All
        </button>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatTile label="Total Reports"      value={String(stats.total)}    tone="default" />
        <StatTile label="Critical Risk"      value={String(stats.critical)} tone="critical" />
        <StatTile label="Avg Degradation"    value={stats.avgDeg}           tone="high" />
        <StatTile label="Reports This Week"  value={String(stats.week)}     tone="primary" />
      </div>

      <Panel>
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
              <option>All</option>{attackOptions.map((a) => <option key={a} value={a}>{formatAttack(a)}</option>)}
            </select>
            <select value={actor} onChange={(e) => setActor(e.target.value)} className="px-2.5 py-1.5 text-xs font-mono bg-surface-2 border border-border rounded">
              <option>All</option>{actorOptions.map((a) => <option key={a} value={a}>{titleCase(a)}</option>)}
            </select>
            <select value={recordType} onChange={(e) => setRecordType(e.target.value)} className="px-2.5 py-1.5 text-xs font-mono bg-surface-2 border border-border rounded">
              <option value="All">All Types</option>
              <option value="attack">Attack</option>
              <option value="scenario">Scenario</option>
              <option value="adversary">Adversary</option>
              <option value="constellation">Constellation</option>
            </select>
            <select value={range} onChange={(e) => setRange(e.target.value)} className="px-2.5 py-1.5 text-xs font-mono bg-surface-2 border border-border rounded">
              <option>Last 7 days</option><option>Last 30 days</option><option>Last 90 days</option><option>All Time</option>
            </select>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="px-4 py-2.5 border-b border-border bg-primary/5 flex items-center justify-between text-xs font-mono">
            <span className="text-primary">{selected.size} report{selected.size === 1 ? "" : "s"} selected</span>
            <div className="flex items-center gap-2">
              <button
                onClick={deleteSelected}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-destructive/50 text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                Delete Selected
              </button>
            </div>
          </div>
        )}

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
                <th className="text-left font-medium px-4 py-2.5">Type</th>
                <th className="text-left font-medium px-4 py-2.5">Threat Actor</th>
                <th className="text-left font-medium px-4 py-2.5">Date</th>
                <th className="text-right font-medium px-4 py-2.5">Degradation</th>
                <th className="text-left font-medium px-4 py-2.5">Risk</th>
                <th className="text-right font-medium px-4 py-2.5">Op. Cost</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground text-xs font-mono">Loading reports...</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-destructive text-xs font-mono">{error}</td></tr>
              )}
              {!loading && !error && pageRows.map((r) => {
                const deg = r.mission_degradation_percent ?? 0;
                const rk = riskOf(deg);
                const rt = recordTypeOf(r);
                const ra = r.attack_parameters?.threat_actor_profile;
                return (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-surface-2/60 transition-colors">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="accent-primary" checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} />
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-primary">{r.simulation_id || r.id}</td>
                    <td className="px-4 py-3 font-mono text-[13px]">{r.target_satellite || "—"}</td>
                    <td className="px-4 py-3">{formatAttack(r.attack_type)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider border border-border rounded bg-surface-2 text-muted-foreground">{rt}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{ra ? titleCase(ra) : "—"}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{formatDate(r.created_at)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${degColor(deg)}`}>{deg.toFixed(1)}%</td>
                    <td className="px-4 py-3"><StatusBadge level={rk as any} /></td>
                    <td className="px-4 py-3 text-right font-mono">{formatCost(r.impact_summary)}</td>
                  </tr>
                );
              })}
              {!loading && !error && filtered.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground text-xs font-mono">No reports match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <span>Showing {showingFrom}–{showingTo} of {filtered.length} report{filtered.length === 1 ? "" : "s"}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border hover:bg-surface-2 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-2">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border hover:bg-surface-2 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </Panel>
    </AppShell>
  );
}
