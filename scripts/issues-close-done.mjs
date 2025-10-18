#!/usr/bin/env node
/*
 Close open issues that are Done based on label `status/done` or Project Status field value.

 Usage: node scripts/issues-close-done.mjs [--dry-run]

 Env:
  - AIDEON_GH_REPO=owner/repo (default fenrick/aideon-praxis)
  - AIDEON_GH_PROJECT_OWNER=<user_or_org> (optional, for Project Status read)
  - AIDEON_GH_PROJECT_NUMBER=<number> (optional)
  - AIDEON_GH_STATUS_FIELD=Status (optional)
*/
import 'dotenv/config';
import { spawnSync } from 'node:child_process';

const REPO = process.env.AIDEON_GH_REPO || 'fenrick/aideon-praxis';
const [OWNER, NAME] = REPO.split('/');
const POWNER = process.env.AIDEON_GH_PROJECT_OWNER || null;
const PNUMBER = process.env.AIDEON_GH_PROJECT_NUMBER || null;
const STATUS_FIELD = process.env.AIDEON_GH_STATUS_FIELD || 'Status';
const DRY = process.argv.includes('--dry-run');

function gh(args) {
  const r = spawnSync('gh', args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`gh ${args.join(' ')} failed: ${r.stderr || r.stdout}`);
  return r.stdout.trim();
}
function gql(q) {
  const out = gh(['api', 'graphql', '-f', `query=${q}`]);
  const j = JSON.parse(out);
  return j.data || j;
}

function listOpenIssues() {
  let page = 1;
  const per = 100;
  const acc = [];
  for (;;) {
    const out = gh([
      'api',
      `repos/${OWNER}/${NAME}/issues?state=open&per_page=${per}&page=${page}`,
    ]);
    const arr = JSON.parse(out).filter((x) => !x.pull_request);
    if (!arr.length) break;
    acc.push(...arr);
    if (arr.length < per) break;
    page++;
  }
  return acc;
}

function getProjectId() {
  if (!POWNER || !PNUMBER) return null;
  const qUser = `query{ user(login:"${POWNER}"){ projectV2(number:${PNUMBER}){ id title } } }`;
  const qOrg = `query{ organization(login:"${POWNER}"){ projectV2(number:${PNUMBER}){ id title } } }`;
  let d = gql(qUser);
  let proj = d.user?.projectV2;
  if (!proj) {
    d = gql(qOrg);
    proj = d.organization?.projectV2;
  }
  return proj?.id || null;
}

function getItemStatus(itemId) {
  const q = `query{ node(id:"${itemId}"){ ... on ProjectV2Item { id fieldValueByName(name:"${STATUS_FIELD}"){ __typename ... on ProjectV2ItemFieldSingleSelectValue { name } } } } }`;
  const d = gql(q);
  return d.node?.fieldValueByName?.name || null;
}

function closeIssue(num, reason) {
  if (DRY) {
    console.log(`[dry] close #${num} (${reason})`);
    return;
  }
  try {
    gh(['issue', 'edit', String(num), '-R', REPO, '--add-label', 'status/done']);
  } catch {}
  gh(['issue', 'close', String(num), '-R', REPO, '--comment', `Closing as Done (${reason}).`]);
}

try {
  const projectId = getProjectId();
  const issues = listOpenIssues();
  for (const it of issues) {
    const labels = (it.labels || []).map((l) => (typeof l === 'string' ? l : l.name));
    const hasDoneLabel = labels.includes('status/done');
    let statusName = null;
    if (projectId && it.project_items_url) {
      // Fetch project items for this issue via REST to get item IDs
      const items = JSON.parse(gh(['api', it.project_items_url]));
      const ours = items.find((p) => p.project_url?.endsWith(`/projects/${PNUMBER}`));
      if (ours?.id) statusName = getItemStatus(ours.id);
    }
    if (hasDoneLabel || statusName === 'Done') {
      closeIssue(it.number, hasDoneLabel ? 'status/done label' : 'Project Status is Done');
    }
  }
  console.log('issues-close-done: completed');
} catch (e) {
  console.error(`[issues-close-done] ${e.message}`);
  process.exit(2);
}
