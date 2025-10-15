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

  await win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Security: remove menu in production-ish skeleton
  win.removeMenu();
  // Spawn worker in background (pipes only, no TCP) and wire a minimal RPC
  try {
    const { spawn } = await import('node:child_process');
    let workerCmd: string;
    let workerArguments: string[] = [];
    const workerOptions: { stdio: ['pipe', 'pipe', 'inherit']; env?: NodeJS.ProcessEnv } = {
      stdio: ['pipe', 'pipe', 'inherit'],
    };

    if (app.isPackaged) {
      const binName = process.platform === 'win32' ? 'aideon-worker.exe' : 'aideon-worker';
      const workerPath = path.join(process.resourcesPath, 'worker', binName);
      workerCmd = workerPath;
      workerArguments = [];
    } else {
      workerCmd = 'python3';
      workerArguments = ['-m', 'aideon_worker.cli'];
      workerOptions.env = {
        ...process.env,
        PYTHONPATH: path.join(process.cwd(), '..', 'worker', 'src'),
      };
    }

    const child = spawn(workerCmd, workerArguments, workerOptions);
    const rl = readline.createInterface({ input: child.stdout });

    // Wait for READY banner
    await new Promise<void>((resolve) => {
      const onLine = (line: string) => {
        if (line.trim() === 'READY') {
          rl.off('line', onLine);
          resolve();
        }
      };
      rl.on('line', onLine);
    });

    // Simple serialized request helper: writes a line and resolves next line
    const send = async (line: string): Promise<string> => {
      return new Promise<string>((resolve) => {
        const onLine = (resp: string) => {
          rl.off('line', onLine);
          resolve(resp);
        };
        rl.on('line', onLine);
        child.stdin.write(`${line}\n`);
      });
    };

    // IPC handler for state_at
    ipcMain.handle(
      'worker:state_at',
      async (_event, arguments_: { asOf: string; scenario?: string; confidence?: number }) => {
        const payload = JSON.stringify(arguments_);
        const raw = await send(`state_at ${payload}`);
        return JSON.parse(raw) as {
          asOf: string;
          scenario: string | null;
          confidence: number | null;
          nodes: number;
          edges: number;
        };
      },
    );
  } catch (error) {
    console.error('Failed to start worker:', error);
  }
};

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
