#!/usr/bin/env node
/*
 Ensure a baseline label set exists in the repository.

 Usage: node scripts/labels-bootstrap.mjs
 Env: AIDEON_GH_REPO=owner/repo (default fenrick/aideon-praxis)
*/
import 'dotenv/config';
import { spawnSync } from 'node:child_process';

const REPO = process.env.AIDEON_GH_REPO || 'fenrick/aideon-praxis';

const LABELS = [
  // Status
  { name: 'status/todo', color: 'bfd4f2', description: 'Planned, not started' },
  { name: 'status/in-progress', color: '0e8a16', description: 'Actively being worked' },
  { name: 'status/blocked', color: 'b60205', description: 'Blocked on dependency' },
  { name: 'status/done', color: '5319e7', description: 'Completed' },
  // Priority
  { name: 'priority/P1', color: 'd93f0b' },
  { name: 'priority/P2', color: 'fbca04' },
  { name: 'priority/P3', color: 'c2e0c6' },
  // Type
  { name: 'type/feature', color: '0052cc' },
  { name: 'type/task', color: '5319e7' },
  { name: 'type/chore', color: 'fef2c0' },
  { name: 'type/docs', color: '0e8a16' },
  { name: 'type/decision', color: '006b75' },
  // Areas (examples from CSV)
  { name: 'area/platform', color: '1d76db' },
  { name: 'area/ci', color: '5319e7' },
  { name: 'area/security', color: 'b60205' },
  { name: 'area/adapters', color: '0052cc' },
  { name: 'area/ui', color: 'c2e0c6' },
  { name: 'area/integration', color: 'd4c5f9' },
  { name: 'area/analytics', color: 'f9d0c4' },
  { name: 'area/time', color: '0366d6' },
  { name: 'area/api', color: 'bcccdc' },
  { name: 'area/perf', color: 'bfd4f2' },
  { name: 'area/docs', color: 'e4e669' },
  { name: 'area/governance', color: '5319e7' },
  { name: 'area/automation', color: 'd93f0b' },
  // Modules
  { name: 'module/praxis', color: '0052cc' },
  { name: 'module/chrona', color: 'fbca04' },
  { name: 'module/metis', color: '0e8a16' },
  { name: 'module/continuum', color: '5319e7' },
];

function gh(args) {
  const res = spawnSync('gh', args, { encoding: 'utf8' });
  if (res.status !== 0) throw new Error(`gh ${args.join(' ')} failed: ${res.stderr || res.stdout}`);
  return res.stdout.trim();
}

for (const l of LABELS) {
  try {
    gh(['api', `repos/${REPO}/labels/${encodeURIComponent(l.name)}`]);
    // exists → update color/description to keep consistent
    gh([
      'api',
      `repos/${REPO}/labels/${encodeURIComponent(l.name)}`,
      '-X',
      'PATCH',
      '-f',
      `color=${l.color}`,
      ...(l.description ? ['-f', `description=${l.description}`] : []),
    ]);
    console.log(`updated: ${l.name}`);
  } catch {
    gh([
      'api',
      `repos/${REPO}/labels`,
      '-X',
      'POST',
      '-f',
      `name=${l.name}`,
      '-f',
      `color=${l.color}`,
      ...(l.description ? ['-f', `description=${l.description}`] : []),
    ]);
    console.log(`created: ${l.name}`);
  }
}
console.log('labels-bootstrap: done');
