import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, Panel } from "@/components/AppShell";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { apiFetch, logout, pluralize } from "@/lib/api";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — OrbitSec" },
      { name: "description", content: "Platform configuration and preferences." },
    ],
  }),
  component: SettingsPage,
});

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";

type SavedConfig = { name: string; created_at?: string; config?: unknown };
type Report = Record<string, unknown> & { id?: string | number };

function tsSafe(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function SettingsPage() {
  const navigate = useNavigate();

  const [configs, setConfigs] = useState<SavedConfig[]>([]);
  const [configsLoading, setConfigsLoading] = useState(true);
  const [clearingConfigs, setClearingConfigs] = useState(false);

  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [clearingReports, setClearingReports] = useState(false);

  const [health, setHealth] = useState<
    | { status: "checking" }
    | { status: "online"; timestamp?: string }
    | { status: "offline"; error?: string }
  >({ status: "checking" });

  const loadConfigs = useCallback(async () => {
    setConfigsLoading(true);
    try {
      const res = await apiFetch("/api/configs");
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as SavedConfig[];
      setConfigs(Array.isArray(data) ? data : []);
    } catch {
      setConfigs([]);
    } finally {
      setConfigsLoading(false);
    }
  }, []);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const res = await apiFetch("/api/reports?limit=500");
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as Report[];
      setReports(Array.isArray(data) ? data : []);
    } catch {
      setReports([]);
    } finally {
      setReportsLoading(false);
    }
  }, []);

  const pingHealth = useCallback(async () => {
    setHealth({ status: "checking" });
    try {
      const res = await fetch(`${baseURL}/health`);
      if (!res.ok) {
        setHealth({ status: "offline", error: String(res.status) });
        return;
      }
      let timestamp: string | undefined;
      try {
        const j = (await res.json()) as { timestamp?: string; time?: string };
        timestamp = j?.timestamp ?? j?.time;
      } catch {
        // ignore
      }
      setHealth({ status: "online", timestamp });
    } catch (e) {
      setHealth({ status: "offline", error: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    loadConfigs();
    loadReports();
    pingHealth();
  }, [loadConfigs, loadReports, pingHealth]);

  async function clearAllConfigs() {
    const n = configs.length;
    if (n === 0) return;
    if (!window.confirm(`Delete all ${pluralize(n, "configuration")}? This cannot be undone.`)) return;
    setClearingConfigs(true);
    let failed = 0;
    for (const c of configs) {
      try {
        const res = await apiFetch(`/api/configs/${encodeURIComponent(c.name)}`, {
          method: "DELETE",
        });
        if (!res.ok) failed++;
      } catch {
        failed++;
      }
    }
    setClearingConfigs(false);
    if (failed) toast.error(`${failed} deletion(s) failed`);
    else toast.success(`Deleted ${n} configuration(s)`);
    loadConfigs();
  }

  function exportHistory() {
    const blob = new Blob([JSON.stringify(reports, null, 2)], { type: "application/json" });
    downloadBlob(blob, `orbitsec_history_${tsSafe()}.json`);
  }

  async function clearHistory() {
    if (reports.length === 0) return;
    if (!window.confirm("Delete ALL assessment history? This cannot be undone.")) return;
    setClearingReports(true);
    try {
      const res = await apiFetch("/api/reports", { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      toast.success("Assessment history cleared");
      loadReports();
    } catch (e) {
      toast.error((e as Error).message || "Failed to clear history");
    } finally {
      setClearingReports(false);
    }
  }

  function handleLogout() {
    logout();
    navigate({ to: "/login" });
  }

  return (
    <AppShell title="Settings" subtitle="PLATFORM CONFIGURATION">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Data Management */}
        <Panel title="Data Management">
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between panel-2 px-3 py-2.5">
              <div>
                <div className="text-sm">Saved Configurations</div>
                <div className="text-[11px] font-mono text-muted-foreground">
                  {configsLoading ? "Loading..." : `${configs.length} saved`}
                </div>
              </div>
              <button
                onClick={clearAllConfigs}
                disabled={configsLoading || clearingConfigs || configs.length === 0}
                className="px-3 py-1.5 text-xs font-mono uppercase border border-destructive text-destructive rounded hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {clearingConfigs ? "Clearing..." : "Clear All Configurations"}
              </button>
            </div>

            <div className="panel-2 px-3 py-2.5 space-y-2.5">
              <div>
                <div className="text-sm">Simulation History</div>
                <div className="text-[11px] font-mono text-muted-foreground">
                  {reportsLoading ? "Loading..." : `${reports.length} assessments`}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={exportHistory}
                  disabled={reportsLoading || reports.length === 0}
                  className="px-3 py-1.5 text-xs font-mono uppercase border border-cyan text-cyan rounded hover:bg-cyan/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Export All History (JSON)
                </button>
                <button
                  onClick={clearHistory}
                  disabled={reportsLoading || clearingReports || reports.length === 0}
                  className="px-3 py-1.5 text-xs font-mono uppercase border border-destructive text-destructive rounded hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {clearingReports ? "Clearing..." : "Clear History"}
                </button>
              </div>
            </div>
          </div>
        </Panel>

        {/* System */}
        <Panel title="System">
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between panel-2 px-3 py-2.5">
              <div className="min-w-0">
                <div className="text-sm">API Connection</div>
                <div className="text-[11px] font-mono text-muted-foreground truncate">
                  {baseURL}
                </div>
                {health.status === "online" && health.timestamp && (
                  <div className="text-[11px] font-mono text-muted-foreground">
                    Last response: {health.timestamp}
                  </div>
                )}
                {health.status === "offline" && health.error && (
                  <div className="text-[11px] font-mono text-destructive">
                    {health.error}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {health.status === "checking" && (
                  <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    CHECKING
                  </div>
                )}
                {health.status === "online" && (
                  <div className="flex items-center gap-1.5 text-xs font-mono text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" />
                    ONLINE
                  </div>
                )}
                {health.status === "offline" && (
                  <div className="flex items-center gap-1.5 text-xs font-mono text-destructive">
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                    OFFLINE
                  </div>
                )}
                <button
                  onClick={pingHealth}
                  disabled={health.status === "checking"}
                  className="px-3 py-1.5 text-xs font-mono uppercase border border-cyan text-cyan rounded hover:bg-cyan/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Re-check
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between panel-2 px-3 py-2.5">
              <div>
                <div className="text-sm">Account</div>
                <div className="text-[11px] font-mono text-muted-foreground">
                  Authenticated session
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-mono uppercase border border-destructive text-destructive rounded hover:bg-destructive/10 transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
