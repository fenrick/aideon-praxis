#!/usr/bin/env node
/*
 Link PRs to issues with a commentary comment, avoiding duplicates.

 - Finds PRs updated in the last N days (default 14)
 - For each PR, gets closingIssuesReferences and linked issues
 - Adds a comment to the issue summarizing PR URL and state, unless already commented
 - Tracks processed PR numbers in .aideon/linked-prs.json

 Usage: node scripts/issues-linkify.mjs [--days 14] [--dry-run]
*/
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REPO = process.env.AIDEON_GH_REPO || 'fenrick/aideon-praxis';
const SNAP = path.join(process.cwd(), '.aideon', 'linked-prs.json');
const DRY = process.argv.includes('--dry-run');
const daysIdx = process.argv.indexOf('--days');
const DAYS = daysIdx >= 0 ? Number(process.argv[daysIdx + 1]) : 14;

function gh(args) {
  const res = spawnSync('gh', args, { encoding: 'utf8' });
  if (res.status !== 0) throw new Error(`gh ${args.join(' ')} failed: ${res.stderr || res.stdout}`);
  return res.stdout.trim();
}

function readSnap() {
  try {
    return JSON.parse(fs.readFileSync(SNAP, 'utf8'));
  } catch {
    return { prs: [] };
  }
}

function saveSnap(s) {
  fs.mkdirSync(path.dirname(SNAP), { recursive: true });
  fs.writeFileSync(SNAP, JSON.stringify(s, null, 2));
}

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function listPRs() {
  const since = isoDaysAgo(DAYS);
  const out = gh([
    'pr',
    'list',
    '-R',
    REPO,
    '--state',
    'all',
    '--search',
    `updated:>=${since}`,
    '--json',
    'number,url,state,title,updatedAt',
  ]);
  return JSON.parse(out);
}

function prIssues(prNumber) {
  const out = gh([
    'pr',
    'view',
    String(prNumber),
    '-R',
    REPO,
    '--json',
    'number,url,state,closingIssuesReferences',
  ]);
  const j = JSON.parse(out);
  return j.closingIssuesReferences?.map((i) => i.number) || [];
}

function comment(issueNumber, text) {
  gh(['issue', 'comment', String(issueNumber), '-R', REPO, '--body', text]);
}

try {
  const snap = readSnap();
  const prs = listPRs();
  for (const pr of prs) {
    if (snap.prs.includes(pr.number)) continue;
    const issues = prIssues(pr.number);
    if (issues.length === 0) continue;
    const text = `Linked PR ${pr.url} (${pr.state}).`;
    for (const n of issues) {
      if (DRY) console.log(`[dry] issue #${n}: ${text}`);
      else comment(n, text);
    }
    snap.prs.push(pr.number);
  }
  if (!DRY) saveSnap(snap);
  console.log(`issues-linkify: processed ${prs.length} PR(s).`);
} catch (e) {
  console.error(`[issues-linkify] ${e.message}`);
  process.exit(2);
}
