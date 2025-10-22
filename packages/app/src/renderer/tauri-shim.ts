// Define a minimal window.aideon when running under Tauri so the UI can boot
// without Electron preload. This keeps renderer free of backend specifics.
import { tauriInvoke } from '../host/tauri-invoke';
import { logInfo, logDebug, logError } from '../host/logger';

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
if ((globalThis as { aideon?: unknown }).aideon === undefined) {
  // Always install a bridge object; methods will throw if Tauri isn't available yet.
  logInfo('renderer: installing tauri-shim bridge');
  (globalThis as Window).aideon = {
    version: 'tauri-shim',
    stateAt: async (arguments_) => {
      logDebug(`renderer: invoking temporal_state_at asOf=${arguments_.asOf}`);
      const result = await tauriInvoke<{
        asOf: string;
        scenario: string | null;
        confidence: number | null;
        nodes: number;
        edges: number;
      }>('temporal_state_at', {
        // Send both naming conventions for host compatibility
        as_of: arguments_.asOf,
        asOf: arguments_.asOf,
        scenario: arguments_.scenario ?? null,
        confidence: arguments_.confidence ?? null,
      }).catch((error: unknown) => {
        logError('renderer: invoke temporal_state_at failed', error);
        throw error;
      });
      return result;
    },
  };
}
