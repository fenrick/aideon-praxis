import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import readline from 'node:readline';
import { parseJsonRpcStateAt, type StateAtResult } from './rpc';
import http from 'node:http';
import os from 'node:os';

interface MinimalChild {
  stdin: { write: (s: string) => void };
}

function awaitWorkerReady(reader: readline.Interface): Promise<void> {
  return new Promise<void>((resolve) => {
    const onLine = (line: string) => {
      if (line.trim() === 'READY') resolve();
    };
    reader.on('line', onLine);
  });
}

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
  // Spawn worker in background (pipes only, no TCP) and wire a minimal RPC
  try {
    const { spawn } = await import('node:child_process');
    // Promise that resolves when the worker prints READY
    let ready: Promise<void> = Promise.resolve();
    let sendLine: ((line: string) => Promise<string>) | null = null;
    let nextId = 1;
    const useServer = process.env.AIDEON_USE_UV_SERVER === '1';
    const udsPath = path.join(os.tmpdir(), `aideon-worker-${String(process.pid)}.sock`);

    // httpStateAtOverUds defined at module scope
    const makeSendLine =
      (rl: readline.Interface, child: MinimalChild): ((line: string) => Promise<string>) =>
      async (line: string) =>
        new Promise<string>((resolve) => {
          rl.once('line', resolve);
          child.stdin.write(`${line}\n`);
        });

    // IPC handler for state_at (register early; it will await readiness)
    ipcMain.handle(
      'worker:state_at',
      async (_event, arguments_: { asOf: string; scenario?: string; confidence?: number }) => {
        await ready;
        if (useServer) return httpStateAtOverUds(udsPath, arguments_);
        // Prefer JSON-RPC 2.0. Fallback to legacy if needed.
        const rpc = {
          jsonrpc: '2.0',
          id: nextId++,
          method: 'temporal.state_at.v1',
          params: arguments_,
        };
        const raw = await (sendLine as (l: string) => Promise<string>)(JSON.stringify(rpc));
        const parsed = parseJsonRpcStateAt(raw);
        if (parsed.kind === 'success') return parsed.result;
        if (parsed.kind === 'error') throw new Error(parsed.message);
        // else: fall back
        // Legacy fallback
        const legacyRaw = await (sendLine as (l: string) => Promise<string>)(
          `state_at ${JSON.stringify(arguments_)}`,
        );
        return JSON.parse(legacyRaw) as StateAtResult;
      },
    );

    const spawnWorker = () => {
      const { cmd, args, options } = getWorkerSpawn();
      if (useServer) {
        // Inject UDS path for server mode
        args.push('--uds', udsPath);
      }
      const child = spawn(cmd, args, options);
      if (useServer) {
        // Server mode: assume readiness is handled by HTTP health; don't wire readline
        ready = Promise.resolve();
      } else {
        const rl = readline.createInterface({ input: child.stdout });
        ready = awaitWorkerReady(rl);
        // Simple serialized request helper for legacy modes
        sendLine = makeSendLine(rl, child);
      }
      child.on('exit', () => {
        // Attempt a fast respawn; existing callers still await `ready`
        spawnWorker();
      });
    };
    spawnWorker();

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
    return { cmd: workerPath, args: [], options };
  }
  // Dev: prefer `uv run -q -m aideon_worker.cli` if available, fallback to python3 -m
  options.env = { ...process.env, PYTHONPATH: path.join(process.cwd(), '..', 'worker', 'src') };
  const uvPath = process.env.UV ?? 'uv';
  return { cmd: uvPath, args: ['run', '-q', '-m', 'aideon_worker.cli'], options };
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
