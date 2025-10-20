import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

// Renderer ↔ Host boundary test: ensure renderer imports are safe.
// - Forbid importing Node built-ins and `electron` from the renderer.
// - Allow React libs and relative imports only.

const RENDERER_DIR = path.join(__dirname, '..', '..', 'src', 'renderer');

function walk(directory: string): string[] {
  const names = readdirSync(directory);
  const files: string[] = [];
  for (const name of names) {
    const p = path.join(directory, name);
    const stats = statSync(p);
    if (stats.isDirectory()) files.push(...walk(p));
    else if (name.endsWith('.ts') || name.endsWith('.tsx')) files.push(p);
  }
  return files;
}

// Extract module specifiers from simple ESM import statements without heavy parsing.
function findImports(content: string): string[] {
  const imports: string[] = [];
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('import ')) continue;
    const re = /['"][^'"]+['"]/;
    const match = re.exec(trimmed);
    if (!match) continue;
    const specifier = match[0].slice(1, -1);
    imports.push(specifier);
  }
  return imports;
}

const NODE_BUILTINS = new Set([
  'assert',
  'buffer',
  'child_process',
  'cluster',
  'crypto',
  'dgram',
  'dns',
  'domain',
  'events',
  'fs',
  'http',
  'https',
  'net',
  'os',
  'path',
  'perf_hooks',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'string_decoder',
  'sys',
  'timers',
  'tls',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'worker_threads',
  'zlib',
  'module',
]);

function isForbidden(spec: string): boolean {
  if (spec === 'electron') return true;
  if (spec.startsWith('node:')) return true;
  if (NODE_BUILTINS.has(spec)) return true;
  if (spec.startsWith('aideon_worker')) return true;
  // Allow react libs and relative imports only
  if (spec === 'react' || spec.startsWith('react-dom')) return false;
  if (spec.startsWith('./') || spec.startsWith('../')) return false;
  // Block any other bare module specifiers to keep surface minimal
  return true;
}

describe('renderer IPC boundary', () => {
  it('renderer files do not import forbidden modules', () => {
    const files = walk(RENDERER_DIR);
    const violations: { file: string; imp: string }[] = [];
    for (const f of files) {
      const content = readFileSync(f, 'utf8');
      for (const spec of findImports(content)) {
        if (isForbidden(spec)) {
          violations.push({ file: path.relative(process.cwd(), f), imp: spec });
        }
      }
    }
    const message = violations
      .map((v) => `- ${v.file}: imports "${v.imp}" (forbidden in renderer)`)
      .join('\n');
    expect(violations.length, message).toBe(0);
  });
});
