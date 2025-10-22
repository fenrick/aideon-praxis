#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const [, , sub = '', ...rest] = process.argv;
const map = new Map([
  ['sync', 'issues-sync.mjs'],
  ['mirror', 'issues-gh-mirror.mjs'],
  ['start', 'issues-start.mjs'],
  ['cleanup', 'issues-cleanup.mjs'],
  ['project', 'issues-project-sync.mjs'],
  ['dod', 'issues-dod.mjs'],
  ['linkify', 'issues-linkify.mjs'],
  ['split', 'issues-split.mjs'],
  ['backfill', 'issues-commits-backfill.mjs'],
  ['close-done', 'issues-close-done.mjs'],
  ['heuristic', 'issues-heuristic-backfill.mjs'],
]);

if (!map.has(sub)) {
  console.error(`Usage: yarn issues <${Array.from(map.keys()).join('|')}> [args...]`);
  process.exit(1);
}

const script = new URL(`./${map.get(sub)}`, import.meta.url);
const res = spawnSync('node', [script, ...rest], { stdio: 'inherit' });
process.exit(res.status ?? 1);
