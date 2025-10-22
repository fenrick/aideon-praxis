/*
 * Minimal Tauri invoke wrapper behind feature detection.
 * Does not wire any renderer↔host logic yet; safe no-op in Electron.
 */
import { logDebug, logError } from './logger';

export class TauriNotAvailableError extends Error {
  constructor() {
    super('Tauri runtime not available');
    this.name = 'TauriNotAvailableError';
  }
}

export function tauriInvoke<T = unknown>(
  cmd: string,
  payload?: Record<string, unknown>,
): Promise<T> {
  logDebug(`renderer: tauriInvoke ${cmd}`);
  // Prefer the official API package if present; it doesn’t require global injection.
  return import('@tauri-apps/api/core')
    .then((m) => m.invoke<T>(cmd, payload ?? {}))
    .catch((error: unknown) => {
      logError(`renderer: tauriInvoke primary path failed for ${cmd}`, error);
      // Fallback to global __TAURI__ if the API package isn’t available or not in Tauri.
      const g = globalThis as unknown as {
        __TAURI__?: { invoke<T>(c: string, p?: Record<string, unknown>): Promise<T> };
      };
      const api = g.__TAURI__;
      if (api && typeof api.invoke === 'function') return api.invoke<T>(cmd, payload ?? {});
      throw new TauriNotAvailableError();
    });
}

export const __test__ = {} as const;
