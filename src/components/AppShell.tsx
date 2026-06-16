import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { logout } from "@/lib/api";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/configure", label: "Satellite Config" },
  { to: "/attack", label: "New Simulation" },
  { to: "/scenarios", label: "Mission Scenarios" },
  { to: "/constellation", label: "Constellation" },
  { to: "/adversary", label: "AI Adversary" },
  { to: "/reports", label: "Reports" },
  { to: "/settings", label: "Settings" },
];

export function AppShell({ children, title, subtitle, actions }: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="dark min-h-screen flex bg-background text-foreground">
      <aside
        className={`${collapsed ? "w-16" : "w-60"} shrink-0 border-r border-sidebar-border bg-sidebar transition-all duration-200 flex flex-col`}
      >
        <div className="h-14 flex items-center gap-2 px-4 border-b border-sidebar-border">
          <div className="h-7 w-7 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center">
            <span className="text-[10px] font-mono font-bold text-primary">OS</span>
          </div>
          {!collapsed && (
            <div className="flex-1">
              <div className="font-display text-[15px] font-semibold tracking-tight leading-none">ORBITSEC</div>
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground mt-0.5">v2.4 · OPS</div>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto h-6 w-6 flex items-center justify-center rounded hover:bg-sidebar-accent text-muted-foreground"
          >
            <span className="text-xs font-mono">{collapsed ? "OPEN" : "MIN"}</span>
          </button>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {!collapsed && (
            <div className="px-2 pb-2 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
              Operations
            </div>
          )}
          {NAV.map(({ to, label }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-2.5 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-foreground border-l-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 border-l-2 border-transparent"
                }`}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-50" />
                {!collapsed && <span className="truncate">{label}</span>}
                {!collapsed && active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary pulse-dot" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-md bg-gradient-to-br from-primary/30 to-accent/30 border border-border flex items-center justify-center text-xs font-semibold font-mono">
                MR
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">Maj. M. Reyes</div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">SOC · L4 Clearance</div>
              </div>
              <button className="h-7 w-7 flex items-center justify-center rounded hover:bg-sidebar-accent text-muted-foreground">
                <span className="text-[10px] font-mono">OUT</span>
              </button>
            </div>
          ) : (
            <div className="h-8 w-8 mx-auto rounded-md bg-gradient-to-br from-primary/30 to-accent/30 border border-border flex items-center justify-center text-xs font-semibold font-mono">
              MR
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-surface/60 backdrop-blur-md flex items-center px-6 gap-4">
          <div className="min-w-0">
            <h1 className="text-[15px] font-display font-semibold leading-tight truncate">{title}</h1>
            {subtitle && (
              <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground truncate">{subtitle}</div>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 panel px-2.5 py-1.5 text-xs text-muted-foreground w-72">
              <input placeholder="Search satellites, sims, reports…" className="bg-transparent outline-none flex-1 text-foreground placeholder:text-muted-foreground" />
              <kbd className="font-mono text-[10px] px-1 py-0.5 rounded border border-border bg-background text-muted-foreground">⌘K</kbd>
            </div>
            <button className="h-8 w-8 panel flex items-center justify-center text-muted-foreground hover:text-foreground relative">
              <span className="text-[10px] font-mono">ALRT</span>
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-critical pulse-dot" />
            </button>
            <div className="hidden lg:flex items-center gap-1.5 panel px-2.5 py-1.5 text-[11px] font-mono uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" />
              <span className="text-muted-foreground">SYS</span>
              <span className="text-success">NOMINAL</span>
            </div>
            {actions}
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

export function StatusBadge({ level }: { level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "LIVE" | "SOON" }) {
  const map: Record<string, string> = {
    CRITICAL: "bg-critical/15 text-critical border-critical/40",
    HIGH: "bg-high/15 text-high border-high/40",
    MEDIUM: "bg-medium/15 text-medium border-medium/40",
    LOW: "bg-low/15 text-low border-low/40",
    LIVE: "bg-success/15 text-success border-success/40",
    SOON: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.14em] rounded border ${map[level]}`}>
      {level === "LIVE" && <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" />}
      {level}
    </span>
  );
}

export function Panel({ children, className = "", title, action }: { children: ReactNode; className?: string; title?: string; action?: ReactNode }) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <header className="flex items-center px-4 py-3 border-b border-border">
          <h2 className="text-xs font-mono uppercase tracking-[0.16em] text-muted-foreground">{title}</h2>
          <div className="ml-auto">{action}</div>
        </header>
      )}
      {children}
    </section>
  );
}
