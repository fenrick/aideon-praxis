// Define a minimal window.aideon when running under Tauri so the UI can boot
// without Electron preload. This keeps renderer free of backend specifics.
import { hasTauri, tauriInvoke } from '../host/tauri-invoke';

declare global {
  interface Window {
    aideon?: {
      version: string;
      stateAt: (arguments_: { asOf: string; scenario?: string; confidence?: number }) => Promise<{
        asOf: string;
        scenario: string | null;
        confidence: number | null;
        nodes: number;
        edges: number;
      }>;
    };
  }
}

// Only define when not already supplied by a preload (Electron) or other bridge
if (hasTauri() && (globalThis as { aideon?: unknown }).aideon === undefined) {
  (globalThis as Window).aideon = {
    version: 'tauri',
    stateAt: async (arguments_) => {
      const result = await tauriInvoke<{
        asOf: string;
        scenario: string | null;
        confidence: number | null;
        nodes: number;
        edges: number;
      }>('temporal_state_at', {
        as_of: arguments_.asOf,
        scenario: arguments_.scenario ?? null,
        confidence: arguments_.confidence ?? null,
      });
      return result;
    },
  };
}
