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
      const candidate = new Error('log origin');
      const captureStackTrace = (Error as {
        captureStackTrace?: (target: { stack?: string }, ctor?: (...args: unknown[]) => unknown) => void;
      }).captureStackTrace;
      if (captureStackTrace) {
        captureStackTrace(candidate, logSafely);
      }

      const stack = candidate.stack;
      if (typeof stack !== 'string') {
        return null;
      }

      const lines = stack.split(/\r?\n/);
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        if (
          line.includes('logSafely') ||
          line.includes('node:internal') ||
          /logging\.(ts|js|mjs)/.test(line)
        ) {
          continue;
        }

        const match = line.match(
          /(?:\(|\s)([\w.-]+:\/\/[^\s):]+|[A-Za-z]:[\\/][^\s):]+|\/[^\s):]+):(\d+):(\d+)/,
        );
        if (!match) {
          continue;
        }

        const [, rawPath, lineNumber, columnNumber] = match;
        const normalizedPath = rawPath
          .replace(/^file:\/+/, '')
          .replace(/^vite-node:\/\//, '')
          .replace(/^webpack-internal:\/\//, '')
          .replace(/\\/g, '/');

        const markers = ['/app/', '/crates/', '/docs/', '/packages/', '/scripts/', '/tools/', '/src/'];
        const relativePath = (() => {
          for (const marker of markers) {
            const index = normalizedPath.indexOf(marker);
            if (index !== -1) {
              return normalizedPath.slice(index + 1);
            }
          }
          return normalizedPath;
        })();

        return `${relativePath}:${lineNumber}:${columnNumber}`;
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
