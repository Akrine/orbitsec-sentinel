import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — OrbitSec" },
      { name: "description", content: "Authorized access only." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="dark flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute inset-0 hud-grid opacity-30 pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <div className="panel p-8">
          {/* Logo / Wordmark */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-lg panel-2 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <div className="text-xl font-display font-bold tracking-tight text-foreground">
                OrbitSec
              </div>
              <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                Satellite Cybersecurity Platform
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
                Username
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-surface-2 border-border focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-surface-2 border-border focus-visible:ring-primary"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-10 mt-2 bg-gradient-to-r from-primary to-cyan text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity"
            >
              LOGIN
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
          CONFIDENTIAL — Authorized Users Only
        </div>
      </div>
    </div>
  );
}
