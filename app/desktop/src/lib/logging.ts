import {
  debug as pluginDebug,
  error as pluginError,
  info as pluginInfo,
} from '@tauri-apps/plugin-log';

export type Logger = (message: string) => Promise<void>;

// Provide typed wrappers to satisfy strict ESLint rules and avoid "any" leakage
export const debug: Logger = (message: string) =>
  (pluginDebug as (m: string) => Promise<void>)(message);
export const error: Logger = (message: string) =>
  (pluginError as (m: string) => Promise<void>)(message);
export const info: Logger = (message: string) =>
  (pluginInfo as (m: string) => Promise<void>)(message);

const isDevelopment = () => {
  const override = (globalThis as { __AIDEON_DEV__?: boolean }).__AIDEON_DEV__;
  if (override !== undefined) {
    return override;
  }
  const metaEnvironment = (import.meta as { env?: { DEV?: unknown } }).env;
  return metaEnvironment?.DEV === true || metaEnvironment?.DEV === 'true';
};

export const logSafely = (logger: Logger, message: string) => {
  logger(message).catch((loggingError: unknown) => {
    if (isDevelopment()) {
      console.warn('renderer: log fallback', loggingError);
    }
  });
};
