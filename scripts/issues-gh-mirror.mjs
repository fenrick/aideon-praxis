#!/usr/bin/env node
/*
 Mirror GitHub issues -> docs/issues/*.md treating GitHub as the source of truth.

 Commands:
   node scripts/issues-gh-mirror.mjs            # pull and write local markdown mirror
   node scripts/issues-gh-mirror.mjs --check    # exit 1 if GH changed since last mirror

 Flags:
   --repo owner/repo     Defaults to env AIDEON_GH_REPO or fenrick/aideon-praxis
   --include-closed      Include closed issues (default: true)
   --exclude-closed      Only open issues
   --dry-run             Do not write files; print summary

 Notes:
   - Requires GitHub CLI `gh` authenticated for the repo.
   - Stores snapshot at `.aideon/issues-gh-snapshot.json` (numbers + updated_at).
*/

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'issues');
const SNAP_PATH = path.join(ROOT, '.aideon', 'issues-gh-snapshot.json');

const args = new Set(process.argv.slice(2));
const getArg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const REPO = getArg('--repo', process.env.AIDEON_GH_REPO || 'fenrick/aideon-praxis');
const CHECK = args.has('--check');
const DRY = args.has('--dry-run');
const INCLUDE_CLOSED = args.has('--exclude-closed') ? false : true;

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}
function readJSON(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}
function writeFileIfChanged(p, content) {
  const cur = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  if (cur === content) return false;
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, content, 'utf8');
  return true;
}
function toSlug(s) {
  return String(s || 'uncategorized')
    .toLowerCase()
    .replace(/m(\d)\s*:/g, 'm$1-')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function gh(argsArr) {
  const res = spawnSync('gh', argsArr, { encoding: 'utf8' });
  if (res.status !== 0) {
    throw new Error(`gh ${argsArr.join(' ')} failed: ${res.stderr || res.stdout}`);
  }
  return res.stdout.trim();
}

function listMilestones() {
  const out = gh(['api', `repos/${REPO}/milestones?state=all&per_page=100`]);
  return JSON.parse(out);
}

function listIssuesForMilestone(msNumber) {
  const state = INCLUDE_CLOSED ? 'all' : 'open';
  let page = 1;
  const per = 100;
  const items = [];
  for (;;) {
    const out = gh([
      'api',
      `repos/${REPO}/issues?state=${state}&milestone=${msNumber}&per_page=${per}&page=${page}`,
    ]);
    const arr = JSON.parse(out);
    items.push(...arr);
    if (arr.length < per) break;
    page++;
  }
  return items;
}

function listIssuesNoMilestone() {
  const state = INCLUDE_CLOSED ? 'all' : 'open';
  let page = 1;
  const per = 100;
  const items = [];
  for (;;) {
    const out = gh([
      'api',
      `repos/${REPO}/issues?state=${state}&milestone=none&per_page=${per}&page=${page}`,
    ]);
    const arr = JSON.parse(out);
    items.push(...arr);
    if (arr.length < per) break;
    page++;
  }
  return items;
}

function frontMatter(issue, milestoneTitle) {
  const labels =
    issue.labels?.map((l) => (typeof l === 'string' ? l : l.name)).filter(Boolean) || [];
  const lines = [
    '---',
    `title: ${issue.title.replace(/:/g, '-')}`,
    `milestone: ${milestoneTitle || ''}`,
    `labels: ${JSON.stringify(labels)}`,
    `github: ${issue.number}`,
    `state: ${issue.state}`,
    `url: ${issue.html_url}`,
    `updated_at: ${issue.updated_at}`,
    '---',
    '',
  ];
  return lines.join('\n');
}

function writeIssueMarkdown(issue, milestoneTitle, index) {
  const dir = path.join(OUT_DIR, toSlug(milestoneTitle || 'No milestone'));
  ensureDir(dir);
  const slug = `${String(index).padStart(3, '0')}-${toSlug(issue.title)}`;
  const file = path.join(dir, `${slug}.md`);
  const body = `${frontMatter(issue, milestoneTitle)}${issue.body || ''}\n`;
  return writeFileIfChanged(file, body);
}

function snapshotFromIssues(issues) {
  return issues
    .map((i) => ({ number: i.number, updated_at: i.updated_at, state: i.state }))
    .sort((a, b) => a.number - b.number);
}

function flatIssues(milestones, noMsIssues) {
  const all = [];
  for (const ms of milestones) all.push(...ms.issues);
  all.push(...noMsIssues);
  return all;
}

// Main
try {
  const milestones = listMilestones().map((m) => ({
    number: m.number,
    title: m.title,
    issues: [],
  }));
  for (const ms of milestones) {
    ms.issues = listIssuesForMilestone(ms.number);
  }
  const noMsIssues = listIssuesNoMilestone();

  const allIssues = flatIssues(milestones, noMsIssues);
  const newSnap = snapshotFromIssues(allIssues);
  const oldSnap = readJSON(SNAP_PATH, { items: [] }).items || [];

  if (CHECK) {
    const sameLength = newSnap.length === oldSnap.length;
    const same =
      sameLength &&
      newSnap.every(
        (x, i) =>
          x.number === oldSnap[i].number &&
          x.updated_at === oldSnap[i].updated_at &&
          x.state === oldSnap[i].state,
      );
    if (same) {
      console.log('issues-gh-mirror: OK — local docs are current with GitHub');
      process.exit(0);
    }
    console.error('issues-gh-mirror: GitHub changed — run `yarn issues:mirror`');
    process.exit(1);
  }

  // Write docs
  let writes = 0;
  for (const ms of milestones) {
    const sorted = [...ms.issues].sort((a, b) => a.number - b.number);
    sorted.forEach((issue, i) => {
      const changed = DRY ? false : writeIssueMarkdown(issue, ms.title, i + 1);
      if (changed) writes++;
    });
  }
  // No milestone bucket
  const sortedNoMs = [...noMsIssues].sort((a, b) => a.number - b.number);
  sortedNoMs.forEach((issue, i) => {
    const changed = DRY ? false : writeIssueMarkdown(issue, 'No milestone', i + 1);
    if (changed) writes++;
  });

  if (!DRY) {
    ensureDir(path.dirname(SNAP_PATH));
    fs.writeFileSync(SNAP_PATH, JSON.stringify({ repo: REPO, items: newSnap }, null, 2));
  }
  console.log(`issues-gh-mirror: mirrored ${allIssues.length} issues; ${writes} file(s) updated.`);
} catch (e) {
  console.error(`[issues-gh-mirror] ${e.message}`);
  process.exit(2);
}
