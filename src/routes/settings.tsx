import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Panel } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — OrbitSec" },
      { name: "description", content: "Platform configuration and preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [platformName, setPlatformName] = useState("OrbitSec");
  const [timezone, setTimezone] = useState("UTC");
  const [sessionTimeout, setSessionTimeout] = useState("1 hour");
  const [classification, setClassification] = useState("UNCLASSIFIED");
  const [autoSave, setAutoSave] = useState(true);

  const [severity, setSeverity] = useState(70);
  const [duration, setDuration] = useState(300);
  const [threatActor, setThreatActor] = useState("Sophisticated APT");
  const [attackType, setAttackType] = useState("AI-Adaptive GNSS Spoofing");
  const [uncertainty, setUncertainty] = useState(true);
  const [sensitivity, setSensitivity] = useState(true);
  const [lhsSamples, setLhsSamples] = useState(500);

  const [simAlert, setSimAlert] = useState(true);
  const [reportAlert, setReportAlert] = useState(true);
  const [criticalAlert, setCriticalAlert] = useState(true);
  const [statusAlert, setStatusAlert] = useState(true);
  const [emailNotif, setEmailNotif] = useState(false);
  const [email, setEmail] = useState("");

  return (
    <AppShell title="Settings" subtitle="PLATFORM CONFIGURATION · v2.4">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Panel 1 — General */}
        <Panel title="General">
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Platform Name</label>
              <Input value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Timezone</label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="EST">EST</SelectItem>
                  <SelectItem value="PST">PST</SelectItem>
                  <SelectItem value="GMT">GMT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Session Timeout</label>
              <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30 minutes">30 minutes</SelectItem>
                  <SelectItem value="1 hour">1 hour</SelectItem>
                  <SelectItem value="4 hours">4 hours</SelectItem>
                  <SelectItem value="8 hours">8 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Classification Level</label>
              <Select value={classification} onValueChange={setClassification}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNCLASSIFIED">UNCLASSIFIED</SelectItem>
                  <SelectItem value="CUI">CUI</SelectItem>
                  <SelectItem value="SECRET">SECRET</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm">Auto-save Configurations</span>
              <Switch checked={autoSave} onCheckedChange={setAutoSave} />
            </div>
          </div>
        </Panel>

        {/* Panel 2 — Simulation Defaults */}
        <Panel title="Simulation Defaults">
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Default Severity — {severity}%</label>
              <Slider value={[severity]} max={100} step={1} onValueChange={(v) => setSeverity(v[0])} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Default Duration (seconds)</label>
              <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Default Threat Actor</label>
              <Select value={threatActor} onValueChange={setThreatActor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nation-State">Nation-State</SelectItem>
                  <SelectItem value="Sophisticated APT">Sophisticated APT</SelectItem>
                  <SelectItem value="Insider Threat">Insider Threat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Default Attack Type</label>
              <Select value={attackType} onValueChange={setAttackType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GPS Spoofing">GPS Spoofing</SelectItem>
                  <SelectItem value="RF Jamming">RF Jamming</SelectItem>
                  <SelectItem value="Command Injection">Command Injection</SelectItem>
                  <SelectItem value="Ground Station Compromise">Ground Station Compromise</SelectItem>
                  <SelectItem value="AI-Adaptive GNSS Spoofing">AI-Adaptive GNSS Spoofing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Uncertainty Quantification</span>
              <Switch checked={uncertainty} onCheckedChange={setUncertainty} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Sensitivity Analysis</span>
              <Switch checked={sensitivity} onCheckedChange={setSensitivity} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">LHS Sample Count</label>
              <Input type="number" value={lhsSamples} onChange={(e) => setLhsSamples(Number(e.target.value))} />
            </div>
          </div>
        </Panel>

        {/* Panel 3 — Notifications */}
        <Panel title="Notifications">
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Simulation Complete Alert</span>
              <Switch checked={simAlert} onCheckedChange={setSimAlert} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Report Ready Alert</span>
              <Switch checked={reportAlert} onCheckedChange={setReportAlert} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Critical Risk Alert — degradation exceeds 75%</span>
              <Switch checked={criticalAlert} onCheckedChange={setCriticalAlert} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">System Status Alerts</span>
              <Switch checked={statusAlert} onCheckedChange={setStatusAlert} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Email Notifications</span>
              <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
            </div>
            {emailNotif && (
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Email Address</label>
                <Input placeholder="operator@orbitsec.co" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            )}
          </div>
        </Panel>

        {/* Panel 4 — Data Management */}
        <Panel title="Data Management">
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between panel-2 px-3 py-2.5">
              <div>
                <div className="text-sm">Saved Configurations</div>
                <div className="text-[11px] font-mono text-muted-foreground">5 saved</div>
              </div>
              <button className="px-3 py-1.5 text-xs font-mono uppercase border border-destructive text-destructive rounded hover:bg-destructive/10 transition-colors">
                Clear All Configurations
              </button>
            </div>
            <div className="flex items-center justify-between panel-2 px-3 py-2.5">
              <div>
                <div className="text-sm">Simulation History</div>
                <div className="text-[11px] font-mono text-muted-foreground">412 simulations</div>
              </div>
              <button className="px-3 py-1.5 text-xs font-mono uppercase border border-cyan text-cyan rounded hover:bg-cyan/10 transition-colors">
                Export All Reports
              </button>
            </div>
            <div className="flex items-center justify-between panel-2 px-3 py-2.5">
              <div>
                <div className="text-sm">Clear Simulation History</div>
                <div className="text-[11px] font-mono text-destructive">This action cannot be undone</div>
              </div>
              <button className="px-3 py-1.5 text-xs font-mono uppercase border border-destructive text-destructive rounded hover:bg-destructive/10 transition-colors">
                Clear History
              </button>
            </div>
            <div className="flex items-center justify-between panel-2 px-3 py-2.5">
              <div>
                <div className="text-sm">Cache Status</div>
                <div className="text-[11px] font-mono text-muted-foreground">TLE Cache: Fresh · Last updated 14:32 UTC</div>
              </div>
              <button className="px-3 py-1.5 text-xs font-mono uppercase border border-cyan text-cyan rounded hover:bg-cyan/10 transition-colors">
                Refresh TLE Cache
              </button>
            </div>
            <div className="flex items-center justify-between panel-2 px-3 py-2.5">
              <div>
                <div className="text-sm">API Connection</div>
                <div className="text-[11px] font-mono text-muted-foreground">api.orbitsec.co/v2</div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" />
                ONLINE
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="mt-4">
        <button className="w-full py-2.5 text-sm font-mono uppercase tracking-wider bg-gradient-to-r from-cyan to-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity">
          Save Settings
        </button>
      </div>
    </AppShell>
  );
}
