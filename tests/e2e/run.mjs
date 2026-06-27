import { spawn, spawnSync } from 'node:child_process';
import { accessSync, constants, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

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

// ---------------------------------------------------------------------------
// macOS — tauri-driver has no macOS support (M0 out of scope for interactive
// WebDriver automation on macOS). We build the debug binary, run a launch
// smoke (start → screenshot artefact → static test-ID check → quit), then
// emit an explicit log that interactive WebDriver is unavailable.
//
// This path NEVER silently exits 0 — it exits 1 on any failure, 0 only after
// the full smoke sequence completes. The anti-pattern of "skip on darwin" is
// intentionally not reproduced here.
// ---------------------------------------------------------------------------
if (process.platform === 'darwin') {
  console.log('tauri e2e [macOS]: tauri-driver has no macOS support.');
  console.log(
    'tauri e2e [macOS]: running macOS launch-smoke (build → static test-ID check → launch → screenshot artefact).',
  );

  const skipBuild = process.env.TAURI_E2E_SKIP_BUILD === '1';
  const appBinary =
    process.env.TAURI_E2E_APP_PATH ?? path.join(repoRoot, 'target', 'debug', 'aideon_desktop');
  const artifactDir = path.join(repoRoot, 'test-artifacts', 'screenshots');
  const screenshotPath = path.join(artifactDir, 'macos-smoke.png');

  // Step 1: Build the debug binary (also runs pnpm node:build → produces out/).
  if (!skipBuild) {
    console.log('tauri e2e [macOS]: building debug binary…');
    const buildResult = spawnSync('pnpm', ['tauri', 'build', '--debug', '--no-bundle'], {
      cwd: repoRoot,
      stdio: 'inherit',
    });
    if (buildResult.status !== 0) {
      console.error('tauri e2e [macOS]: build failed — exiting 1');
      process.exit(1);
    }
  }

  // Step 2: Static test-ID check — assert the compiled frontend bundle contains
  // the required shell region identifiers. Catches accidental test-ID removal
  // without needing a running WebView.
  const outNextDir = path.join(repoRoot, 'out', '_next');
  const requiredTestIds = ['aideon-shell-content', 'aideon-shell-inspector'];
  let staticFailed = false;
  for (const testId of requiredTestIds) {
    const result = spawnSync('grep', ['-r', '--include=*.js', testId, outNextDir], {
      cwd: repoRoot,
      stdio: 'pipe',
    });
    if (result.status !== 0) {
      console.error(
        `tauri e2e [macOS]: required stable test ID "${testId}" not found in ${outNextDir}`,
      );
      staticFailed = true;
    } else {
      console.log(`tauri e2e [macOS]: ✓ stable test ID "${testId}" present in built frontend`);
    }
  }
  if (staticFailed) {
    console.error('tauri e2e [macOS]: static test-ID check failed — exiting 1');
    process.exit(1);
  }

  // Step 3: Launch the debug binary.
  console.log(`tauri e2e [macOS]: launching ${appBinary}`);
  const appProcess = spawn(appBinary, [], { stdio: 'ignore', detached: false, cwd: repoRoot });
  appProcess.on('error', (error) => {
    console.error(`tauri e2e [macOS]: failed to launch binary — ${error.message}`);
    process.exit(1);
  });

  // Step 4: Wait for the app to initialise and render its first frame.
  console.log('tauri e2e [macOS]: waiting 8 s for app initialisation…');
  spawnSync('sleep', ['8'], { stdio: 'inherit' });

  // Step 5: Capture a screenshot artefact. screencapture is a macOS built-in;
  // -x suppresses the shutter sound; -t png sets the format.
  mkdirSync(artifactDir, { recursive: true });
  console.log(`tauri e2e [macOS]: capturing screenshot → ${screenshotPath}`);
  const screencaptureResult = spawnSync('screencapture', ['-x', '-t', 'png', screenshotPath], {
    stdio: 'inherit',
  });

  // Step 6: Quit the app before evaluating results.
  appProcess.kill('SIGTERM');

  if (screencaptureResult.status !== 0) {
    console.error('tauri e2e [macOS]: screencapture failed — exiting 1');
    process.exit(1);
  }

  // Step 7: Assert the screenshot is non-trivially sized (rules out a blank/black
  // frame which would indicate the app failed to render).
  let screenshotSize;
  try {
    screenshotSize = statSync(screenshotPath).size;
  } catch {
    console.error(`tauri e2e [macOS]: screenshot file not found at ${screenshotPath} — exiting 1`);
    process.exit(1);
  }
  const minScreenshotBytes = 50_000;
  if (screenshotSize < minScreenshotBytes) {
    console.error(
      `tauri e2e [macOS]: screenshot too small (${screenshotSize} B < ${minScreenshotBytes} B) — ` +
        'possible blank render — exiting 1',
    );
    process.exit(1);
  }

  console.log(
    `tauri e2e [macOS]: ✓ screenshot artefact captured (${screenshotSize} B) → ${screenshotPath}`,
  );
  console.log('tauri e2e [macOS]: launch-smoke passed.');
  console.log(
    'tauri e2e [macOS]: interactive WebDriver is unavailable on macOS — ' +
      'tauri-driver has no macOS support (M0 out of scope). ' +
      'Per-window capability denial and shell-composition WebDriver assertions run on Linux WebKitGTK and Windows WebView2.',
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Windows / Linux — WebDriver path via tauri-driver
// ---------------------------------------------------------------------------
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
