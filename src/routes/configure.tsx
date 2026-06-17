import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, Panel } from "@/components/AppShell";
import { OrbitalTrack } from "@/components/OrbitalTrack";
import { apiFetch } from "@/lib/api";
import { useActiveSatellite } from "@/lib/activeSatellite";

export const Route = createFileRoute("/configure")({
  head: () => ({
    meta: [
      { title: "Satellite Configuration — OrbitSec" },
      {
        name: "description",
        content:
          "Define satellite physical, RF, and software parameters for cybersecurity simulation.",
      },
    ],
  }),
  component: Configure,
});


// ---------- primitives ----------
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-input border border-border rounded-md px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-primary/60 ${
        props.className ?? ""
      }`}
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-input border border-border rounded-md px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-primary/60"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2.5 panel-2 px-2.5 py-2 cursor-pointer hover:border-primary/40">
      <span
        onClick={() => onChange(!checked)}
        className={`h-4 w-4 rounded-sm border flex items-center justify-center transition-colors ${
          checked ? "bg-primary border-primary" : "border-border bg-surface-2"
        }`}
      >
        {checked && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
      </span>
      <span className="text-xs">{label}</span>
    </label>
  );
}

const ACCENT: Record<string, { bar: string; text: string; chip: string }> = {
  grey: { bar: "bg-muted-foreground/60", text: "text-muted-foreground", chip: "bg-muted-foreground/10 border-muted-foreground/30" },
  cyan: { bar: "bg-primary", text: "text-primary", chip: "bg-primary/10 border-primary/30" },
  yellow: { bar: "bg-warning", text: "text-warning", chip: "bg-warning/10 border-warning/30" },
  green: { bar: "bg-success", text: "text-success", chip: "bg-success/10 border-success/30" },
  orange: { bar: "bg-orange-500", text: "text-orange-400", chip: "bg-orange-500/10 border-orange-500/30" },
  purple: { bar: "bg-purple-500", text: "text-purple-400", chip: "bg-purple-500/10 border-purple-500/30" },
  red: { bar: "bg-critical", text: "text-critical", chip: "bg-critical/10 border-critical/30" },
  darkpurple: { bar: "bg-purple-700", text: "text-purple-300", chip: "bg-purple-700/10 border-purple-700/40" },
  darkgreen: { bar: "bg-emerald-700", text: "text-emerald-300", chip: "bg-emerald-700/10 border-emerald-700/40" },
};

function Section({
  title,
  accent,
  defaultOpen = true,
  children,
}: {
  title: string;
  accent: keyof typeof ACCENT;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const a = ACCENT[accent];
  return (
    <div className="panel rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-2.5 px-4 py-2.5 border-b border-border ${a.chip} hover:brightness-110`}
      >
        <span className={`h-4 w-1 rounded-sm ${a.bar}`} />
        <span className={`text-xs font-mono uppercase tracking-[0.18em] font-semibold ${a.text}`}>
          {title}
        </span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">{open ? "OPEN" : "CLOSED"}</span>
      </button>
      {open && <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">{children}</div>}
    </div>
  );
}

// ---------- form state ----------
type FormState = {
  mission_type: string;
  altitude: number;
  inclination: number;
  orbit_type: string;
  norad_id: number;
  adcs: {
    pointing_accuracy: number;
    reaction_wheels: number;
    star_trackers: number;
    st_accuracy: number;
    has_gyroscopes: boolean;
    gyroscopes: number;
    gyro_drift: number;
    slew_rate: number;
    wheel_momentum: number;
    sun_sensors: number;
    magnetometers: number;
    magnetorquers: number;
    has_thrusters: boolean;
    anomaly_detection: boolean;
    backup_mode: string;
    backup_pointing: number;
    switchover_time: number;
    autonomy: string;
    detection_threshold: number;
    propellant: number;
    isp: number;
  };
  eps: {
    solar_panel_area: number;
    cell_efficiency: number;
    solar_arrays: number;
    battery_wh: number;
    battery_cells: number;
    battery_voltage: number;
    power_buses: number;
    nominal_draw: number;
    peak_draw: number;
    redundant_power: boolean;
  };
  comms: {
    s_antennas: number;
    s_gain: number;
    s_freq: number;
    s_tx_power: number;
    s_data: number;
    x_antennas: number;
    x_gain: number;
    x_freq: number;
    x_tx_power: number;
    x_data: number;
    rx_sensitivity: number;
    has_ka: boolean;
    multi_gnss: boolean;
    encryption: string;
    spread_spectrum: string;
    gps_aj_margin: number;
    modulation: string;
    command_auth: string;
    fallback_chain: { ka: boolean; x: boolean; s: boolean; uhf: boolean };
  };
  thermal: {
    radiator_area: number;
    emissivity: number;
    heaters: number;
    heater_power: number;
    mli_layers: number;
    min_op_temp: number;
    max_op_temp: number;
    batt_min_temp: number;
    batt_max_temp: number;
    heat_pipes: number;
    coating: string;
  };
  payload: {
    optical_aperture: number;
    focal_length: number;
    gsd: number;
    data_rate: number;
    storage: number;
    power_draw: number;
    pointing_req: number;
  };
  ground_segment: {
    ground_stations: number;
    uplink_freq: number;
    downlink_freq: number;
    antenna_gain: number;
    ground_tx_power: number;
    contact_window: number;
    passes_per_day: number;
    crosslinks: boolean;
    encryption: string;
    net_segmentation: string;
    firmware_verification: string;
    region: string;
  };
  radiation: { tid_krad: number };
  financial: {
    downtime_rate: number;
    asset_value: number;
    recovery_ops_rate: number;
  };
};

const DEFAULTS: FormState = {
  mission_type: "Earth Observation",
  altitude: 400,
  inclination: 51.6,
  orbit_type: "LEO",
  norad_id: 0,
  adcs: {
    pointing_accuracy: 0.1,
    reaction_wheels: 4,
    star_trackers: 2,
    st_accuracy: 10,
    has_gyroscopes: true,
    gyroscopes: 4,
    gyro_drift: 1.0,
    slew_rate: 1.0,
    wheel_momentum: 50,
    sun_sensors: 6,
    magnetometers: 3,
    magnetorquers: 3,
    has_thrusters: false,
    anomaly_detection: false,
    backup_mode: "None",
    backup_pointing: 1.0,
    switchover_time: 60,
    autonomy: "Low",
    detection_threshold: 30,
    propellant: 100,
    isp: 220,
  },
  eps: {
    solar_panel_area: 4.0,
    cell_efficiency: 0.3,
    solar_arrays: 2,
    battery_wh: 1000,
    battery_cells: 48,
    battery_voltage: 28,
    power_buses: 2,
    nominal_draw: 200,
    peak_draw: 400,
    redundant_power: true,
  },
  comms: {
    s_antennas: 2,
    s_gain: 12.0,
    s_freq: 2200,
    s_tx_power: 5.0,
    s_data: 10,
    x_antennas: 1,
    x_gain: 25,
    x_freq: 8400,
    x_tx_power: 10,
    x_data: 100,
    rx_sensitivity: -110,
    has_ka: false,
    multi_gnss: false,
    encryption: "AES-256",
    spread_spectrum: "None",
    gps_aj_margin: 0,
    modulation: "BPSK",
    command_auth: "None",
    fallback_chain: { ka: false, x: true, s: true, uhf: false },
  },
  thermal: {
    radiator_area: 2.0,
    emissivity: 0.85,
    heaters: 6,
    heater_power: 10,
    mli_layers: 15,
    min_op_temp: -20,
    max_op_temp: 50,
    batt_min_temp: 0,
    batt_max_temp: 40,
    heat_pipes: 4,
    coating: "White Paint",
  },
  payload: {
    optical_aperture: 0.5,
    focal_length: 5.0,
    gsd: 1.0,
    data_rate: 2.0,
    storage: 500,
    power_draw: 100,
    pointing_req: 0.01,
  },
  ground_segment: {
    ground_stations: 3,
    uplink_freq: 2025,
    downlink_freq: 2200,
    antenna_gain: 20,
    ground_tx_power: 100,
    contact_window: 10,
    passes_per_day: 6,
    crosslinks: false,
    encryption: "AES-256",
    net_segmentation: "Basic",
    firmware_verification: "Software Signature",
    region: "Global Distribution",
  },
  radiation: { tid_krad: 20 },
  financial: {
    downtime_rate: 15000,
    asset_value: 300,
    recovery_ops_rate: 5000,
  },
};

// ---------- enum mappings (display label <-> backend value) ----------
const MISSION_MAP: Record<string, string> = {
  "Earth Observation": "earth_observation",
  "Communications": "communications",
  "Navigation": "navigation",
  "Scientific": "scientific",
};
const BACKUP_MODE_MAP: Record<string, string> = {
  "None": "none",
  "Thruster-Based": "thruster",
  "Magnetorquer-Based": "magnetorquer",
};
const AUTONOMY_MAP: Record<string, string> = {
  "Low": "low",
  "Medium": "medium",
  "High": "high",
};
const COMMAND_AUTH_MAP: Record<string, string> = {
  "None": "none",
  "Seq Counter": "sequence_counter",
  "HMAC-SHA256": "hmac",
  "Digital Sig": "digital_signature",
};
const NET_SEG_MAP: Record<string, string> = {
  "Basic": "basic",
  "None": "none",
  "Zero-Trust": "zero_trust",
};
const REGION_MAP: Record<string, string> = {
  "Global Distribution": "global",
  "North America": "north_america",
  "Europe": "europe",
  "Middle East": "middle_east",
  "Asia Pacific": "asia_pacific",
};

function toLabel(map: Record<string, string>, backend: unknown, fallback: string): string {
  if (typeof backend !== "string") return fallback;
  for (const [label, val] of Object.entries(map)) {
    if (val === backend) return label;
  }
  return fallback;
}

function pickNum(v: unknown, fallback: number): number {
  return typeof v === "number" && !Number.isNaN(v) ? v : fallback;
}
function pickBool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}
function pickStr(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

// safely merge a loaded config into defaults using EXACT backend keys
function mergeConfig(loaded: Record<string, unknown> | undefined | null): FormState {
  const base: FormState = JSON.parse(JSON.stringify(DEFAULTS));
  if (!loaded || typeof loaded !== "object") return base;
  const L = loaded as Record<string, any>;

  // top-level scalars
  base.mission_type = toLabel(MISSION_MAP, L.mission_type, base.mission_type);
  base.altitude = pickNum(L.altitude_km, base.altitude);
  base.inclination = pickNum(L.inclination_deg, base.inclination);
  base.orbit_type = pickStr(L.orbit_type, base.orbit_type);
  base.norad_id = pickNum(L.norad_id, base.norad_id);

  // adcs
  const a = (L.adcs ?? {}) as Record<string, any>;
  const A = base.adcs;
  A.pointing_accuracy = pickNum(a.pointing_accuracy_deg, A.pointing_accuracy);
  A.reaction_wheels = pickNum(a.num_reaction_wheels, A.reaction_wheels);
  A.star_trackers = pickNum(a.num_star_trackers, A.star_trackers);
  A.st_accuracy = pickNum(a.star_tracker_accuracy_arcsec, A.st_accuracy);
  A.has_gyroscopes = pickBool(a.has_gyroscopes, A.has_gyroscopes);
  A.gyroscopes = pickNum(a.num_gyroscopes, A.gyroscopes);
  A.gyro_drift = pickNum(a.gyro_drift_deg_per_hour, A.gyro_drift);
  A.slew_rate = pickNum(a.slew_rate_deg_per_sec, A.slew_rate);
  A.wheel_momentum = pickNum(a.wheel_max_momentum_nms, A.wheel_momentum);
  A.sun_sensors = pickNum(a.num_sun_sensors, A.sun_sensors);
  A.magnetometers = pickNum(a.num_magnetometers, A.magnetometers);
  A.magnetorquers = pickNum(a.num_magnetorquers, A.magnetorquers);
  A.has_thrusters = pickBool(a.has_thrusters, A.has_thrusters);
  A.anomaly_detection = pickBool(a.has_anomaly_detection, A.anomaly_detection);
  A.backup_mode = toLabel(BACKUP_MODE_MAP, a.backup_adcs_mode, A.backup_mode);
  A.backup_pointing = pickNum(a.backup_adcs_pointing_deg, A.backup_pointing);
  A.switchover_time = pickNum(a.backup_adcs_switchover_s, A.switchover_time);
  A.autonomy = toLabel(AUTONOMY_MAP, a.onboard_autonomy_level, A.autonomy);
  A.detection_threshold = pickNum(a.anomaly_detection_threshold_s, A.detection_threshold);

  // eps
  const e = (L.eps ?? {}) as Record<string, any>;
  const E = base.eps;
  E.solar_panel_area = pickNum(e.solar_panel_area_m2, E.solar_panel_area);
  if (typeof e.solar_cell_efficiency === "number") E.cell_efficiency = e.solar_cell_efficiency / 100;
  E.solar_arrays = pickNum(e.num_solar_arrays, E.solar_arrays);
  E.battery_wh = pickNum(e.battery_capacity_wh, E.battery_wh);
  E.battery_cells = pickNum(e.num_battery_cells, E.battery_cells);
  E.battery_voltage = pickNum(e.battery_voltage_v, E.battery_voltage);
  E.power_buses = pickNum(e.num_power_buses, E.power_buses);
  E.nominal_draw = pickNum(e.nominal_power_draw_w, E.nominal_draw);
  E.peak_draw = pickNum(e.peak_power_draw_w, E.peak_draw);
  E.redundant_power = pickBool(e.redundant_power_system, E.redundant_power);

  // comms
  const c = (L.comms ?? {}) as Record<string, any>;
  const C = base.comms;
  C.s_antennas = pickNum(c.num_s_band_antennas, C.s_antennas);
  C.s_gain = pickNum(c.s_band_gain_dbi, C.s_gain);
  C.s_freq = pickNum(c.s_band_frequency_mhz, C.s_freq);
  C.s_tx_power = pickNum(c.s_band_transmit_power_w, C.s_tx_power);
  C.s_data = pickNum(c.s_band_max_data_rate_mbps, C.s_data);
  C.x_antennas = pickNum(c.num_x_band_antennas, C.x_antennas);
  C.x_gain = pickNum(c.x_band_gain_dbi, C.x_gain);
  C.x_freq = pickNum(c.x_band_frequency_mhz, C.x_freq);
  C.x_tx_power = pickNum(c.x_band_transmit_power_w, C.x_tx_power);
  C.x_data = pickNum(c.x_band_max_data_rate_mbps, C.x_data);
  C.rx_sensitivity = pickNum(c.receiver_sensitivity_dbm, C.rx_sensitivity);
  C.has_ka = pickBool(c.has_ka_band, C.has_ka);
  C.encryption = pickStr(c.encryption_strength, C.encryption);
  C.multi_gnss = pickBool(c.has_multi_gnss, C.multi_gnss);
  C.spread_spectrum = pickStr(c.spread_spectrum, C.spread_spectrum);
  C.command_auth = toLabel(COMMAND_AUTH_MAP, c.command_authentication, C.command_auth);
  C.modulation = pickStr(c.modulation_scheme, C.modulation);
  C.gps_aj_margin = pickNum(c.gps_anti_jam_db, C.gps_aj_margin);
  if (Array.isArray(c.freq_fallback_chain)) {
    const arr = c.freq_fallback_chain as string[];
    C.fallback_chain = {
      ka: arr.includes("ka_band"),
      x: arr.includes("x_band"),
      s: arr.includes("s_band"),
      uhf: arr.includes("uhf"),
    };
  }
  if (typeof c.has_uhf === "boolean") {
    C.fallback_chain.uhf = c.has_uhf;
  }

  // thermal
  const t = (L.thermal ?? {}) as Record<string, any>;
  const T = base.thermal;
  T.radiator_area = pickNum(t.radiator_area_m2, T.radiator_area);
  T.emissivity = pickNum(t.radiator_emissivity, T.emissivity);
  T.heaters = pickNum(t.num_heaters, T.heaters);
  T.heater_power = pickNum(t.heater_power_w, T.heater_power);
  T.mli_layers = pickNum(t.mli_layers, T.mli_layers);
  T.min_op_temp = pickNum(t.min_operating_temp_c, T.min_op_temp);
  T.max_op_temp = pickNum(t.max_operating_temp_c, T.max_op_temp);
  T.batt_min_temp = pickNum(t.battery_min_temp_c, T.batt_min_temp);
  T.batt_max_temp = pickNum(t.battery_max_temp_c, T.batt_max_temp);
  T.heat_pipes = pickNum(t.num_heat_pipes, T.heat_pipes);
  T.coating = pickStr(t.thermal_coating, T.coating);

  // payload
  const p = (L.payload ?? {}) as Record<string, any>;
  const P = base.payload;
  P.optical_aperture = pickNum(p.optical_aperture_m, P.optical_aperture);
  P.focal_length = pickNum(p.optical_focal_length_m, P.focal_length);
  P.gsd = pickNum(p.ground_sample_distance_m, P.gsd);
  P.data_rate = pickNum(p.data_rate_gbps, P.data_rate);
  P.storage = pickNum(p.onboard_storage_gb, P.storage);
  P.power_draw = pickNum(p.payload_power_w, P.power_draw);
  P.pointing_req = pickNum(p.pointing_requirement_deg, P.pointing_req);

  // ground_segment
  const g = (L.ground_segment ?? {}) as Record<string, any>;
  const G = base.ground_segment;
  G.ground_stations = pickNum(g.num_ground_stations, G.ground_stations);
  G.uplink_freq = pickNum(g.uplink_frequency_mhz, G.uplink_freq);
  G.downlink_freq = pickNum(g.downlink_frequency_mhz, G.downlink_freq);
  G.antenna_gain = pickNum(g.antenna_gain_dbi, G.antenna_gain);
  G.ground_tx_power = pickNum(g.ground_tx_power_w, G.ground_tx_power);
  G.contact_window = pickNum(g.contact_window_min, G.contact_window);
  G.passes_per_day = pickNum(g.passes_per_day, G.passes_per_day);
  G.crosslinks = pickBool(g.has_crosslinks, G.crosslinks);
  G.encryption = pickStr(g.encryption_level, G.encryption);
  G.net_segmentation = toLabel(NET_SEG_MAP, g.network_segmentation, G.net_segmentation);
  G.region = toLabel(REGION_MAP, g.ground_station_region, G.region);

  // financial
  const f = (L.financial ?? {}) as Record<string, any>;
  const F = base.financial;
  F.downtime_rate = pickNum(f.hourly_downtime_rate, F.downtime_rate);
  if (typeof f.asset_value_usd === "number") F.asset_value = f.asset_value_usd / 1_000_000;
  F.recovery_ops_rate = pickNum(f.recovery_ops_rate, F.recovery_ops_rate);

  return base;
}

// serialize the form into the backend's exact nested structure
function serializeConfig(form: FormState): Record<string, unknown> {
  const mission = MISSION_MAP[form.mission_type] ?? form.mission_type.toLowerCase().replace(/\s+/g, "_");
  const fc: string[] = [];
  if (form.comms.fallback_chain.ka) fc.push("ka_band");
  if (form.comms.fallback_chain.x) fc.push("x_band");
  if (form.comms.fallback_chain.s) fc.push("s_band");
  if (form.comms.fallback_chain.uhf) fc.push("uhf");

  return {
    mission_type: mission,
    altitude_km: form.altitude,
    inclination_deg: form.inclination,
    orbit_type: form.orbit_type,
    norad_id: form.norad_id,
    adcs: {
      pointing_accuracy_deg: form.adcs.pointing_accuracy,
      num_reaction_wheels: form.adcs.reaction_wheels,
      num_star_trackers: form.adcs.star_trackers,
      star_tracker_accuracy_arcsec: form.adcs.st_accuracy,
      has_gyroscopes: form.adcs.has_gyroscopes,
      num_gyroscopes: form.adcs.gyroscopes,
      gyro_drift_deg_per_hour: form.adcs.gyro_drift,
      slew_rate_deg_per_sec: form.adcs.slew_rate,
      wheel_max_momentum_nms: form.adcs.wheel_momentum,
      num_sun_sensors: form.adcs.sun_sensors,
      num_magnetometers: form.adcs.magnetometers,
      num_magnetorquers: form.adcs.magnetorquers,
      has_thrusters: form.adcs.has_thrusters,
      has_anomaly_detection: form.adcs.anomaly_detection,
      backup_adcs_mode: BACKUP_MODE_MAP[form.adcs.backup_mode] ?? "none",
      backup_adcs_pointing_deg: form.adcs.backup_pointing,
      backup_adcs_switchover_s: form.adcs.switchover_time,
      onboard_autonomy_level: AUTONOMY_MAP[form.adcs.autonomy] ?? "low",
      anomaly_detection_threshold_s: form.adcs.detection_threshold,
    },
    eps: {
      solar_panel_area_m2: form.eps.solar_panel_area,
      solar_cell_efficiency: form.eps.cell_efficiency * 100,
      num_solar_arrays: form.eps.solar_arrays,
      battery_capacity_wh: form.eps.battery_wh,
      num_battery_cells: form.eps.battery_cells,
      battery_voltage_v: form.eps.battery_voltage,
      num_power_buses: form.eps.power_buses,
      nominal_power_draw_w: form.eps.nominal_draw,
      peak_power_draw_w: form.eps.peak_draw,
      redundant_power_system: form.eps.redundant_power,
    },
    comms: {
      num_s_band_antennas: form.comms.s_antennas,
      s_band_gain_dbi: form.comms.s_gain,
      s_band_frequency_mhz: form.comms.s_freq,
      s_band_transmit_power_w: form.comms.s_tx_power,
      s_band_max_data_rate_mbps: form.comms.s_data,
      num_x_band_antennas: form.comms.x_antennas,
      x_band_gain_dbi: form.comms.x_gain,
      x_band_frequency_mhz: form.comms.x_freq,
      x_band_transmit_power_w: form.comms.x_tx_power,
      x_band_max_data_rate_mbps: form.comms.x_data,
      receiver_sensitivity_dbm: form.comms.rx_sensitivity,
      has_ka_band: form.comms.has_ka,
      encryption_strength: form.comms.encryption,
      has_multi_gnss: form.comms.multi_gnss,
      spread_spectrum: form.comms.spread_spectrum,
      command_authentication: COMMAND_AUTH_MAP[form.comms.command_auth] ?? "none",
      modulation_scheme: form.comms.modulation,
      gps_anti_jam_db: form.comms.gps_aj_margin,
      freq_fallback_chain: fc,
      has_uhf: form.comms.fallback_chain.uhf,
    },
    thermal: {
      radiator_area_m2: form.thermal.radiator_area,
      radiator_emissivity: form.thermal.emissivity,
      num_heaters: form.thermal.heaters,
      heater_power_w: form.thermal.heater_power,
      mli_layers: form.thermal.mli_layers,
      min_operating_temp_c: form.thermal.min_op_temp,
      max_operating_temp_c: form.thermal.max_op_temp,
      battery_min_temp_c: form.thermal.batt_min_temp,
      battery_max_temp_c: form.thermal.batt_max_temp,
      num_heat_pipes: form.thermal.heat_pipes,
      has_heat_pipes: form.thermal.heat_pipes > 0,
      thermal_coating: form.thermal.coating,
    },
    payload: {
      payload_type: mission,
      optical_aperture_m: form.payload.optical_aperture,
      optical_focal_length_m: form.payload.focal_length,
      ground_sample_distance_m: form.payload.gsd,
      data_rate_gbps: form.payload.data_rate,
      onboard_storage_gb: form.payload.storage,
      payload_power_w: form.payload.power_draw,
      pointing_requirement_deg: form.payload.pointing_req,
    },
    ground_segment: {
      num_ground_stations: form.ground_segment.ground_stations,
      uplink_frequency_mhz: form.ground_segment.uplink_freq,
      downlink_frequency_mhz: form.ground_segment.downlink_freq,
      antenna_gain_dbi: form.ground_segment.antenna_gain,
      ground_tx_power_w: form.ground_segment.ground_tx_power,
      contact_window_min: form.ground_segment.contact_window,
      passes_per_day: form.ground_segment.passes_per_day,
      has_crosslinks: form.ground_segment.crosslinks,
      encryption_level: form.ground_segment.encryption,
      network_segmentation: NET_SEG_MAP[form.ground_segment.net_segmentation] ?? "basic",
      ground_station_region: REGION_MAP[form.ground_segment.region] ?? "global",
    },
    financial: {
      hourly_downtime_rate: form.financial.downtime_rate,
      asset_value_usd: form.financial.asset_value * 1_000_000,
      recovery_ops_rate: form.financial.recovery_ops_rate,
    },
  };
}

const TARGETS = [
  { name: "ISS", norad_id: 25544 },
  { name: "Hubble", norad_id: 20580 },
  { name: "GPS BIIA-10", norad_id: 22877 },
  { name: "GOES-16", norad_id: 41866 },
  { name: "Sentinel-1A", norad_id: 39634 },
  { name: "WorldView-3", norad_id: 40115 },
];

const SATELLITE_PRESETS: Record<number, any> = {
  41866: {
    mission_type: "earth_observation",
    adcs: { pointing_accuracy_deg:0.01, num_reaction_wheels:4, wheel_max_momentum_nms:75, num_star_trackers:2, star_tracker_accuracy_arcsec:1.0, num_gyroscopes:3, gyro_drift_deg_per_hour:0.1, slew_rate_deg_per_sec:0.8, num_sun_sensors:4, num_magnetometers:2, num_magnetorquers:2, has_thrusters:true, has_anomaly_detection:true, backup_adcs_mode:"thruster", backup_adcs_pointing_deg:1.0, backup_adcs_switchover_s:60, onboard_autonomy_level:"medium", anomaly_detection_threshold_s:30 },
    eps: { solar_panel_area_m2:15.0, solar_cell_efficiency:0.29, num_solar_arrays:2, battery_capacity_wh:3000, num_battery_cells:60, battery_voltage_v:36, num_power_buses:2, nominal_power_draw_w:2200, peak_power_draw_w:4000, redundant_power_system:true },
    comms: { num_s_band_antennas:2, s_band_gain_dbi:10, s_band_frequency_mhz:2041, s_band_transmit_power_w:20, s_band_max_data_rate_mbps:2, num_x_band_antennas:2, x_band_gain_dbi:28, x_band_frequency_mhz:8200, x_band_transmit_power_w:50, x_band_max_data_rate_mbps:50, receiver_sensitivity_dbm:-120, has_ka_band:false, encryption_strength:"AES-128", has_multi_gnss:true, spread_spectrum:"DSSS", command_authentication:"hmac", modulation_scheme:"BPSK", gps_anti_jam_db:0, fb_ka:false, fb_x:true, fb_s:true, fb_uhf:false },
    thermal: { radiator_area_m2:5.5, radiator_emissivity:0.85, num_heaters:14, heater_power_w:10, mli_layers:16, min_operating_temp_c:-25, max_operating_temp_c:55, battery_min_temp_c:-5, battery_max_temp_c:35, num_heat_pipes:6, thermal_coating:"White Paint" },
    payload: { optical_aperture_m:0.5, optical_focal_length_m:5.0, ground_sample_distance_m:0.5, data_rate_gbps:0.05, onboard_storage_gb:500, payload_power_w:4000, pointing_requirement_deg:0.01 },
    ground_segment: { num_ground_stations:4, uplink_frequency_mhz:2041, downlink_frequency_mhz:8200, antenna_gain_dbi:20, ground_tx_power_w:2000, contact_window_min:24, passes_per_day:24, has_crosslinks:false, encryption_level:"AES-128", network_segmentation:"basic" },
    financial: { hourly_downtime_rate:30000, asset_value_usd:500000000, recovery_ops_rate:5000 },
  },
  39634: {
    mission_type: "earth_observation",
    adcs: { pointing_accuracy_deg:0.01, num_reaction_wheels:4, wheel_max_momentum_nms:45, num_star_trackers:2, star_tracker_accuracy_arcsec:2, num_gyroscopes:3, gyro_drift_deg_per_hour:0.5, slew_rate_deg_per_sec:2.0, num_sun_sensors:4, num_magnetometers:2, num_magnetorquers:3, has_thrusters:true, has_anomaly_detection:true, backup_adcs_mode:"thruster", backup_adcs_pointing_deg:1.0, backup_adcs_switchover_s:60, onboard_autonomy_level:"medium", anomaly_detection_threshold_s:30 },
    eps: { solar_panel_area_m2:11.7, solar_cell_efficiency:0.28, num_solar_arrays:2, battery_capacity_wh:2400, num_battery_cells:60, battery_voltage_v:28, num_power_buses:2, nominal_power_draw_w:1800, peak_power_draw_w:3870, redundant_power_system:true },
    comms: { num_s_band_antennas:2, s_band_gain_dbi:8, s_band_frequency_mhz:2050, s_band_transmit_power_w:10, s_band_max_data_rate_mbps:2, num_x_band_antennas:2, x_band_gain_dbi:25, x_band_frequency_mhz:8100, x_band_transmit_power_w:40, x_band_max_data_rate_mbps:520, receiver_sensitivity_dbm:-115, has_ka_band:false, encryption_strength:"AES-128", has_multi_gnss:true, spread_spectrum:"FHSS", command_authentication:"hmac", modulation_scheme:"BPSK", gps_anti_jam_db:0, fb_ka:false, fb_x:true, fb_s:true, fb_uhf:false },
    thermal: { radiator_area_m2:4.5, radiator_emissivity:0.85, num_heaters:12, heater_power_w:8, mli_layers:15, min_operating_temp_c:-20, max_operating_temp_c:50, battery_min_temp_c:-5, battery_max_temp_c:35, num_heat_pipes:6, thermal_coating:"White Paint" },
    payload: { optical_aperture_m:0.4, optical_focal_length_m:0.82, ground_sample_distance_m:5, data_rate_gbps:0.52, onboard_storage_gb:1410, payload_power_w:1000, pointing_requirement_deg:0.1 },
    ground_segment: { num_ground_stations:5, uplink_frequency_mhz:2050, downlink_frequency_mhz:8100, antenna_gain_dbi:20, ground_tx_power_w:2000, contact_window_min:10, passes_per_day:7, has_crosslinks:false, encryption_level:"AES-128", network_segmentation:"basic" },
    financial: { hourly_downtime_rate:85000, asset_value_usd:380000000, recovery_ops_rate:2500 },
  },
};

function applyPreset(form: FormState, preset: any): FormState {
  const f: FormState = JSON.parse(JSON.stringify(form));
  if (preset.mission_type) f.mission_type = toLabel(MISSION_MAP, preset.mission_type, f.mission_type);

  const a = preset.adcs ?? {};
  f.adcs = {
    ...f.adcs,
    pointing_accuracy: a.pointing_accuracy_deg ?? f.adcs.pointing_accuracy,
    reaction_wheels: a.num_reaction_wheels ?? f.adcs.reaction_wheels,
    wheel_momentum: a.wheel_max_momentum_nms ?? f.adcs.wheel_momentum,
    star_trackers: a.num_star_trackers ?? f.adcs.star_trackers,
    st_accuracy: a.star_tracker_accuracy_arcsec ?? f.adcs.st_accuracy,
    gyroscopes: a.num_gyroscopes ?? f.adcs.gyroscopes,
    gyro_drift: a.gyro_drift_deg_per_hour ?? f.adcs.gyro_drift,
    slew_rate: a.slew_rate_deg_per_sec ?? f.adcs.slew_rate,
    sun_sensors: a.num_sun_sensors ?? f.adcs.sun_sensors,
    magnetometers: a.num_magnetometers ?? f.adcs.magnetometers,
    magnetorquers: a.num_magnetorquers ?? f.adcs.magnetorquers,
    has_thrusters: typeof a.has_thrusters === "boolean" ? a.has_thrusters : f.adcs.has_thrusters,
    anomaly_detection: typeof a.has_anomaly_detection === "boolean" ? a.has_anomaly_detection : f.adcs.anomaly_detection,
    backup_mode: toLabel(BACKUP_MODE_MAP, a.backup_adcs_mode, f.adcs.backup_mode),
    backup_pointing: a.backup_adcs_pointing_deg ?? f.adcs.backup_pointing,
    switchover_time: a.backup_adcs_switchover_s ?? f.adcs.switchover_time,
    autonomy: toLabel(AUTONOMY_MAP, a.onboard_autonomy_level, f.adcs.autonomy),
    detection_threshold: a.anomaly_detection_threshold_s ?? f.adcs.detection_threshold,
  };

  const e = preset.eps ?? {};
  f.eps = {
    ...f.eps,
    solar_panel_area: e.solar_panel_area_m2 ?? f.eps.solar_panel_area,
    cell_efficiency: typeof e.solar_cell_efficiency === "number" ? e.solar_cell_efficiency : f.eps.cell_efficiency,
    solar_arrays: e.num_solar_arrays ?? f.eps.solar_arrays,
    battery_wh: e.battery_capacity_wh ?? f.eps.battery_wh,
    battery_cells: e.num_battery_cells ?? f.eps.battery_cells,
    battery_voltage: e.battery_voltage_v ?? f.eps.battery_voltage,
    power_buses: e.num_power_buses ?? f.eps.power_buses,
    nominal_draw: e.nominal_power_draw_w ?? f.eps.nominal_draw,
    peak_draw: e.peak_power_draw_w ?? f.eps.peak_draw,
    redundant_power: typeof e.redundant_power_system === "boolean" ? e.redundant_power_system : f.eps.redundant_power,
  };

  const c = preset.comms ?? {};
  f.comms = {
    ...f.comms,
    s_antennas: c.num_s_band_antennas ?? f.comms.s_antennas,
    s_gain: c.s_band_gain_dbi ?? f.comms.s_gain,
    s_freq: c.s_band_frequency_mhz ?? f.comms.s_freq,
    s_tx_power: c.s_band_transmit_power_w ?? f.comms.s_tx_power,
    s_data: c.s_band_max_data_rate_mbps ?? f.comms.s_data,
    x_antennas: c.num_x_band_antennas ?? f.comms.x_antennas,
    x_gain: c.x_band_gain_dbi ?? f.comms.x_gain,
    x_freq: c.x_band_frequency_mhz ?? f.comms.x_freq,
    x_tx_power: c.x_band_transmit_power_w ?? f.comms.x_tx_power,
    x_data: c.x_band_max_data_rate_mbps ?? f.comms.x_data,
    rx_sensitivity: c.receiver_sensitivity_dbm ?? f.comms.rx_sensitivity,
    has_ka: typeof c.has_ka_band === "boolean" ? c.has_ka_band : f.comms.has_ka,
    multi_gnss: typeof c.has_multi_gnss === "boolean" ? c.has_multi_gnss : f.comms.multi_gnss,
    encryption: typeof c.encryption_strength === "string" ? c.encryption_strength : f.comms.encryption,
    spread_spectrum: typeof c.spread_spectrum === "string" ? c.spread_spectrum : f.comms.spread_spectrum,
    gps_aj_margin: c.gps_anti_jam_db ?? f.comms.gps_aj_margin,
    modulation: typeof c.modulation_scheme === "string" ? c.modulation_scheme : f.comms.modulation,
    command_auth: toLabel(COMMAND_AUTH_MAP, c.command_authentication, f.comms.command_auth),
    fallback_chain: {
      ka: typeof c.fb_ka === "boolean" ? c.fb_ka : f.comms.fallback_chain.ka,
      x: typeof c.fb_x === "boolean" ? c.fb_x : f.comms.fallback_chain.x,
      s: typeof c.fb_s === "boolean" ? c.fb_s : f.comms.fallback_chain.s,
      uhf: typeof c.fb_uhf === "boolean" ? c.fb_uhf : f.comms.fallback_chain.uhf,
    },
  };

  const t = preset.thermal ?? {};
  f.thermal = {
    ...f.thermal,
    radiator_area: t.radiator_area_m2 ?? f.thermal.radiator_area,
    emissivity: t.radiator_emissivity ?? f.thermal.emissivity,
    heaters: t.num_heaters ?? f.thermal.heaters,
    heater_power: t.heater_power_w ?? f.thermal.heater_power,
    mli_layers: t.mli_layers ?? f.thermal.mli_layers,
    min_op_temp: t.min_operating_temp_c ?? f.thermal.min_op_temp,
    max_op_temp: t.max_operating_temp_c ?? f.thermal.max_op_temp,
    batt_min_temp: t.battery_min_temp_c ?? f.thermal.batt_min_temp,
    batt_max_temp: t.battery_max_temp_c ?? f.thermal.batt_max_temp,
    heat_pipes: t.num_heat_pipes ?? f.thermal.heat_pipes,
    coating: typeof t.thermal_coating === "string" ? t.thermal_coating : f.thermal.coating,
  };

  const p = preset.payload ?? {};
  f.payload = {
    ...f.payload,
    optical_aperture: p.optical_aperture_m ?? f.payload.optical_aperture,
    focal_length: p.optical_focal_length_m ?? f.payload.focal_length,
    gsd: p.ground_sample_distance_m ?? f.payload.gsd,
    data_rate: p.data_rate_gbps ?? f.payload.data_rate,
    storage: p.onboard_storage_gb ?? f.payload.storage,
    power_draw: p.payload_power_w ?? f.payload.power_draw,
    pointing_req: p.pointing_requirement_deg ?? f.payload.pointing_req,
  };

  const g = preset.ground_segment ?? {};
  f.ground_segment = {
    ...f.ground_segment,
    ground_stations: g.num_ground_stations ?? f.ground_segment.ground_stations,
    uplink_freq: g.uplink_frequency_mhz ?? f.ground_segment.uplink_freq,
    downlink_freq: g.downlink_frequency_mhz ?? f.ground_segment.downlink_freq,
    antenna_gain: g.antenna_gain_dbi ?? f.ground_segment.antenna_gain,
    ground_tx_power: g.ground_tx_power_w ?? f.ground_segment.ground_tx_power,
    contact_window: g.contact_window_min ?? f.ground_segment.contact_window,
    passes_per_day: g.passes_per_day ?? f.ground_segment.passes_per_day,
    crosslinks: typeof g.has_crosslinks === "boolean" ? g.has_crosslinks : f.ground_segment.crosslinks,
    encryption: typeof g.encryption_level === "string" ? g.encryption_level : f.ground_segment.encryption,
    net_segmentation: toLabel(NET_SEG_MAP, g.network_segmentation, f.ground_segment.net_segmentation),
  };

  const fin = preset.financial ?? {};
  f.financial = {
    ...f.financial,
    downtime_rate: fin.hourly_downtime_rate ?? f.financial.downtime_rate,
    asset_value: typeof fin.asset_value_usd === "number" ? fin.asset_value_usd / 1_000_000 : f.financial.asset_value,
    recovery_ops_rate: fin.recovery_ops_rate ?? f.financial.recovery_ops_rate,
  };

  return f;
}

// ---------- main ----------
function Configure() {
  const [form, setForm] = useState<FormState>(DEFAULTS);

  // helpers to update nested values
  const setTop = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const setG = <G extends "adcs" | "eps" | "comms" | "thermal" | "payload" | "ground_segment" | "radiation" | "financial">(
    group: G,
    key: keyof FormState[G],
    value: any,
  ) => setForm((f) => ({ ...f, [group]: { ...(f[group] as object), [key]: value } }));
  const setFallback = (key: "ka" | "x" | "s" | "uhf", value: boolean) =>
    setForm((f) => ({
      ...f,
      comms: { ...f.comms, fallback_chain: { ...f.comms.fallback_chain, [key]: value } },
    }));

  // numeric input handler: keep as number; allow empty -> 0
  const num = (v: string) => (v === "" || v === "-" ? 0 : Number(v));

  const [configs, setConfigs] = useState<Array<{ name: string; created_at: string; config: Record<string, unknown> }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [configName, setConfigName] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [loadingTarget, setLoadingTarget] = useState<string | null>(null);
  const { activeName, setActiveSatellite } = useActiveSatellite();

  // Sync current form to shared active-satellite store on any change
  useEffect(() => {
    const name = configName.trim() || selectedTarget || "Custom Satellite";
    setActiveSatellite(name, serializeConfig(form));
  }, [form, configName, selectedTarget, setActiveSatellite]);

  const loadConfigs = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await apiFetch("/api/configs");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setConfigs(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const handleDelete = async (name: string) => {
    if (!window.confirm(`Delete config '${name}'?`)) return;
    try {
      const res = await apiFetch(`/api/configs/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || "Failed");
      setConfigs((prev) => prev.filter((c) => c.name !== name));
      toast.success("Configuration deleted");
    } catch (err) {
      toast.error("Failed to delete configuration", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleLoad = (saved: { name: string; config: Record<string, unknown> }) => {
    const merged = mergeConfig(saved.config);
    setForm(merged);
    setConfigName(saved.name);
    toast.success(`Loaded ${saved.name}`);
  };

  const handleSave = async () => {
    const name = configName.trim();
    if (!name) {
      toast.error("Enter a config name");
      return;
    }
    const config = serializeConfig(form);
    setSaving(true);
    try {
      const res = await apiFetch("/api/configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, config }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || "Failed");
      toast.success("Configuration saved");
      await loadConfigs();
    } catch (err) {
      toast.error("Failed to save configuration", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTargetSelect = async (target: { name: string; norad_id: number }) => {
    setLoadingTarget(target.name);
    try {
      const res = await apiFetch(`/api/satellite/${target.norad_id}/orbital_params`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const preset = SATELLITE_PRESETS[target.norad_id];
      setForm((f) => {
        const base = preset ? applyPreset(f, preset) : f;
        return {
          ...base,
          altitude: typeof data.altitude_km === "number" ? Math.round(data.altitude_km * 100) / 100 : base.altitude,
          inclination: typeof data.inclination_deg === "number" ? Math.round(data.inclination_deg * 10) / 10 : base.inclination,
          orbit_type: typeof data.orbit_type === "string" ? data.orbit_type : base.orbit_type,
          norad_id: target.norad_id,
        };
      });
      setSelectedTarget(target.name);
      const displayName = data.tle_name ?? target.name;
      if (preset) {
        toast.success(`Loaded full config: ${displayName}`);
      } else {
        toast.success(`Loaded orbital data: ${displayName}`);
      }
    } catch {
      toast.error("Failed to fetch orbital data");
    } finally {
      setLoadingTarget(null);
    }
  };

  const adcs = form.adcs;
  const eps = form.eps;
  const comms = form.comms;
  const thermal = form.thermal;
  const payload = form.payload;
  const gs = form.ground_segment;

  return (
    <AppShell title="Satellite Configuration" subtitle="ASSET PROFILE BUILDER · v3">
      {activeName && (
        <div className="mb-3 text-[10px] font-mono text-success/90 tracking-wider">
          ACTIVE FOR SIMULATION: {activeName}
        </div>
      )}
      <div className="mb-4">
        <OrbitalTrack
          noradId={form.norad_id && form.norad_id > 0 ? form.norad_id : 39634}
          satelliteName={
            selectedTarget ||
            activeName ||
            (form.norad_id && form.norad_id > 0
              ? `NORAD ${form.norad_id}`
              : "Sentinel-1A")
          }
        />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-4">
        {/* LEFT: Saved + TLE */}
        <div className="space-y-4">
          <Panel
            title="Target Selection"
            action={
              <span className="text-[10px] font-mono text-muted-foreground">
                {TARGETS.length} TARGETS
              </span>
            }
          >
            <div className="divide-y divide-border">
              {TARGETS.map((t) => {
                const isSelected = selectedTarget === t.name;
                const isLoading = loadingTarget === t.name;
                return (
                  <button
                    key={t.name}
                    onClick={() => handleTargetSelect(t)}
                    disabled={isLoading}
                    className={`w-full text-left p-3.5 flex items-center gap-2.5 cursor-pointer disabled:opacity-60 ${
                      isSelected
                        ? "bg-primary/10 border-l-2 border-primary"
                        : "hover:bg-surface-2/50 border-l-2 border-transparent"
                    }`}
                  >
                    <div className="h-8 w-8 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                      <span className="text-[10px] font-mono font-bold">TGT</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold font-mono truncate">{t.name}</div>
                    </div>
                    {isLoading ? (
                      <span className="text-[10px] font-mono text-muted-foreground">Loading…</span>
                    ) : (
                      <span className="text-[10px] font-mono text-muted-foreground">{t.norad_id}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel
            title="Saved Configurations"
            action={
              <span className="text-[10px] font-mono text-muted-foreground">
                {configs.length} ASSETS
              </span>
            }
          >
            {loading && (
              <div className="p-3.5 text-[10px] font-mono text-muted-foreground">
                Loading configurations…
              </div>
            )}
            {error && (
              <div className="p-3.5 text-[10px] font-mono text-red-400">
                Failed to load configurations
              </div>
            )}
            {!loading && !error && (
              <div className="divide-y divide-border">
                {configs.map((s) => (
                  <div key={s.name} className="p-3.5 hover:bg-surface-2/50">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                        <span className="text-[10px] font-mono font-bold">SAT</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold font-mono truncate">{s.name}</div>
                        <div className="text-[10px] font-mono text-muted-foreground truncate">
                          {s.config?.mission_type ? String(s.config.mission_type) : new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                      <div className="panel-2 px-2 py-1">
                        <div className="text-muted-foreground">ENC</div>
                        <div>{String((s.config as any)?.comms?.encryption_strength ?? "—")}</div>
                      </div>
                      <div className="panel-2 px-2 py-1">
                        <div className="text-muted-foreground">RW</div>
                        <div>{String((s.config as any)?.adcs?.num_reaction_wheels ?? "—")}</div>
                      </div>
                      <div className="panel-2 px-2 py-1">
                        <div className="text-muted-foreground">MOD</div>
                        <div>{String((s.config as any)?.comms?.modulation_scheme ?? "—")}</div>
                      </div>
                    </div>
                    <div className="mt-2.5 flex gap-2">
                      <button
                        onClick={() => handleLoad(s)}
                        className="flex-1 text-xs py-1.5 rounded-md bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleDelete(s.name)}
                        className="px-3 py-1.5 rounded-md panel-2 text-muted-foreground hover:text-critical hover:border-critical/40"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            title="Custom TLE"
            action={
              <span className="text-[10px] font-mono text-muted-foreground">
                TWO-LINE ELEMENT SET
              </span>
            }
          >
            <div className="p-4 space-y-3">
              <Field label="Name (optional)">
                <Input placeholder="CUSTOM-SAT-01" />
              </Field>
              <Field label="TLE Line 1">
                <textarea
                  rows={2}
                  placeholder="1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9994"
                  className="w-full bg-input border border-border rounded-md px-2.5 py-1.5 text-[10px] font-mono focus:outline-none focus:border-primary/60 resize-none"
                />
              </Field>
              <Field label="TLE Line 2">
                <textarea
                  rows={2}
                  placeholder="2 25544  51.6400 337.6640 0007417  35.4720  68.5060 15.49309239433400"
                  className="w-full bg-input border border-border rounded-md px-2.5 py-1.5 text-[10px] font-mono focus:outline-none focus:border-primary/60 resize-none"
                />
              </Field>
              <div className="flex gap-2 pt-1">
                <button className="flex-1 text-xs py-2 rounded-md bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 font-semibold">
                  Load Satellite
                </button>
                <button className="px-4 text-xs py-2 rounded-md panel-2 hover:border-border text-muted-foreground">
                  Cancel
                </button>
              </div>
            </div>
          </Panel>
        </div>

        {/* RIGHT: Form */}
        <div className="space-y-3">
          <div className="panel rounded-lg p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
                Mission Type
              </div>
            </div>
            <div className="w-72">
              <Select
                value={form.mission_type}
                onChange={(v) => setTop("mission_type", v)}
                options={["Earth Observation", "Communications", "Navigation", "Scientific"]}
              />
            </div>
          </div>

          <Section title="Orbital Parameters" accent="grey">
            <Field label="Altitude (km)">
              <Input type="number" value={form.altitude} min={200} max={40000} onChange={(e) => setTop("altitude", num(e.target.value))} />
            </Field>
            <Field label="Inclination (deg)">
              <Input type="number" value={form.inclination} step={0.1} onChange={(e) => setTop("inclination", num(e.target.value))} />
            </Field>
          </Section>

          <Section title="ADCS" accent="cyan">
            <Field label="Pointing Accuracy (deg)"><Input type="number" value={adcs.pointing_accuracy} step={0.01} onChange={(e) => setG("adcs", "pointing_accuracy", num(e.target.value))} /></Field>
            <Field label="Reaction Wheels"><Input type="number" value={adcs.reaction_wheels} onChange={(e) => setG("adcs", "reaction_wheels", num(e.target.value))} /></Field>
            <Field label="Star Trackers"><Input type="number" value={adcs.star_trackers} onChange={(e) => setG("adcs", "star_trackers", num(e.target.value))} /></Field>
            <Field label="ST Accuracy (arcsec)"><Input type="number" value={adcs.st_accuracy} onChange={(e) => setG("adcs", "st_accuracy", num(e.target.value))} /></Field>
            <Field label="Gyroscopes"><Input type="number" value={adcs.gyroscopes} onChange={(e) => setG("adcs", "gyroscopes", num(e.target.value))} /></Field>
            <Field label="Gyro Drift (deg/hr)"><Input type="number" value={adcs.gyro_drift} step={0.1} onChange={(e) => setG("adcs", "gyro_drift", num(e.target.value))} /></Field>
            <Field label="Slew Rate (deg/s)"><Input type="number" value={adcs.slew_rate} step={0.1} onChange={(e) => setG("adcs", "slew_rate", num(e.target.value))} /></Field>
            <Field label="Wheel Momentum (Nms)"><Input type="number" value={adcs.wheel_momentum} onChange={(e) => setG("adcs", "wheel_momentum", num(e.target.value))} /></Field>
            <Field label="Sun Sensors"><Input type="number" value={adcs.sun_sensors} onChange={(e) => setG("adcs", "sun_sensors", num(e.target.value))} /></Field>
            <Field label="Magnetometers"><Input type="number" value={adcs.magnetometers} onChange={(e) => setG("adcs", "magnetometers", num(e.target.value))} /></Field>
            <Field label="Magnetorquers"><Input type="number" value={adcs.magnetorquers} onChange={(e) => setG("adcs", "magnetorquers", num(e.target.value))} /></Field>
            <div className="col-span-2 md:col-span-3 grid grid-cols-2 gap-3">
              <CheckRow checked={adcs.has_thrusters} onChange={(v) => setG("adcs", "has_thrusters", v)} label="Has Thrusters" />
              <CheckRow checked={adcs.anomaly_detection} onChange={(v) => setG("adcs", "anomaly_detection", v)} label="Anomaly Detection" />
            </div>
            <Field label="Backup ADCS Mode">
              <Select value={adcs.backup_mode} onChange={(v) => setG("adcs", "backup_mode", v)} options={["None", "Thruster-Based", "Magnetorquer-Based"]} />
            </Field>
            {adcs.backup_mode !== "None" && (
              <Field label="Backup Pointing (deg)"><Input type="number" value={adcs.backup_pointing} step={0.1} onChange={(e) => setG("adcs", "backup_pointing", num(e.target.value))} /></Field>
            )}
            {adcs.backup_mode === "Thruster-Based" && (
              <Field label="Switchover Time (s)"><Input type="number" value={adcs.switchover_time} onChange={(e) => setG("adcs", "switchover_time", num(e.target.value))} /></Field>
            )}
            <Field label="Onboard Autonomy">
              <Select value={adcs.autonomy} onChange={(v) => setG("adcs", "autonomy", v)} options={["Low", "Medium", "High"]} />
            </Field>
            {adcs.autonomy !== "Low" && (
              <Field label="Detection Threshold (s)"><Input type="number" value={adcs.detection_threshold} onChange={(e) => setG("adcs", "detection_threshold", num(e.target.value))} /></Field>
            )}
            <Field label="Propellant Remaining (kg)"><Input type="number" value={adcs.propellant} onChange={(e) => setG("adcs", "propellant", num(e.target.value))} /></Field>
            <Field label="Specific Impulse (s)"><Input type="number" value={adcs.isp} onChange={(e) => setG("adcs", "isp", num(e.target.value))} /></Field>
          </Section>

          <Section title="EPS" accent="yellow">
            <Field label="Solar Panel Area (m²)"><Input type="number" value={eps.solar_panel_area} step={0.1} onChange={(e) => setG("eps", "solar_panel_area", num(e.target.value))} /></Field>
            <Field label="Cell Efficiency"><Input type="number" value={eps.cell_efficiency} step={0.01} onChange={(e) => setG("eps", "cell_efficiency", num(e.target.value))} /></Field>
            <Field label="Solar Arrays"><Input type="number" value={eps.solar_arrays} onChange={(e) => setG("eps", "solar_arrays", num(e.target.value))} /></Field>
            <Field label="Battery (Wh)"><Input type="number" value={eps.battery_wh} onChange={(e) => setG("eps", "battery_wh", num(e.target.value))} /></Field>
            <Field label="Battery Cells"><Input type="number" value={eps.battery_cells} onChange={(e) => setG("eps", "battery_cells", num(e.target.value))} /></Field>
            <Field label="Battery Voltage (V)"><Input type="number" value={eps.battery_voltage} onChange={(e) => setG("eps", "battery_voltage", num(e.target.value))} /></Field>
            <Field label="Power Buses"><Input type="number" value={eps.power_buses} onChange={(e) => setG("eps", "power_buses", num(e.target.value))} /></Field>
            <Field label="Nominal Draw (W)"><Input type="number" value={eps.nominal_draw} onChange={(e) => setG("eps", "nominal_draw", num(e.target.value))} /></Field>
            <Field label="Peak Draw (W)"><Input type="number" value={eps.peak_draw} onChange={(e) => setG("eps", "peak_draw", num(e.target.value))} /></Field>
            <div className="col-span-2 md:col-span-3">
              <CheckRow checked={eps.redundant_power} onChange={(v) => setG("eps", "redundant_power", v)} label="Redundant Power" />
            </div>
          </Section>

          <Section title="Comms" accent="green">
            <Field label="S-Band Antennas"><Input type="number" value={comms.s_antennas} onChange={(e) => setG("comms", "s_antennas", num(e.target.value))} /></Field>
            <Field label="S-Band Gain (dBi)"><Input type="number" value={comms.s_gain} step={0.1} onChange={(e) => setG("comms", "s_gain", num(e.target.value))} /></Field>
            <Field label="S-Band Freq (MHz)"><Input type="number" value={comms.s_freq} onChange={(e) => setG("comms", "s_freq", num(e.target.value))} /></Field>
            <Field label="S-Band Tx Power (W)"><Input type="number" value={comms.s_tx_power} step={0.1} onChange={(e) => setG("comms", "s_tx_power", num(e.target.value))} /></Field>
            <Field label="S-Band Data (Mbps)"><Input type="number" value={comms.s_data} onChange={(e) => setG("comms", "s_data", num(e.target.value))} /></Field>
            <Field label="X-Band Antennas"><Input type="number" value={comms.x_antennas} onChange={(e) => setG("comms", "x_antennas", num(e.target.value))} /></Field>
            <Field label="X-Band Gain (dBi)"><Input type="number" value={comms.x_gain} onChange={(e) => setG("comms", "x_gain", num(e.target.value))} /></Field>
            <Field label="X-Band Freq (MHz)"><Input type="number" value={comms.x_freq} onChange={(e) => setG("comms", "x_freq", num(e.target.value))} /></Field>
            <Field label="X-Band Tx Power (W)"><Input type="number" value={comms.x_tx_power} onChange={(e) => setG("comms", "x_tx_power", num(e.target.value))} /></Field>
            <Field label="X-Band Data (Mbps)"><Input type="number" value={comms.x_data} onChange={(e) => setG("comms", "x_data", num(e.target.value))} /></Field>
            <Field label="Rx Sensitivity (dBm)"><Input type="number" value={comms.rx_sensitivity} onChange={(e) => setG("comms", "rx_sensitivity", num(e.target.value))} /></Field>
            <div className="col-span-2 md:col-span-3 grid grid-cols-2 gap-3">
              <CheckRow checked={comms.has_ka} onChange={(v) => setG("comms", "has_ka", v)} label="Has Ka-Band" />
              <CheckRow checked={comms.multi_gnss} onChange={(v) => setG("comms", "multi_gnss", v)} label="Multi-GNSS" />
            </div>
            <Field label="Encryption">
              <Select value={comms.encryption} onChange={(v) => setG("comms", "encryption", v)} options={["AES-256", "AES-128", "None"]} />
            </Field>
            <Field label="Spread Spectrum">
              <Select value={comms.spread_spectrum} onChange={(v) => setG("comms", "spread_spectrum", v)} options={["None", "FHSS", "DSSS"]} />
            </Field>
            <Field label="GPS Anti-Jam Margin (dB)"><Input type="number" value={comms.gps_aj_margin} max={30} onChange={(e) => setG("comms", "gps_aj_margin", num(e.target.value))} /></Field>
            <Field label="Modulation Scheme">
              <Select value={comms.modulation} onChange={(v) => setG("comms", "modulation", v)} options={["BPSK", "QPSK", "8PSK"]} />
            </Field>
            <Field label="Command Authentication">
              <Select value={comms.command_auth} onChange={(v) => setG("comms", "command_auth", v)} options={["None", "Seq Counter", "HMAC-SHA256", "Digital Sig"]} />
            </Field>
            <div className="col-span-2 md:col-span-3 panel-2 p-3 rounded-md">
              <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground mb-2">
                Frequency Fallback Chain · Ordered Ka→X→S→UHF (checked = included)
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <CheckRow checked={comms.fallback_chain.ka} onChange={(v) => setFallback("ka", v)} label="Ka-Band" />
                <CheckRow checked={comms.fallback_chain.x} onChange={(v) => setFallback("x", v)} label="X-Band" />
                <CheckRow checked={comms.fallback_chain.s} onChange={(v) => setFallback("s", v)} label="S-Band" />
                <CheckRow checked={comms.fallback_chain.uhf} onChange={(v) => setFallback("uhf", v)} label="UHF" />
              </div>
            </div>
          </Section>

          <Section title="Thermal" accent="orange">
            <Field label="Radiator Area (m²)"><Input type="number" value={thermal.radiator_area} step={0.1} onChange={(e) => setG("thermal", "radiator_area", num(e.target.value))} /></Field>
            <Field label="Emissivity"><Input type="number" value={thermal.emissivity} step={0.01} onChange={(e) => setG("thermal", "emissivity", num(e.target.value))} /></Field>
            <Field label="Heaters"><Input type="number" value={thermal.heaters} onChange={(e) => setG("thermal", "heaters", num(e.target.value))} /></Field>
            <Field label="Heater Power (W)"><Input type="number" value={thermal.heater_power} onChange={(e) => setG("thermal", "heater_power", num(e.target.value))} /></Field>
            <Field label="MLI Layers"><Input type="number" value={thermal.mli_layers} onChange={(e) => setG("thermal", "mli_layers", num(e.target.value))} /></Field>
            <Field label="Min Op Temp (°C)"><Input type="number" value={thermal.min_op_temp} onChange={(e) => setG("thermal", "min_op_temp", num(e.target.value))} /></Field>
            <Field label="Max Op Temp (°C)"><Input type="number" value={thermal.max_op_temp} onChange={(e) => setG("thermal", "max_op_temp", num(e.target.value))} /></Field>
            <Field label="Batt Min Temp (°C)"><Input type="number" value={thermal.batt_min_temp} onChange={(e) => setG("thermal", "batt_min_temp", num(e.target.value))} /></Field>
            <Field label="Batt Max Temp (°C)"><Input type="number" value={thermal.batt_max_temp} onChange={(e) => setG("thermal", "batt_max_temp", num(e.target.value))} /></Field>
            <Field label="Heat Pipes"><Input type="number" value={thermal.heat_pipes} onChange={(e) => setG("thermal", "heat_pipes", num(e.target.value))} /></Field>
            <Field label="Coating">
              <Select value={thermal.coating} onChange={(v) => setG("thermal", "coating", v)} options={["White Paint", "OSR", "Gold Foil"]} />
            </Field>
          </Section>

          <Section title="Payload" accent="purple">
            <Field label="Optical Aperture (m)"><Input type="number" value={payload.optical_aperture} step={0.1} onChange={(e) => setG("payload", "optical_aperture", num(e.target.value))} /></Field>
            <Field label="Focal Length (m)"><Input type="number" value={payload.focal_length} step={0.1} onChange={(e) => setG("payload", "focal_length", num(e.target.value))} /></Field>
            <Field label="GSD (m)"><Input type="number" value={payload.gsd} step={0.1} onChange={(e) => setG("payload", "gsd", num(e.target.value))} /></Field>
            <Field label="Data Rate (Gbps)"><Input type="number" value={payload.data_rate} step={0.1} onChange={(e) => setG("payload", "data_rate", num(e.target.value))} /></Field>
            <Field label="Storage (GB)"><Input type="number" value={payload.storage} onChange={(e) => setG("payload", "storage", num(e.target.value))} /></Field>
            <Field label="Power Draw (W)"><Input type="number" value={payload.power_draw} onChange={(e) => setG("payload", "power_draw", num(e.target.value))} /></Field>
            <Field label="Pointing Req (deg)"><Input type="number" value={payload.pointing_req} step={0.01} onChange={(e) => setG("payload", "pointing_req", num(e.target.value))} /></Field>
          </Section>

          <Section title="Ground Segment" accent="red">
            <Field label="Ground Stations"><Input type="number" value={gs.ground_stations} onChange={(e) => setG("ground_segment", "ground_stations", num(e.target.value))} /></Field>
            <Field label="Uplink Freq (MHz)"><Input type="number" value={gs.uplink_freq} onChange={(e) => setG("ground_segment", "uplink_freq", num(e.target.value))} /></Field>
            <Field label="Downlink Freq (MHz)"><Input type="number" value={gs.downlink_freq} onChange={(e) => setG("ground_segment", "downlink_freq", num(e.target.value))} /></Field>
            <Field label="Antenna Gain (dBi)"><Input type="number" value={gs.antenna_gain} onChange={(e) => setG("ground_segment", "antenna_gain", num(e.target.value))} /></Field>
            <Field label="Ground Tx Power (W)"><Input type="number" value={gs.ground_tx_power} onChange={(e) => setG("ground_segment", "ground_tx_power", num(e.target.value))} /></Field>
            <Field label="Contact Window (min)"><Input type="number" value={gs.contact_window} onChange={(e) => setG("ground_segment", "contact_window", num(e.target.value))} /></Field>
            <Field label="Passes/Day"><Input type="number" value={gs.passes_per_day} onChange={(e) => setG("ground_segment", "passes_per_day", num(e.target.value))} /></Field>
            <div className="col-span-2 md:col-span-3">
              <CheckRow checked={gs.crosslinks} onChange={(v) => setG("ground_segment", "crosslinks", v)} label="Has Crosslinks" />
            </div>
            <Field label="Encryption">
              <Select value={gs.encryption} onChange={(v) => setG("ground_segment", "encryption", v)} options={["AES-256", "AES-128", "None"]} />
            </Field>
            <Field label="Net Segmentation">
              <Select value={gs.net_segmentation} onChange={(v) => setG("ground_segment", "net_segmentation", v)} options={["Basic", "None", "Zero-Trust"]} />
            </Field>
            <Field label="Firmware Verification">
              <Select value={gs.firmware_verification} onChange={(v) => setG("ground_segment", "firmware_verification", v)} options={["Software Signature", "Hardware Root of Trust", "No Verification"]} />
            </Field>
            <Field label="GS Region">
              <Select value={gs.region} onChange={(v) => setG("ground_segment", "region", v)} options={["Global Distribution", "North America", "Europe", "Middle East", "Asia Pacific"]} />
            </Field>
          </Section>

          <Section title="Radiation Hardening" accent="darkpurple">
            <Field label="Total Ionizing Dose (krad)"><Input type="number" value={form.radiation.tid_krad} onChange={(e) => setG("radiation", "tid_krad", num(e.target.value))} /></Field>
          </Section>

          <Section title="Financial Parameters" accent="darkgreen">
            <Field label="Downtime Rate ($/hr)"><Input type="number" value={form.financial.downtime_rate} onChange={(e) => setG("financial", "downtime_rate", num(e.target.value))} /></Field>
            <Field label="Asset Value ($M)"><Input type="number" value={form.financial.asset_value} onChange={(e) => setG("financial", "asset_value", num(e.target.value))} /></Field>
            <Field label="Recovery Ops Rate ($/hr)"><Input type="number" value={form.financial.recovery_ops_rate} onChange={(e) => setG("financial", "recovery_ops_rate", num(e.target.value))} /></Field>
          </Section>

          <div className="flex items-center gap-2 pt-2">
            <div className="w-64">
              <Input
                placeholder="Config Name"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-success/10 border border-success/50 text-success text-sm font-semibold hover:bg-success/20 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Config"}
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md panel-2 text-sm hover:border-primary/40">
              Import TLE / JSON
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
