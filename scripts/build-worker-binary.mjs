#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd());
const workerSrc = path.join(repoRoot, 'packages/worker/src/aideon_worker/cli.py');
const workerPythonPath = path.join(repoRoot, 'packages/worker/src');
const distDir = path.join(repoRoot, 'dist');

const tauriTarget =
  process.env.AIDEON_WORKER_TARGET ?? process.env.TAURI_ENV_TARGET_TRIPLE ?? inferTargetTriple();

fs.mkdirSync(distDir, { recursive: true });

const artifactName = process.platform === 'win32' ? 'aideon-worker.exe' : 'aideon-worker';
const artifactPath = path.join(distDir, artifactName);

fs.rmSync(artifactPath, { force: true });

runPyInstaller();

if (!fs.existsSync(artifactPath)) {
  console.error('[worker] PyInstaller did not produce the expected artifact:', artifactPath);
  process.exit(1);
}

stageRendererArtifact(artifactPath);
stageTauriSidecar(artifactPath, tauriTarget);

console.log('[worker] Binary prepared for target', tauriTarget ?? '<host>');

function runPyInstaller() {
  const uvResult = spawnSync(
    'uv',
    [
      'run',
      '--with',
      'packages/worker',
      '--with',
      'packages/worker[bundle]',
      'pyinstaller',
      '-F',
      '-n',
      'aideon-worker',
      '-p',
      workerPythonPath,
      workerSrc,
    ],
    { stdio: 'inherit', cwd: repoRoot },
  );

  if (uvResult.error || uvResult.status !== 0) {
    console.warn('[worker] uv run failed, falling back to system python', {
      error: uvResult.error?.message,
      status: uvResult.status,
    });
    const pipInstall = spawnSync(
      'python3',
      ['-m', 'pip', 'install', '--user', '--quiet', 'pyinstaller'],
      { stdio: 'inherit' },
    );
    if (pipInstall.status !== 0) {
      console.error('[worker] failed to install pyinstaller via pip');
      process.exit(pipInstall.status ?? 1);
    }
    const pyInstaller = spawnSync(
      'python3',
      ['-m', 'PyInstaller', '-F', '-n', 'aideon-worker', '-p', workerPythonPath, workerSrc],
      { stdio: 'inherit' },
    );
    if (pyInstaller.status !== 0) {
      console.error('[worker] PyInstaller fallback failed');
      process.exit(pyInstaller.status ?? 1);
    }
  }
}

function stageRendererArtifact(source) {
  const rendererDir = path.join(repoRoot, 'packages/app/extra/worker');
  fs.mkdirSync(rendererDir, { recursive: true });
  const destination = path.join(rendererDir, path.basename(source));
  fs.copyFileSync(source, destination);
  ensureExecutable(destination);
}

function stageTauriSidecar(source, triple) {
  const sidecarDir = path.join(repoRoot, 'packages/host/binaries');
  fs.mkdirSync(sidecarDir, { recursive: true });
  const baseDestination = path.join(sidecarDir, path.basename(source));
  fs.copyFileSync(source, baseDestination);
  ensureExecutable(baseDestination);

  if (!triple) {
    console.warn('[worker] target triple unavailable; sidecar copied without suffix');
    return;
  }

  const extension = path.extname(source);
  const nameWithoutExt = path.basename(source, extension);
  const suffixed = `${nameWithoutExt}-${triple}${extension}`;
  const suffixedPath = path.join(sidecarDir, suffixed);
  fs.copyFileSync(source, suffixedPath);
  ensureExecutable(suffixedPath);
}

function ensureExecutable(filePath) {
  if (process.platform !== 'win32') {
    fs.chmodSync(filePath, 0o755);
  }
}

function inferTargetTriple() {
  const key = `${process.platform}-${process.arch}`;
  const lookup = {
    'darwin-arm64': 'aarch64-apple-darwin',
    'darwin-x64': 'x86_64-apple-darwin',
    'linux-arm': 'armv7-unknown-linux-gnueabihf',
    'linux-arm64': 'aarch64-unknown-linux-gnu',
    'linux-ppc64': 'powerpc64-unknown-linux-gnu',
    'linux-ppc64le': 'powerpc64le-unknown-linux-gnu',
    'linux-s390x': 's390x-unknown-linux-gnu',
    'linux-x64': 'x86_64-unknown-linux-gnu',
    'win32-arm64': 'aarch64-pc-windows-msvc',
    'win32-ia32': 'i686-pc-windows-msvc',
    'win32-x64': 'x86_64-pc-windows-msvc',
  };
  return lookup[key] ?? null;
}
