export { debug, error, info } from '@tauri-apps/plugin-log';

export type Logger = (message: string) => Promise<void>;

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
