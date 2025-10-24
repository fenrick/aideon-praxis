#!/usr/bin/env node
/*
 Aideon Praxis — issues sync helper
 - Parses root issues.csv (Title,Body,Labels,Milestone)
 - Generates local tracking files under docs/issues/{Milestone}/NN-slug.md
 - Maintains a map at .aideon/issues-map.json with CSV hash and GH issue numbers
 - Optional: sync to GitHub using gh CLI (create milestones, create/update issues, add to project)

 Usage:
   node scripts/issues-sync.mjs                # local sync (generate docs + map only)
   node scripts/issues-sync.mjs --check        # exit non-zero if CSV changed since last sync
   node scripts/issues-sync.mjs --to-github    # also create/update GitHub issues
   Flags:
     --project "Name"            Add issues to a GitHub Project (v2) by name, if gh supports it
     --repo owner/repo           Defaults to env AIDEON_GH_REPO or fenrick/aideon-praxis
     --dry-run                   Do not modify GH or filesystem; print plan
*/

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CSV_PATH = path.join(ROOT, 'issues.csv');
const OUT_DIR = path.join(ROOT, 'docs', 'issues');
const MAP_PATH = path.join(ROOT, '.aideon', 'issues-map.json');

const args = new Set(process.argv.slice(2));
const getArgValue = (name, fallback = undefined) => {
  const idx = process.argv.indexOf(name);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
};
const TO_GH = args.has('--to-github');
const CHECK_ONLY = args.has('--check');
const DRY = args.has('--dry-run');
const REPO = getArgValue('--repo', process.env.AIDEON_GH_REPO || 'fenrick/aideon-praxis');
const PROJECT_NAME = getArgValue('--project', process.env.AIDEON_GH_PROJECT);

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function readFileSafe(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

function writeFileIfChanged(p, content) {
  const current = readFileSafe(p);
  if (current === content) return false;
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, content, 'utf8');
  return true;
}

// Minimal CSV parser (RFC4180-ish): handles quotes, commas, newlines inside quotes
function parseCSV(text) {
  const rows = [];
  let i = 0;
  const n = text.length;
  let field = '';
  let row = [];
  let inQuotes = false;
  while (i < n) {
    const ch = text[i++];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (ch === '\r') {
        // ignore
      } else {
        field += ch;
      }
    }
  }
  // last field
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function toSlug(s) {
  return s
    .toLowerCase()
    .replace(/m(\d)\s*:/g, 'm$1-')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function loadMap() {
  const txt = readFileSafe(MAP_PATH);
  if (!txt) return { csvHash: null, items: {} };
  try {
    return JSON.parse(txt);
  } catch {
    return { csvHash: null, items: {} };
  }
}

function saveMap(map) {
  ensureDir(path.dirname(MAP_PATH));
  fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2));
}

function ghExists() {
  return spawnSync('gh', ['--version'], { encoding: 'utf8' }).status === 0;
}

function gh(argsArr, input = undefined) {
  const res = spawnSync('gh', argsArr, { encoding: 'utf8', input });
  if (res.status !== 0) {
    throw new Error(`gh ${argsArr.join(' ')} failed: ${res.stderr || res.stdout}`);
  }
  return res.stdout.trim();
}

function ensureMilestone(title) {
  const list = gh(['api', `repos/${REPO}/milestones?state=all`]);
  const arr = JSON.parse(list);
  const found = arr.find((m) => m.title === title);
  if (found) return found.number;
  const created = gh(['api', `repos/${REPO}/milestones`, '-X', 'POST', '-f', `title=${title}`]);
  return JSON.parse(created).number;
}

function ensureLabel(name) {
  try {
    gh(['api', `repos/${REPO}/labels/${encodeURIComponent(name)}`]);
    return;
  } catch {}
  // Pick a deterministic color based on hash
  const hex = sha256(name).slice(0, 6);
  try {
    gh(['api', `repos/${REPO}/labels`, '-X', 'POST', '-f', `name=${name}`, '-f', `color=${hex}`]);
  } catch (e) {
    console.warn(`[warn] Could not create label '${name}': ${e.message}`);
  }
}

function createOrUpdateIssue(item, existingNumber) {
  const labelsArg = item.Labels
    ? item.Labels.split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const milestone = item.Milestone?.trim() || undefined;
  if (milestone) ensureMilestone(milestone);

  if (!existingNumber) {
    // Ensure labels exist before create
    labelsArg.forEach((l) => ensureLabel(l));
    const out = gh([
      'issue',
      'create',
      '-R',
      REPO,
      '--title',
      item.Title,
      '--body',
      item.Body || '',
      ...labelsArg.flatMap((l) => ['--label', l]),
      ...(milestone ? ['--milestone', milestone] : []),
    ]);
    // gh returns URL. Extract number via API
    const url = out.split('\n').pop();
    const match = url?.match(/\/issues\/(\d+)/);
    return match ? Number(match[1]) : undefined;
  }
  // Update
  // Ensure labels exist before update
  labelsArg.forEach((l) => ensureLabel(l));
  gh([
    'issue',
    'edit',
    String(existingNumber),
    '-R',
    REPO,
    '--title',
    item.Title,
    '--body',
    item.Body || '',
    ...labelsArg.flatMap((l) => ['--add-label', l]),
    ...(milestone ? ['--milestone', milestone] : []),
  ]);
  return existingNumber;
}

function addToProject(issueNumber, projectName) {
  if (!projectName) return;
  // Best-effort: gh supports adding by name in v2
  try {
    gh(['issue', 'edit', String(issueNumber), '-R', REPO, '--add-project', projectName]);
  } catch (e) {
    console.warn(`[warn] Failed to add #${issueNumber} to project '${projectName}': ${e.message}`);
  }
}

// Main
const csvText = readFileSafe(CSV_PATH);
if (!csvText) {
  console.error('issues-sync: issues.csv not found at repo root');
  process.exit(2);
}
const csvHash = sha256(csvText);
const rows = parseCSV(csvText);
if (rows.length < 2) {
  console.error('issues-sync: issues.csv seems empty or has no data rows');
  process.exit(2);
}
const headers = rows[0].map((h) => h.trim());
const idx = {
  Title: headers.indexOf('Title'),
  Body: headers.indexOf('Body'),
  Labels: headers.indexOf('Labels'),
  Milestone: headers.indexOf('Milestone'),
};
for (const [k, v] of Object.entries(idx)) {
  if (v === -1) {
    console.error(`issues-sync: missing column '${k}'`);
    process.exit(2);
  }
}

const items = rows
  .slice(1)
  .map((r) => ({
    Title: r[idx.Title]?.trim() || '',
    Body: r[idx.Body]?.trim() || '',
    Labels: r[idx.Labels]?.trim() || '',
    Milestone: r[idx.Milestone]?.trim() || '',
  }))
  .filter((x) => x.Title);

const map = loadMap();

if (CHECK_ONLY) {
  if (map.csvHash && map.csvHash === csvHash) {
    console.log('issues-sync: OK — CSV already synced');
    process.exit(0);
  }
  console.error('issues-sync: CSV changed — run `yarn issues:sync`');
  process.exit(1);
}

// Generate local tracking files
let writes = 0;
let created = 0;
const milestoneBuckets = new Map();
items.forEach((it) => {
  const ms = it.Milestone || 'Uncategorized';
  if (!milestoneBuckets.has(ms)) milestoneBuckets.set(ms, []);
  milestoneBuckets.get(ms).push(it);
});

for (const [ms, list] of milestoneBuckets) {
  const dir = path.join(OUT_DIR, toSlug(ms));
  ensureDir(dir);
  list.forEach((it, i) => {
    const slug = `${String(i + 1).padStart(2, '0')}-${toSlug(it.Title)}`;
    const file = path.join(dir, `${slug}.md`);
    const rec = map.items?.[it.Title] || {};
    const frontMatter = [
      '---',
      `title: ${it.Title.replace(/:/g, '-')}`,
      `milestone: ${it.Milestone}`,
      `labels: ${JSON.stringify(
        it.Labels
          ? it.Labels.split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      )}`,
      `github: ${rec.number || ''}`,
      '---',
      '',
    ].join('\n');
    const body = `${frontMatter}${it.Body}\n`;
    const changed = !DRY && writeFileIfChanged(file, body);
    if (changed) writes++;
    if (changed) created++;
  });
}

// Sync to GitHub if requested
if (TO_GH) {
  if (!ghExists()) {
    console.error('issues-sync: gh CLI not found. Install https://cli.github.com/');
    process.exit(2);
  }
  // Ensure milestones and create issues
  for (const it of items) {
    const existing = map.items?.[it.Title]?.number;
    const number = DRY ? existing || 0 : createOrUpdateIssue(it, existing);
    if (!map.items) map.items = {};
    map.items[it.Title] = { number };
    if (!DRY && number && PROJECT_NAME) addToProject(number, PROJECT_NAME);
  }
}

if (!DRY) {
  map.csvHash = csvHash;
  saveMap(map);
}

console.log(
  `issues-sync: ${CHECK_ONLY ? 'checked' : 'synced'} ${items.length} items; ` +
    `${writes} file(s) ${CHECK_ONLY ? 'would change' : 'updated'}.`,
);
