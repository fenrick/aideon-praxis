#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(process.cwd());
const src = path.join(repo, 'packages/worker/src/aideon_worker/cli.py');
const pyPath = path.join(repo, 'packages/worker/src');
const outDir = path.join(repo, 'dist');
fs.mkdirSync(outDir, { recursive: true });

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (res.status !== 0) {
    console.error(`Command failed: ${cmd} ${args.join(' ')}`);
    process.exit(res.status ?? 1);
  }
}

// Ensure pyinstaller is available
run('python3', ['-m', 'pip', 'install', '--user', '--quiet', 'pyinstaller']);

// Build single-file worker binary
run('python3', ['-m', 'PyInstaller', '-F', '-n', 'aideon-worker', '-p', pyPath, src]);

// Copy into app extra resources
const appExtra = path.join(repo, 'packages/app/extra/worker');
fs.mkdirSync(appExtra, { recursive: true });
const artifact = process.platform === 'win32' ? 'aideon-worker.exe' : 'aideon-worker';
const built = path.join(repo, 'dist', artifact);
if (!fs.existsSync(built)) {
  console.error('Expected PyInstaller artifact not found:', built);
  process.exit(2);
}
fs.copyFileSync(built, path.join(appExtra, artifact));
console.log('Worker binary embedded at', path.join(appExtra, artifact));
