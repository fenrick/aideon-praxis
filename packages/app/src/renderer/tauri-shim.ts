// Define a minimal window.aideon when running under Tauri so the UI can boot
// without Electron preload. This keeps renderer free of backend specifics.
import { invoke } from '@tauri-apps/api/core';
import { debug, error, info } from '@tauri-apps/plugin-log';

// Only define when not already supplied by a preload (Electron) or other bridge
if ((globalThis as { aideon?: unknown }).aideon === undefined) {
  // Always install a bridge object; methods will throw if Tauri isn't available yet.
  void info('renderer: installing tauri-shim bridge');
  interface AideonApi {
    version: string;
    stateAt: (arguments_: { asOf: string; scenario?: string; confidence?: number }) => Promise<{
      asOf: string;
      scenario: string | null;
      confidence: number | null;
      nodes: number;
      edges: number;
    }>;
  }
  (globalThis as unknown as { aideon: AideonApi }).aideon = {
    version: 'tauri-shim',
    stateAt: async (arguments_) => {
      void debug('renderer: invoking temporal_state_at asOf=${arguments_.asOf}');
      const result = await invoke<{
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
      }).catch((error_: unknown) => {
        void error('renderer: invoke temporal_state_at failed${error_.message}');
        throw error_;
      });
      return result;
    },
  };
}
