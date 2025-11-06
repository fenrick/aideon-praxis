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

const stackMarkers = ['/app/', '/crates/', '/docs/', '/packages/', '/scripts/', '/tools/', '/src/'];

const trimTrailingParen = (segment: string) =>
  segment.endsWith(')') ? segment.slice(0, -1).trim() : segment.trim();

const sliceAfter = (value: string, token: string) => {
  const index = value.lastIndexOf(token);
  return index === -1 ? null : value.slice(index + token.length);
};

const extractLocationSegment = (line: string) => {
  const trimmed = trimTrailingParen(line);
  const fromParen = sliceAfter(trimmed, '(');
  if (fromParen) {
    return fromParen.trim();
  }

  const fromSpace = sliceAfter(trimmed, ' ');
  return (fromSpace ?? trimmed).trim();
};

const isAllDigits = (value: string) => value.length > 0 && Number.isInteger(Number(value));

const splitLocation = (location: string) => {
  const lastColon = location.lastIndexOf(':');
  if (lastColon === -1) {
    return null;
  }

  const secondColon = location.lastIndexOf(':', lastColon - 1);
  if (secondColon === -1) {
    return null;
  }

  const rawPath = location.slice(0, secondColon);
  const lineNumber = location.slice(secondColon + 1, lastColon);
  const columnNumber = location.slice(lastColon + 1);

  if (!isAllDigits(lineNumber) || !isAllDigits(columnNumber)) {
    return null;
  }

  return { rawPath, lineNumber, columnNumber };
};

const normalizePath = (rawPath: string) =>
  rawPath
    .replace(/^file:\/+/i, '')
    .replace(/^vite-node:\/\//i, '')
    .replace(/^webpack-internal:\/\//i, '')
    .replaceAll('\\', '/');

const resolveRelativePath = (normalizedPath: string) => {
  for (const marker of stackMarkers) {
    const index = normalizedPath.indexOf(marker);
    if (index !== -1) {
      return normalizedPath.slice(index + 1);
    }
  }
  return normalizedPath;
};

const extractOriginFromStack = (stack: string | undefined) => {
  if (!stack) {
    return null;
  }

  const lines = stack.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (
      !line ||
      line.includes('logSafely') ||
      line.includes('node:internal') ||
      /logging\.(?:ts|js|mjs)/.test(line)
    ) {
      continue;
    }

    const locationSegment = extractLocationSegment(line);
    if (!locationSegment) {
      continue;
    }

    const locationParts = splitLocation(locationSegment);
    if (!locationParts) {
      continue;
    }

    const normalizedPath = normalizePath(locationParts.rawPath);
    const relativePath = resolveRelativePath(normalizedPath);
    return `${relativePath}:${locationParts.lineNumber}:${locationParts.columnNumber}`;
  }

  return null;
};

export const logSafely = (logger: Logger, message: string) => {
  const origin = (() => {
    try {
      const candidate = new Error('log origin');
      const captureStackTrace = (
        Error as {
          captureStackTrace?: (
            target: { stack?: string },
            ctor?: (...arguments_: unknown[]) => unknown,
          ) => void;
        }
      ).captureStackTrace;
      if (captureStackTrace) {
        const frameSkipper = logSafely as unknown as (...arguments_: unknown[]) => unknown;
        captureStackTrace(candidate, frameSkipper);
      }

      return extractOriginFromStack(candidate.stack);
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
