#!/usr/bin/env node
/*
 Set due dates for repository milestones.

 Sources:
 - Env AIDEON_MILESTONE_DATES: JSON mapping {"M0 Foundations":"2025-10-31", ...}
 - Fallback: end-of-month cadence from current month for known milestones M0..M6.

 Usage: node scripts/milestones-set-dates.mjs [--dry-run]
*/
import 'dotenv/config';
import { spawnSync } from 'node:child_process';

const REPO = process.env.AIDEON_GH_REPO || 'fenrick/aideon-praxis';
const DRY = process.argv.includes('--dry-run');

function gh(args) {
  const r = spawnSync('gh', args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`gh ${args.join(' ')} failed: ${r.stderr || r.stdout}`);
  return r.stdout.trim();
}

function eom(y, m) {
  return new Date(Date.UTC(y, m + 1, 0, 23, 59, 59));
}

function defaultSchedule() {
  const now = new Date();
  const startY = now.getUTCFullYear();
  const startM = now.getUTCMonth();
  const names = [
    'M0 Foundations',
    'M1 Local App MVP',
    'M2 Python Worker MVP',
    'M3 Data Onboarding & APIs',
    'M4 Automation & Connector #1',
    'M5 Cloud/Server Mode',
    'M6 Docs & Extensibility',
  ];
  const map = {};
  names.forEach((n, i) => {
    const d = eom(startY + Math.floor((startM + i) / 12), (startM + i) % 12);
    map[n] = d.toISOString().slice(0, 10);
  });
  return map;
}

function loadMapping() {
  try {
    if (process.env.AIDEON_MILESTONE_DATES) {
      const m = JSON.parse(process.env.AIDEON_MILESTONE_DATES);
      return m;
    }
  } catch {}
  return defaultSchedule();
}

function listMilestones() {
  const out = gh(['api', `repos/${REPO}/milestones?state=all&per_page=100`]);
  return JSON.parse(out).map((m) => ({ number: m.number, title: m.title, due_on: m.due_on }));
}

function setDue(number, date) {
  if (DRY) {
    console.log(`[dry] set #${number} due_on=${date}`);
    return;
  }
  gh([
    'api',
    `repos/${REPO}/milestones/${number}`,
    '-X',
    'PATCH',
    '-f',
    `due_on=${date}T23:59:59Z`,
  ]);
}

try {
  const mapping = loadMapping();
  const miles = listMilestones();
  let changed = 0;
  for (const m of miles) {
    const target = mapping[m.title];
    if (!target) continue;
    const cur = (m.due_on || '').slice(0, 10);
    if (cur !== target) {
      setDue(m.number, target);
      changed++;
      console.log(`milestone: '${m.title}' due_on: ${cur || '(none)'} -> ${target}`);
    }
  }
  console.log(`milestones-set-dates: ${changed} milestone(s) updated.`);
} catch (e) {
  console.error(`[milestones-set-dates] ${e.message}`);
  process.exit(2);
}
