import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { type StateAtResult } from './types';
import http from 'node:http';
import os from 'node:os';

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-definitions
type MinimalChild = { on: (event: string, handler: (...arguments_: any[]) => void) => void };

async function httpStateAtOverUds(
  udsPath: string,
  arguments_: { asOf: string; scenario?: string; confidence?: number },
): Promise<StateAtResult> {
  const query = new URLSearchParams({ as_of: arguments_.asOf });
  if (typeof arguments_.scenario === 'string') query.set('scenario', arguments_.scenario);
  if (arguments_.confidence !== undefined) query.set('confidence', String(arguments_.confidence));
  const optionsHttp: http.RequestOptions = {
    socketPath: udsPath,
    path: `/api/v1/state_at?${query.toString()}`,
    method: 'GET',
    headers: { Accept: 'application/json' },
  };
  const onHttpResponse = (response: http.IncomingMessage, resolve: (s: string) => void) => {
    const chunks: Buffer[] = [];
    response.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    response.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
  };
  const json = await new Promise<string>((resolve, reject) => {
    const request = http.request(optionsHttp, (response) => {
      onHttpResponse(response, resolve);
    });
    request.on('error', (error) => {
      reject(error);
    });
    request.end();
  });
  return JSON.parse(json) as StateAtResult;
}

async function httpHealthOverUds(udsPath: string): Promise<{ status: string }> {
  const optionsHttp: http.RequestOptions = {
    socketPath: udsPath,
    path: `/health`,
    method: 'GET',
    headers: { Accept: 'application/json' },
  };
  const json = await new Promise<string>((resolve, reject) => {
    const request = http.request(optionsHttp, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      response.on('end', () => {
        resolve(Buffer.concat(chunks).toString('utf8'));
      });
    });
    request.on('error', (error) => {
      reject(error);
    });
    request.end();
  });
  return JSON.parse(json) as { status: string };
}

async function waitForServerReady(udsPath: string, timeoutMs = 3000): Promise<void> {
  const started = Date.now();
  // Poll a lightweight request until it succeeds or times out
  const tryOnce = async () => {
    try {
      const result = await httpHealthOverUds(udsPath);
      return result.status === 'ok';
    } catch {
      return false;
    }
  };
  while (Date.now() - started < timeoutMs) {
    if (await tryOnce()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

// Test-only export to exercise internal helpers without spawning processes
export const __test__ = { httpHealthOverUds, waitForServerReady } as const;

// Security: disable hardware acceleration by default for baseline.
// This file is the Electron host process entry. It must not contain
// any renderer logic or backend-specific adapters. Renderer communicates
// via the preload bridge only, and the worker runs as a local sidecar.
app.disableHardwareAcceleration();

const createWindow = async () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  try {
    const rendererIndex = path.join(__dirname, 'renderer', 'index.html');
    await win.loadFile(rendererIndex);
  } catch (error) {
    console.error('Failed to load renderer HTML:', error);
  }

  // Security: remove menu in production-ish skeleton
  win.removeMenu();
  // Spawn worker server (UDS HTTP only; no TCP) and wire IPC handler
  try {
    const { spawn } = await import('node:child_process');
    let ready: Promise<void> = Promise.resolve();
    const udsPath = path.join(os.tmpdir(), `aideon-worker-${String(process.pid)}.sock`);
    const isTest = process.env.VITEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test';

    // IPC handler for state_at (register early; it will await readiness)
    ipcMain.handle(
      'worker:state_at',
      async (_event, arguments_: { asOf: string; scenario?: string; confidence?: number }) => {
        await ready;
        return httpStateAtOverUds(udsPath, arguments_);
      },
    );

    const spawnWorker = () => {
      const { cmd, args, options } = getWorkerSpawn();
      // Inject UDS path for server mode
      args.push('--uds', udsPath);
      const child = spawn(cmd, args, options) as unknown as MinimalChild;
      // Wait for HTTP health over UDS to succeed (ignore failures and let handler retry)
      ready = waitForServerReady(udsPath).catch(() => {
        /* noop */
      });
      child.on('exit', () => {
        // Attempt a fast respawn; existing callers still await `ready`
        spawnWorker();
      });
    };
    if (!isTest) spawnWorker();

    // spawnWorker above wires READY and sendLine
  } catch (error) {
    console.error('Failed to start worker:', error);
  }
};

function getWorkerSpawn(): {
  cmd: string;
  args: string[];
  options: { stdio: ['pipe', 'pipe', 'inherit']; env?: NodeJS.ProcessEnv };
} {
  const options: { stdio: ['pipe', 'pipe', 'inherit']; env?: NodeJS.ProcessEnv } = {
    stdio: ['pipe', 'pipe', 'inherit'],
  };
  if (app.isPackaged) {
    const binName = process.platform === 'win32' ? 'aideon-worker.exe' : 'aideon-worker';
    const workerPath = path.join(process.resourcesPath, 'worker', binName);
    return { cmd: workerPath, args: ['--server'], options };
  }
  // Dev: prefer `uv run -q -m aideon_worker.server` if available
  options.env = { ...process.env, PYTHONPATH: path.join(process.cwd(), '..', 'worker', 'src') };
  const uvPath = process.env.UV ?? 'uv';
  return { cmd: uvPath, args: ['run', '-q', '-m', 'aideon_worker.server'], options };
}

// Electron app init using event to avoid promise chain in CJS
app.on('ready', () => {
  void createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
