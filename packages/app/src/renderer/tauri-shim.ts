// Define a minimal window.aideon when running under Tauri so the UI can boot
// without Electron preload. This keeps renderer free of backend specifics.
import { invoke } from '@tauri-apps/api/core';
import { debug, error, info } from '@tauri-apps/plugin-log';

type Logger = (message: string) => Promise<void>;

const logSafely = (logger: Logger, message: string) => {
  logger(message).catch((loggingError: unknown) => {
    if (import.meta.env.DEV) {
      console.warn('renderer: log fallback', loggingError);
    }
  });
};

// Only define when not already supplied by a preload (Electron) or other bridge
if ((globalThis as { aideon?: unknown }).aideon === undefined) {
  // Always install a bridge object; methods will throw if Tauri isn't available yet.
  logSafely(info, 'renderer: installing tauri-shim bridge');
  interface AideonApi {
    version: string;
    stateAt: (arguments_: { asOf: string; scenario?: string; confidence?: number }) => Promise<{
      asOf: string;
      scenario: string | null;
      confidence: number | null;
      nodes: number;
      edges: number;
    }>;
    openSettings: () => Promise<void>;
    openAbout: () => Promise<void>;
    openStatus: () => Promise<void>;
  }
  (globalThis as unknown as { aideon: AideonApi }).aideon = {
    version: 'tauri-shim',
    stateAt: async (arguments_) => {
      logSafely(debug, `renderer: invoking temporal_state_at asOf=${arguments_.asOf}`);
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
        const maybe = error_ as { message?: string } | undefined;
        const message = typeof maybe?.message === 'string' ? maybe.message : String(error_);
        logSafely(error, `renderer: invoke temporal_state_at failed: ${message}`);
        throw error_;
      });
      return result;
    },
    openSettings: async () => {
      await invoke('open_settings').catch((error_: unknown) => {
        const maybe = error_ as { message?: string } | undefined;
        const message = typeof maybe?.message === 'string' ? maybe.message : String(error_);
        logSafely(error, `renderer: invoke open_settings failed: ${message}`);
        throw error_;
      });
    },
    openAbout: async () => {
      await invoke('open_about').catch((error_: unknown) => {
        const maybe = error_ as { message?: string } | undefined;
        const message = typeof maybe?.message === 'string' ? maybe.message : String(error_);
        logSafely(error, `renderer: invoke open_about failed: ${message}`);
        throw error_;
      });
    },
    openStatus: async () => {
      await invoke('open_status').catch((error_: unknown) => {
        const maybe = error_ as { message?: string } | undefined;
        const message = typeof maybe?.message === 'string' ? maybe.message : String(error_);
        logSafely(error, `renderer: invoke open_status failed: ${message}`);
        throw error_;
      });
    },
  };
}
