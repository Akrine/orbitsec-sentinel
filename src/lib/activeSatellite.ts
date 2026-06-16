import { createContext, createElement, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type ActiveSatelliteConfig = Record<string, unknown>;

type Ctx = {
  activeConfig: ActiveSatelliteConfig | null;
  activeName: string | null;
  setActiveSatellite: (name: string, config: ActiveSatelliteConfig) => void;
};

const ActiveSatelliteContext = createContext<Ctx | null>(null);

export function ActiveSatelliteProvider({ children }: { children: ReactNode }) {
  const [activeConfig, setConfig] = useState<ActiveSatelliteConfig | null>(null);
  const [activeName, setName] = useState<string | null>(null);

  const setActiveSatellite = useCallback((name: string, config: ActiveSatelliteConfig) => {
    setName(name);
    setConfig(config);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ activeConfig, activeName, setActiveSatellite }),
    [activeConfig, activeName, setActiveSatellite],
  );

  return createElement(ActiveSatelliteContext.Provider, { value }, children);
}

export function useActiveSatellite(): Ctx {
  const ctx = useContext(ActiveSatelliteContext);
  if (!ctx) {
    throw new Error("useActiveSatellite must be used within ActiveSatelliteProvider");
  }
  return ctx;
}
