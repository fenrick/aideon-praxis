#!/usr/bin/env node
import { execSync } from 'node:child_process';

function cmdExists(cmd) {
  try {
    execSync(`${cmd} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function get(cmd) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

const problems = [];

// Node & Yarn
const nodeV = get('node -v');
if (!nodeV) problems.push('Node not found (need >= 24).');
const yarnV = get('yarn -v');
if (!yarnV.startsWith('4.'))
  problems.push('Yarn 4 not active (run: corepack enable && corepack prepare).');

// Python uv
if (!cmdExists('uv')) problems.push('uv not found (see https://github.com/astral-sh/uv).');

// Rust (optional unless working on #95)
const rustcV = get('rustc --version');
if (!rustcV) problems.push('Rust toolchain not found (install via rustup).');

// Tauri CLI (optional)
const tauriV = get('yarn dlx @tauri-apps/cli -v');
if (!tauriV) {
  // Don’t hard fail; just note it.
  console.log('[hint] Tauri CLI not found; only needed for host work (#95).');
}

if (problems.length) {
  console.error('[preflight] Detected issues:');
  for (const p of problems) console.error(' - ' + p);
  process.exit(1);
}

console.log('[preflight] OK');
