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
  const origin = (() => {
    try {
      const stack = new Error('log origin').stack;
      if (!stack) return null;
      const lines = stack.split('\n').slice(1);
      // Find first frame outside this module to approximate original callsite
      const frame = lines.find(
        (l) =>
          !l.includes('/src/lib/logging.ts') &&
          !l.includes('logging.ts') &&
          !l.includes('logSafely'),
      );
      if (!frame) return null;
      // Extract URL or absolute file path with line/column from the frame
      const match = /(?:\(|\s)(file:\/\/\S+|https?:\/\/\S+|\/\S+):(\d+):(\d+)/.exec(frame);
      if (match) {
        const url = String(match[1]);
        const line = String(match[2]);
        const col = String(match[3]);
        // Prefer repository-relative path if present
        const index = url.indexOf('/src/');
        const relative = index === -1 ? url : url.slice(index);
        return `${relative}:${line}:${col}`;
      }
      return null;
    } catch {
      return null;
    }
  })();

  const enriched = origin ? `[${origin}] ${message}` : message;
  logger(enriched).catch((loggingError: unknown) => {
    if (isDevelopment()) {
      console.warn('renderer: log fallback', loggingError);
    }
  });
};
