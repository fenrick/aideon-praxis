import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { EngineId } from './engine';

export interface Licensing {
  /** Whether the given engine is licensed and may contribute to the host. */
  readonly licensed: (engine: EngineId) => boolean;
}

/**
 * Default entitlements until a real source (host IPC / Themis) is wired. Praxis
 * is the meaning engine and is always present; others light up when licensed.
 */
const DEFAULT_LICENSED: ReadonlyMap<EngineId, boolean> = new Map([['praxis', true]]);

/**
 * Build the entitlement lookup from the defaults plus any overrides.
 * @param overrides - Per-engine entitlement overrides.
 */
function buildLicensing(overrides?: Partial<Record<EngineId, boolean>>): Licensing {
  const table = new Map(DEFAULT_LICENSED);
  for (const [engine, value] of Object.entries(overrides ?? {})) {
    table.set(engine as EngineId, value);
  }
  return { licensed: (engine) => table.get(engine) === true };
}

const LicensingContext = createContext<Licensing | undefined>(undefined);

interface LicensingProviderProperties {
  readonly children: ReactNode;
  /** Override entitlements (tests, previews). Merges over the defaults. */
  readonly licensed?: Partial<Record<EngineId, boolean>>;
}

/**
 * Provide engine entitlements to the host platform.
 * @param root0 - Provider props.
 * @param root0.children - Subtree.
 * @param root0.licensed - Optional entitlement overrides.
 */
export function LicensingProvider({ children, licensed }: LicensingProviderProperties) {
  const value = useMemo<Licensing>(() => buildLicensing(licensed), [licensed]);

  return <LicensingContext.Provider value={value}>{children}</LicensingContext.Provider>;
}

/**
 * Read engine entitlements. Falls back to the defaults outside a provider.
 */
export function useLicensing(): Licensing {
  return useContext(LicensingContext) ?? buildLicensing();
}
