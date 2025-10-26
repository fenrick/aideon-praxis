#!/usr/bin/env node
/*
 Create linked secondary issues from a parent issue and update the parent checklist.

 Usage:
   node scripts/issues-split.mjs <parent-issue-number> --file tasks.txt [--label type/task] [--status-label status/todo]
   node scripts/issues-split.mjs <parent-issue-number> --items "Task A" "Task B" ...

 Env:
   AIDEON_GH_REPO=owner/repo (default fenrick/aideon-praxis)
   AIDEON_GH_PROJECT_OWNER / AIDEON_GH_PROJECT_NUMBER (optional; project sync runs if set)
*/
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const REPO = process.env.AIDEON_GH_REPO || 'fenrick/aideon-praxis';
const PARENT = Number(process.argv[2] || 0);
if (!PARENT) {
  console.error(
    'usage: node scripts/issues-split.mjs <parent-issue-number> --file tasks.txt | --items "A" "B"',
  );
  process.exit(2);
}
const args = process.argv.slice(3);
const getArg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const FILE = getArg('--file', null);
const LABEL = getArg('--label', 'type/task');
const STATUS_LABEL = getArg('--status-label', 'status/todo');
const ITEMS = args.includes('--items') ? args.slice(args.indexOf('--items') + 1) : null;

function sh(cmd, argv, input) {
  const res = spawnSync(cmd, argv, { encoding: 'utf8', input });
  if (res.status !== 0)
    throw new Error(`${cmd} ${argv.join(' ')} failed: ${res.stderr || res.stdout}`);
  return res.stdout.trim();
}
function gh(argv, input) {
  return sh('gh', argv, input);
}
function pnpm(argv) {
  try {
    return sh('pnpm', ['run', ...argv]);
  } catch {
    return '';
  }
}

function readTasks() {
  if (FILE)
    return fs
      .readFileSync(FILE, 'utf8')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  if (ITEMS) return ITEMS.filter((s) => s && s !== '--');
  return [];
}

function getParent() {
  const out = gh(['api', `repos/${REPO}/issues/${PARENT}`]);
  return JSON.parse(out);
}

function ensureLabel(name) {
  try {
    gh(['api', `repos/${REPO}/labels/${encodeURIComponent(name)}`]);
  } catch {
    gh(['api', `repos/${REPO}/labels`, '-X', 'POST', '-f', `name=${name}`, '-f', 'color=888888']);
  }
}

const parent = getParent();
const inherit = (prefix) =>
  (parent.labels || [])
    .map((l) => (typeof l === 'string' ? l : l.name))
    .filter((n) => n.startsWith(prefix));
const inheritLabels = [
  LABEL,
  STATUS_LABEL,
  ...inherit('priority/'),
  ...inherit('area/'),
  ...inherit('module/'),
];
inheritLabels.forEach(ensureLabel);

const milestone = parent.milestone?.title ? parent.milestone.title : null;
const tasks = readTasks();
if (tasks.length === 0) {
  console.error('No tasks provided. Use --file or --items.');
  process.exit(2);
}

const created = [];
for (const title of tasks) {
  const body = `Parent: #${PARENT}`;
  const argsCreate = ['issue', 'create', '-R', REPO, '--title', title, '--body', body];
  for (const l of inheritLabels) argsCreate.push('--label', l);
  if (milestone) argsCreate.push('--milestone', milestone);
  const out = gh(argsCreate);
  const url = out.trim().split('\n').pop();
  const m = url.match(/\/issues\/(\d+)/);
  if (!m) continue;
  const num = Number(m[1]);
  created.push({ num, title, url });
  // Add to project if configured (best-effort)
  try {
    pnpm(['issues:project', '--only', String(num)]);
  } catch {}
}

// Update parent body with checklist
const origBody = parent.body || '';
const hdr = '## Subtasks';
const checklist = created.map((c) => `- [ ] ${c.title} (#${c.num})`).join('\n');
let newBody;
if (origBody.includes(hdr)) {
  newBody = origBody.replace(new RegExp(`${hdr}[\s\S]*?$`, 'm'), `${hdr}\n\n${checklist}`);
} else {
  newBody = `${origBody}\n\n${hdr}\n\n${checklist}\n`;
}
gh(['issue', 'edit', String(PARENT), '-R', REPO, '--body', newBody]);
gh([
  'issue',
  'comment',
  String(PARENT),
  '-R',
  REPO,
  '--body',
  `Created ${created.length} linked sub-issue(s) and updated checklist.`,
]);

// Mirror docs
try {
  pnpm(['issues:mirror']);
} catch {}

console.log(`Created ${created.length} sub-issue(s).`);
