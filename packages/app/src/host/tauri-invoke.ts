/*
 * Minimal Tauri invoke wrapper behind feature detection.
 * Does not wire any renderer↔host logic yet; safe no-op in Electron.
 */

export class TauriNotAvailableError extends Error {
  constructor() {
    super('Tauri runtime not available');
    this.name = 'TauriNotAvailableError';
  }
}

interface TauriApi {
  invoke<T>(cmd: string, payload?: Record<string, unknown>): Promise<T>;
}

function getTauri(): TauriApi | undefined {
  const g = globalThis as unknown as { __TAURI__?: TauriApi };
  const api = g.__TAURI__;
  if (!api || typeof api.invoke !== 'function') return undefined;
  return api;
}

export function hasTauri(): boolean {
  return Boolean(getTauri());
}

export function tauriInvoke<T = unknown>(
  cmd: string,
  payload?: Record<string, unknown>,
): Promise<T> {
  const api = getTauri();
  if (!api) return Promise.reject(new TauriNotAvailableError());
  return api.invoke<T>(cmd, payload ?? {});
}

export const __test__ = { hasTauri } as const;
