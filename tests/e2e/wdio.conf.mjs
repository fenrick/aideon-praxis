import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const configPath = path.join(repoRoot, 'crates', 'desktop', 'tauri.conf.json');

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

function buildApp() {
  if (process.env.TAURI_E2E_SKIP_BUILD === '1') {
    return;
  }
  const result = spawnSync('pnpm', ['tauri', 'build', '--debug', '--no-bundle', '-c', configPath], {
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
  capabilities: [
    {
      browserName: 'tauri',
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
  },
  beforeSession() {
    const driverPath = process.env.TAURI_E2E_DRIVER_PATH;
    if (!driverPath) {
      throw new Error('TAURI_E2E_DRIVER_PATH not set');
    }
    tauriDriver = spawn(driverPath, [], {
      stdio: 'inherit',
      cwd: repoRoot,
    });
  },
  afterSession() {
    if (tauriDriver) {
      tauriDriver.kill();
      tauriDriver = undefined;
    }
  },
};
