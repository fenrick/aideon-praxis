#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.resolve(__dirname, '..', 'packages/app');

const electronBin = path.resolve(__dirname, '..', 'node_modules/.bin/electron');
const child = spawn(electronBin, ['.'], {
  cwd: appDir,
  env: {
    ...process.env,
    ELECTRON_ENABLE_LOGGING: '1',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

child.stdout.on('data', (d) => process.stdout.write(String(d)));
child.stderr.on('data', (d) => process.stderr.write(String(d)));

setTimeout(() => {
  try {
    child.kill('SIGTERM');
  } catch {
    /* ignore */
  }
}, 5000);

child.on('exit', (code, signal) => {
  console.log(`electron exited: code=${code} signal=${signal}`);
});
