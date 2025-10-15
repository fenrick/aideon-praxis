import { app, BrowserWindow } from 'electron';
import path from 'node:path';

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
  // Spawn worker in background (pipes only, no TCP)
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

    const worker = spawn(workerCmd, workerArguments, workerOptions);
    if (worker.stdout) {
      worker.stdout.on('data', (buf: Buffer) => {
        const line = buf.toString().trim();
        if (line) console.log('[worker]', line);
      });
    }
    if (worker.stdin) {
      worker.stdin.write('ping\n');
    }
  } catch (error) {
    console.error('Failed to start worker:', error);
  }
};

// Electron app init (avoid promise chains in CJS; no top-level await)
void (async () => {
  try {
    await app.whenReady();
    await createWindow();
  } catch (err) {
    console.error('Failed to initialize app:', err);
  }
})();

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
