import type { AideonApi } from './lib/types';

declare global {
  interface Window {
    aideon: AideonApi;
    __TAURI__?: { invoke<T = unknown>(cmd: string, payload?: Record<string, unknown>): Promise<T> };
  }
  var aideon: AideonApi;
}
