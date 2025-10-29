import { invoke } from '@tauri-apps/api/core';
import { debug, error, info, logSafely } from './logging';
import type { AideonApi, StateAtArguments, StateAtResult } from './types';

function safeInvoke<T>(command: string, arguments_?: Record<string, unknown>): Promise<T> {
  const function_ = invoke as unknown as (c: string, a?: Record<string, unknown>) => Promise<T>;
  return arguments_ === undefined ? function_(command) : function_(command, arguments_);
}

// Only define when not already supplied by a preload (Electron) or other bridge
if ((globalThis as { aideon?: unknown }).aideon === undefined) {
  // Always install a bridge object; methods will throw if Tauri isn't available yet.
  logSafely(info, 'renderer: installing tauri-shim bridge');
  (globalThis as unknown as { aideon: AideonApi }).aideon = {
    version: 'tauri-shim',
    stateAt: async (arguments_: StateAtArguments) => {
      logSafely(debug, `renderer: invoking temporal_state_at asOf=${arguments_.asOf}`);
      try {
        const result = await safeInvoke<StateAtResult>('temporal_state_at', {
          // Send both naming conventions for host compatibility
          as_of: arguments_.asOf,
          asOf: arguments_.asOf,
          scenario: arguments_.scenario ?? null,
          confidence: arguments_.confidence ?? null,
        });
        return result;
      } catch (error_: unknown) {
        const maybe = error_ as { message?: string } | undefined;
        const message = typeof maybe?.message === 'string' ? maybe.message : String(error_);
        logSafely(error, `renderer: invoke temporal_state_at failed: ${message}`);
        throw error_;
      }
    },
    openSettings: async () => {
      try {
        await safeInvoke('open_settings');
      } catch (error_: unknown) {
        const maybe = error_ as { message?: string } | undefined;
        const message = typeof maybe?.message === 'string' ? maybe.message : String(error_);
        logSafely(error, `renderer: invoke open_settings failed: ${message}`);
        throw error_;
      }
    },
    openAbout: async () => {
      try {
        await safeInvoke('open_about');
      } catch (error_: unknown) {
        const maybe = error_ as { message?: string } | undefined;
        const message = typeof maybe?.message === 'string' ? maybe.message : String(error_);
        logSafely(error, `renderer: invoke open_about failed: ${message}`);
        throw error_;
      }
    },
    openStatus: async () => {
      try {
        await safeInvoke('open_status');
      } catch (error_: unknown) {
        const maybe = error_ as { message?: string } | undefined;
        const message = typeof maybe?.message === 'string' ? maybe.message : String(error_);
        logSafely(error, `renderer: invoke open_status failed: ${message}`);
        throw error_;
      }
    },
  };
}
