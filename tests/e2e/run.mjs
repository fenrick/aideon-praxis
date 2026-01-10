import { spawnSync } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import path from 'node:path';

function resolveBinaryPath(binary) {
  const suffix = process.platform === 'win32' ? '.exe' : '';
  const candidate = `${binary}${suffix}`;
  const envPath = process.env.PATH ?? '';
  for (const segment of envPath.split(path.delimiter)) {
    const fullPath = path.join(segment, candidate);
    try {
      accessSync(fullPath, constants.X_OK);
      return fullPath;
    } catch {
      // continue
    }
  }
  return undefined;
}

if (process.platform === 'darwin' && process.env.TAURI_E2E_ALLOW_DARWIN !== '1') {
  console.log('tauri e2e: skipping on macOS (no official tauri-driver).');
  console.log('Set TAURI_E2E_ALLOW_DARWIN=1 and TAURI_E2E_DRIVER_PATH to override.');
  process.exit(0);
}

const driverPath = process.env.TAURI_E2E_DRIVER_PATH ?? resolveBinaryPath('tauri-driver');
if (!driverPath) {
  console.error('tauri e2e: tauri-driver not found on PATH.');
  console.error('Install with `cargo install tauri-driver` and retry.');
  process.exit(1);
}

const result = spawnSync('pnpm', ['exec', 'wdio', 'run', 'tests/e2e/wdio.conf.mjs'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    TAURI_E2E_DRIVER_PATH: driverPath,
  },
});

process.exit(result.status ?? 1);
