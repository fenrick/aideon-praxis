/* Lightweight logger for the renderer.
 * - Always logs to console for local visibility.
 * - If running under Tauri with the log plugin available, mirrors to the host log sink.
 */

let logPlugin:
  | {
      info: (message: string) => Promise<void>;
      warn: (message: string) => Promise<void>;
      error: (message: string) => Promise<void>;
      debug?: (message: string) => Promise<void>;
      trace?: (message: string) => Promise<void>;
    }
  | null
  | undefined;

async function ensurePlugin() {
  if (logPlugin !== undefined) return logPlugin;
  try {
    // Dynamically import to avoid bundling issues outside Tauri
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    const m: typeof import('@tauri-apps/plugin-log') = await import('@tauri-apps/plugin-log');
    logPlugin = m;
  } catch {
    logPlugin = null;
  }
  return logPlugin;
}

export function logInfo(message: string) {
  console.info(message);
  void ensurePlugin()
    .then((p) => p?.info(message))
    .catch((_error: unknown) => {
      return;
    });
}

export function logWarn(message: string) {
  console.warn(message);
  void ensurePlugin()
    .then((p) => p?.warn(message))
    .catch((_error: unknown) => {
      return;
    });
}

export function logError(message: string, error?: unknown) {
  if (error) console.error(message, error);
  else console.error(message);
  void ensurePlugin()
    .then((p) => {
      const suffix = (() => {
        if (error === undefined) return '';
        if (error instanceof Error) return `: ${error.message}`;
        try {
          return `: ${JSON.stringify(error)}`;
        } catch {
          return ': <non-string error>';
        }
      })();
      return p?.error(`${message}${suffix}`);
    })
    .catch((_error: unknown) => {
      return;
    });
}

export function logDebug(message: string) {
  console.debug(message);
  void ensurePlugin()
    .then((p) => p?.debug?.(message))
    .catch((_error: unknown) => {
      return;
    });
}
