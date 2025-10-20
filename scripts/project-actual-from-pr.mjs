#!/usr/bin/env node
/*
 Set "Actual Ship" date for issues referenced by a merged PR, using the PR mergedAt date.

 Env:
  - AIDEON_GH_REPO=owner/repo (default: repo of this checkout)
  - AIDEON_GH_PROJECT_OWNER
  - AIDEON_GH_PROJECT_NUMBER

 Usage:
  node scripts/project-actual-from-pr.mjs <pr-number> [--dry-run]
*/
import 'dotenv/config';
import { spawnSync } from 'node:child_process';

const DRY = process.argv.includes('--dry-run');
const prArg = process.argv.find((a) => /^\d+$/.test(a));
if (!prArg) {
  console.error('usage: node scripts/project-actual-from-pr.mjs <pr-number> [--dry-run]');
  process.exit(2);
}
const PR = Number(prArg);

const REPO = process.env.AIDEON_GH_REPO || process.env.GITHUB_REPOSITORY || '';
const [OWNER, NAME] = REPO.split('/');
const PROJECT_OWNER = process.env.AIDEON_GH_PROJECT_OWNER || OWNER;
const PROJECT_NUMBER = Number(process.env.AIDEON_GH_PROJECT_NUMBER || '0');

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed: ${r.stderr || r.stdout}`);
  return r.stdout.trim();
}
function gh(args) {
  return sh('gh', args);
}
function gql(query) {
  const out = gh(['api', 'graphql', '-f', `query=${query}`]);
  const j = JSON.parse(out);
  if (j.errors && j.errors.length) throw new Error(j.errors[0].message || 'GraphQL error');
  return j.data || j;
}

function projectId() {
  const out = gh([
    'project',
    'view',
    String(PROJECT_NUMBER),
    '--owner',
    PROJECT_OWNER,
    '--format',
    'json',
  ]);
  return JSON.parse(out).id;
}

function fieldIdByName(name) {
  const out = gh([
    'project',
    'field-list',
    String(PROJECT_NUMBER),
    '--owner',
    PROJECT_OWNER,
    '--format',
    'json',
  ]);
  const j = JSON.parse(out);
  const f = (j.fields || j).find((x) => x.name === name);
  return f?.id || null;
}

function prInfo(number) {
  const q = `query{ repository(owner:"${OWNER}",name:"${NAME}"){ pullRequest(number:${number}){ number merged mergedAt closingIssuesReferences(first:50){ nodes { number } } } } }`;
  const d = gql(q);
  const pr = d.repository?.pullRequest;
  if (!pr) throw new Error(`PR #${number} not found`);
  return pr;
}

function issueProjectItemId(issueNumber, projId) {
  const q = `query{ repository(owner:"${OWNER}",name:"${NAME}"){ issue(number:${issueNumber}){ projectItems(first:50){ nodes{ id project{ id } } } } } }`;
  const d = gql(q);
  const nodes = d.repository?.issue?.projectItems?.nodes || [];
  const item = nodes.find((n) => n.project?.id === projId);
  return item?.id || null;
}

function setDate(projectId, itemId, fieldId, yyyyMmDd) {
  if (DRY) {
    console.log(`[dry] set item=${itemId} field=${fieldId} -> ${yyyyMmDd}`);
    return;
  }
  const m = `mutation{ updateProjectV2ItemFieldValue(input:{projectId:"${projectId}",itemId:"${itemId}",fieldId:"${fieldId}",value:{ date:"${yyyyMmDd}" }}){ projectV2Item{ id } } }`;
  gql(m);
}

try {
  if (!OWNER || !NAME) throw new Error('AIDEON_GH_REPO must be set to owner/repo');
  if (!PROJECT_NUMBER) throw new Error('AIDEON_GH_PROJECT_NUMBER not set');

  const projId = projectId();
  const actualId = fieldIdByName('Actual Ship');
  if (!actualId) throw new Error("Project field 'Actual Ship' not found");

  const pr = prInfo(PR);
  if (!pr.merged) {
    console.log(`PR #${PR} is not merged; skipping.`);
    process.exit(0);
  }
  const mergedAt = (pr.mergedAt || '').slice(0, 10);
  if (!mergedAt) throw new Error('mergedAt missing');

  const issues = (pr.closingIssuesReferences?.nodes || []).map((n) => n.number);
  if (issues.length === 0) {
    console.log(`PR #${PR} has no closingIssuesReferences; nothing to update.`);
    process.exit(0);
  }

  let cnt = 0;
  for (const num of issues) {
    const itemId = issueProjectItemId(num, projId);
    if (!itemId) {
      console.warn(`[warn] Issue #${num} not on project; skipping Actual Ship.`);
      continue;
    }
    setDate(projId, itemId, actualId, mergedAt);
    console.log(`Set Actual Ship for #${num} -> ${mergedAt}`);
    cnt++;
  }
  console.log(`project-actual-from-pr: updated ${cnt} item(s).`);
} catch (e) {
  console.error(`[project-actual-from-pr] ${e.message}`);
  process.exit(2);
}
