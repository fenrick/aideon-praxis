import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.PATH = `${process.env.HOME ?? ''}/.cargo/bin:${process.env.PATH ?? ''}`;

const repoRoot = path.resolve(__dirname, '..', '..');
const profile = process.env.TAURI_PROFILE ?? 'release';
const appBaseName = process.env.TAURI_APP_NAME ?? 'aideon_desktop';
const appBinaryName = process.platform === 'win32' ? `${appBaseName}.exe` : appBaseName;
const appPath = process.env.TAURI_APP_PATH ?? path.join(repoRoot, 'target', profile, appBinaryName);
const driverPort = Number.parseInt(process.env.TAURI_DRIVER_PORT ?? '4447', 10);
const nativePort = Number.parseInt(process.env.TAURI_NATIVE_PORT ?? '4448', 10);

let tauriDriver;

function run(command, options) {
  execSync(command, {
    stdio: 'inherit',
    cwd: repoRoot,
    env: { ...process.env },
    ...options,
  });
}

function cleanupNativeDrivers() {
  if (process.platform !== 'linux') return;
  try {
    execSync('pkill -f WebKitWebDriver', { stdio: 'ignore' });
  } catch {
    // ignore if nothing to kill
  }
}

function ensureAppBinary() {
  if (fs.existsSync(appPath)) {
    return;
  }
  throw new Error(
    `Tauri app binary not found at ${appPath}. ` +
      'Set TAURI_APP_PATH or TAURI_PROFILE if you built elsewhere.',
  );
}

export const config = {
  runner: 'local',
  specs: ['./specs/**/*.js'],
  maxInstances: 1,
  capabilities: [
    {
      'tauri:options': {
        application: appPath,
      },
    },
  ],
  logLevel: process.env.WDIO_LOG_LEVEL ?? 'info',
  bail: 0,
  waitforTimeout: 20000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 120000,
  },
  host: '127.0.0.1',
  port: driverPort,
  onPrepare: () => {
    run('pnpm tauri build --no-bundle --config src-tauri/tauri.conf.json');
    ensureAppBinary();
  },
  beforeSession: (_config, capabilities) => {
    if (process.env.WDIO_LOG_CAPS === 'true') {
      try {
        console.log('[webdriver] capabilities:', JSON.stringify(capabilities, null, 2));
      } catch {
        // ignore logging issues
      }
    }
    tauriDriver = spawn(
      'tauri-driver',
      [
        '--port',
        String(driverPort),
        '--native-port',
        String(nativePort),
        '--native-host',
        '127.0.0.1',
      ],
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          RUST_LOG: process.env.RUST_LOG ?? 'info',
        },
      },
    );
  },
  afterSession: () => {
    if (!tauriDriver) return;
    tauriDriver.kill('SIGINT');
    tauriDriver = undefined;
    cleanupNativeDrivers();
  },
  onComplete: () => {
    if (tauriDriver) {
      tauriDriver.kill('SIGINT');
      tauriDriver = undefined;
    }
    cleanupNativeDrivers();
  },
};
