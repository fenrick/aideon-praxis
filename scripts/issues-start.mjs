#!/usr/bin/env node
/*
 Mark a GitHub issue as in-progress, assign to current user, create a branch, and refresh local mirror.

 Usage:
   node scripts/issues-start.mjs <issue-number>

 Optional flags:
   --repo owner/repo   Defaults to env AIDEON_GH_REPO or fenrick/aideon-praxis
   --no-branch         Do not create a local branch
   --label name        Label to add (default: status/in-progress). Created if missing.
*/

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const argv = process.argv.slice(2);
if (argv.length === 0) {
  console.error('usage: node scripts/issues-start.mjs <issue-number> [--repo owner/repo]');
  process.exit(2);
}
const num = argv[0];
const getArg = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
};
const REPO = getArg('--repo', process.env.AIDEON_GH_REPO || 'fenrick/aideon-praxis');
const NO_BRANCH = argv.includes('--no-branch');
const LABEL = getArg('--label', 'status/in-progress');

function sh(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed: ${res.stderr || res.stdout}`);
  }
  return res.stdout.trim();
}

function gh(args) {
  return sh('gh', args);
}
function git(args) {
  return sh('git', args);
}

// Ensure label exists (best-effort)
try {
  gh(['api', `repos/${REPO}/labels/${encodeURIComponent(LABEL)}`]);
} catch {
  try {
    gh(['api', `repos/${REPO}/labels`, '-X', 'POST', '-f', `name=${LABEL}`, '-f', 'color=0e8a16']);
  } catch {}
}

// Assign to current user, add new status label, and remove conflicting ones
try {
  const who = gh(['api', 'user']);
  const login = JSON.parse(who).login;
  gh(['issue', 'edit', num, '-R', REPO, '--add-label', LABEL, '--add-assignee', login]);
  // Remove older status labels to keep a single status/* at a time
  const statusLabels = ['status/todo', 'status/blocked', 'status/done', 'status/in-progress'];
  for (const l of statusLabels) {
    if (l !== LABEL) {
      try {
        gh(['issue', 'edit', num, '-R', REPO, '--remove-label', l]);
      } catch {}
    }
  }
  gh([
    'issue',
    'comment',
    num,
    '-R',
    REPO,
    '--body',
    'Starting work: marking in progress, cleaning old status labels, and creating a branch.',
  ]);
} catch (e) {
  console.error(e.message);
  process.exit(2);
}

// Create a local branch if not disabled
if (!NO_BRANCH) {
  // Fetch issue title for a friendly branch name
  const raw = gh(['api', `repos/${REPO}/issues/${num}`]);
  const issue = JSON.parse(raw);
  const slug = issue.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  const branch = `issue-${num}-${slug}`.slice(0, 80);
  try {
    git(['rev-parse', '--verify', branch]);
  } catch {
    git(['checkout', '-b', branch]);
  }
  console.log(`Switched to branch ${branch}`);
}

// Refresh local mirror (non-fatal if scripts missing)
try {
  if (existsSync('package.json')) {
    sh('pnpm', ['run', 'issues:mirror']);
    // Update project status if configured
    try {
      sh('pnpm', ['run', 'issues:project', '--only', String(num)]);
    } catch {}
  }
} catch {}

console.log(`Issue #${num} marked in-progress and mirrored.`);
