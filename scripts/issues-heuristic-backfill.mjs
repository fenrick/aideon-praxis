#!/usr/bin/env node
/*
 Heuristic backfill: associate commits with likely issues by title/label/path overlap and comment.

 Usage: node scripts/issues-heuristic-backfill.mjs [--since 2024-01-01] [--ref main] [--dry-run] [--limit 500]

 Notes:
 - Skips commits already processed in .aideon/commit-links.json
 - Conservative thresholds to minimise noise; prefers module/area label matches
*/
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const REPO = process.env.AIDEON_GH_REPO || 'fenrick/aideon-praxis';
const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const SINCE = getArg(
  '--since',
  new Date(Date.now() - 120 * 24 * 3600 * 1000).toISOString().slice(0, 10),
);
const REF = getArg('--ref', 'main');
const DRY = args.includes('--dry-run');
const LIMIT = Number(getArg('--limit', '500'));
const SNAP = path.join(process.cwd(), '.aideon', 'commit-links.json');

function sh(cmd, argv) {
  const r = spawnSync(cmd, argv, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`${cmd} ${argv.join(' ')} failed: ${r.stderr || r.stdout}`);
  return r.stdout.trim();
}
function gh(argv) {
  return sh('gh', argv);
}
function ensureSnap() {
  fs.mkdirSync(path.dirname(SNAP), { recursive: true });
  if (!fs.existsSync(SNAP)) fs.writeFileSync(SNAP, JSON.stringify({ items: {} }, null, 2));
}
function loadSnap() {
  ensureSnap();
  return JSON.parse(fs.readFileSync(SNAP, 'utf8'));
}
function saveSnap(s) {
  fs.writeFileSync(SNAP, JSON.stringify(s, null, 2));
}

function listIssuesAll() {
  const [owner, name] = REPO.split('/');
  const acc = [];
  let page = 1;
  const per = 100;
  for (;;) {
    const out = gh(['api', `repos/${owner}/${name}/issues?state=all&per_page=${per}&page=${page}`]);
    const arr = JSON.parse(out).filter((x) => !x.pull_request);
    if (!arr.length) break;
    acc.push(...arr);
    if (arr.length < per) break;
    page++;
  }
  return acc.map((i) => ({
    number: i.number,
    title: i.title,
    state: i.state,
    milestone: i.milestone?.title || null,
    labels: (i.labels || []).map((l) => (typeof l === 'string' ? l : l.name)),
  }));
}

function listCommits() {
  const out = sh('git', [
    'log',
    REF,
    `--since=${SINCE}`,
    '--no-merges',
    `--max-count=${LIMIT}`,
    '--pretty=format:%H%x09%ad%x09%s',
    '--date=iso-strict',
  ]);
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [sha, date, subject] = line.split('\t');
      return { sha, date, subject };
    });
}

function changedFiles(sha) {
  const out = sh('git', ['show', '--name-only', '--pretty=format:', sha]);
  return out.split('\n').filter(Boolean);
}

const STOP = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'for',
  'of',
  'to',
  'in',
  'v1',
  'v2',
  'm0',
  'm1',
  'm2',
  'm3',
  'm4',
  'm5',
  'm6',
  'ci',
  'docs',
]);
function tokens(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t));
}

function score(subjectTokens, titleTokens) {
  const s = new Set(subjectTokens);
  let hit = 0;
  for (const t of titleTokens) {
    if (s.has(t)) hit++;
  }
  const denom = Math.max(subjectTokens.length, titleTokens.length, 1);
  return hit / denom;
}

function pathTags(files) {
  const tags = new Set();
  for (const f of files) {
    if (f.startsWith('packages/worker')) tags.add('module/metis');
    if (f.startsWith('packages/app')) tags.add('module/praxis');
    if (f.startsWith('packages/adapters')) tags.add('module/praxis');
    if (f.startsWith('docs/')) tags.add('type/docs');
    if (f.includes('electron') || f.includes('preload') || f.includes('renderer'))
      tags.add('area/ui');
    if (f.includes('ci') || f.includes('.github')) tags.add('area/ci');
  }
  return tags;
}

function chooseIssue(commit, issues) {
  const subjT = tokens(commit.subject);
  const files = changedFiles(commit.sha);
  const tags = pathTags(files);
  let best = { num: null, score: 0, why: '' };
  for (const it of issues) {
    const titleT = tokens(it.title);
    const s = score(subjT, titleT);
    // boost by label intersection with path-derived tags
    const lbl = new Set(it.labels || []);
    let boost = 0;
    for (const t of tags) {
      if (lbl.has(t)) boost += 0.15;
    }
    const total = s + boost;
    if (total > best.score) {
      best = {
        num: it.number,
        score: total,
        why: `overlap=${s.toFixed(2)} boost=${boost.toFixed(2)}`,
      };
    }
  }
  return best.score >= 0.55 ? best : { num: null, score: 0, why: '' };
}

function commentIssue(num, commit) {
  const url = `https://github.com/${REPO}/commit/${commit.sha}`;
  const body = `Heuristic association: commit ${commit.sha.slice(0, 7)} on ${commit.date.split('T')[0]}\n\n${commit.subject}\n\n${url}`;
  if (DRY) return;
  gh(['issue', 'comment', String(num), '-R', REPO, '--body', body]);
}

try {
  const issues = listIssuesAll();
  const snap = loadSnap();
  let linked = 0,
    considered = 0;
  for (const c of listCommits()) {
    considered++;
    if (snap.items && Object.values(snap.items).some((v) => (v.shas || []).includes(c.sha)))
      continue;
    const best = chooseIssue(c, issues);
    if (best.num) {
      commentIssue(best.num, c);
      snap.items[best.num] ||= { shas: [] };
      snap.items[best.num].shas.push(c.sha);
      linked++;
    }
  }
  if (!DRY) saveSnap(snap);
  console.log(`heuristic-backfill: considered ${considered}, linked ${linked}.`);
} catch (e) {
  console.error(`[issues-heuristic-backfill] ${e.message}`);
  process.exit(2);
}
