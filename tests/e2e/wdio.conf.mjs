import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

const binaryName = process.platform === 'win32' ? 'aideon_desktop.exe' : 'aideon_desktop';
const candidatePaths = [
  process.env.TAURI_E2E_APP_PATH,
  path.join(repoRoot, 'target', 'debug', binaryName),
  path.join(repoRoot, 'crates', 'desktop', 'target', 'debug', binaryName),
].filter(Boolean);

const findAppPath = () => {
  for (const candidate of candidatePaths) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }
  return candidatePaths[0];
};

let tauriDriver;
let appPath = findAppPath();
let exit = false;

const driverHost = process.env.TAURI_E2E_DRIVER_HOST ?? '127.0.0.1';
const driverPort = Number(process.env.TAURI_E2E_DRIVER_PORT ?? '4444');
const nativePort = Number(process.env.TAURI_E2E_NATIVE_PORT ?? '4445');

function buildApp() {
  if (process.env.TAURI_E2E_SKIP_BUILD === '1') {
    return;
  }
  const result = spawnSync('pnpm', ['tauri', 'build', '--debug', '--no-bundle'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error('tauri build failed');
  }
}

function ensureAppPath() {
  appPath = findAppPath();
  if (!appPath || !existsSync(appPath)) {
    throw new Error(
      `tauri app binary not found. Set TAURI_E2E_APP_PATH or run build. Tried: ${candidatePaths.join(
        ', ',
      )}`,
    );
  }
  config.capabilities[0]['tauri:options'].application = appPath;
}

export const config = {
  runner: 'local',
  specs: [path.join(__dirname, 'specs', '**', '*.mjs')],
  maxInstances: 1,
  hostname: driverHost,
  port: driverPort,
  path: '/',
  capabilities: [
    {
      maxInstances: 1,
      'tauri:options': {
        application: appPath,
      },
    },
  ],
  logLevel: 'warn',
  bail: 0,
  waitforTimeout: 20000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 2,
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 180000,
  },
  onPrepare() {
    buildApp();
    ensureAppPath();
    const driverPath = process.env.TAURI_E2E_DRIVER_PATH;
    if (!driverPath) {
      throw new Error('TAURI_E2E_DRIVER_PATH not set');
    }
    tauriDriver = spawn(
      driverPath,
      ['--port', String(driverPort), '--native-port', String(nativePort)],
      {
        stdio: 'inherit',
        cwd: repoRoot,
      },
    );
    tauriDriver.on('error', (error) => {
      console.error('tauri-driver error:', error);
      process.exit(1);
    });
    tauriDriver.on('exit', (code) => {
      if (!exit) {
        console.error('tauri-driver exited with code:', code);
        process.exit(1);
      }
    });
  },
  onComplete() {
    closeTauriDriver();
  },
};

function closeTauriDriver() {
  exit = true;
  tauriDriver?.kill();
}

function onShutdown(fn) {
  const cleanup = () => {
    try {
      fn();
    } finally {
      process.exit();
    }
  };
  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('SIGHUP', cleanup);
  process.on('SIGBREAK', cleanup);
}

onShutdown(() => {
  closeTauriDriver();
});
