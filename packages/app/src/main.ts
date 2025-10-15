import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import readline from 'node:readline';

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
    let resolveReady: (() => void) | null = null;
    const ready = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });
    let send: ((line: string) => Promise<string>) | null = null;
    const { cmd, args, options } = getWorkerSpawn();
    const child = spawn(cmd, args, options);
    const rl = readline.createInterface({ input: child.stdout });

    // IPC handler for state_at (register early; it will await readiness)
    ipcMain.handle(
      'worker:state_at',
      async (_event, arguments_: { asOf: string; scenario?: string; confidence?: number }) => {
        await ready;
        const payload = JSON.stringify(arguments_);
        const raw = await (send as (l: string) => Promise<string>)(`state_at ${payload}`);
        return JSON.parse(raw) as {
          asOf: string;
          scenario: string | null;
          confidence: number | null;
          nodes: number;
          edges: number;
        };
      },
    );

    // Wait for READY banner and set up serializer
    rl.on('line', (line: string) => {
      if (line.trim() === 'READY') {
        resolveReady?.();
      }
    });

    // Simple serialized request helper: writes a line and resolves next line
    send = async (line: string): Promise<string> =>
      new Promise<string>((resolve) => {
        const onLine = (resp: string) => {
          rl.off('line', onLine);
          resolve(resp);
        };
        rl.on('line', onLine);
        child.stdin.write(`${line}\n`);
      });
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
  options.env = { ...process.env, PYTHONPATH: path.join(process.cwd(), '..', 'worker', 'src') };
  return { cmd: 'python3', args: ['-m', 'aideon_worker.cli'], options };
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
