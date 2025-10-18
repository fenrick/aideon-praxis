#!/usr/bin/env node
/*
 Sync GitHub issues into a Projects v2 board and set Status based on labels.

 Env (.env or shell):
  - AIDEON_GH_REPO=owner/repo
  - AIDEON_GH_PROJECT_OWNER=org_or_user_login
  - AIDEON_GH_PROJECT_NUMBER=<number>
  - AIDEON_GH_STATUS_FIELD=Status
  - AIDEON_GH_STATUS_MAP={"status/in-progress":"In Progress", ...}

 Usage:
   node scripts/issues-project-sync.mjs [--only <issueNumber>] [--dry-run]
*/

import 'dotenv/config';
import { spawnSync } from 'node:child_process';

const DRY = process.argv.includes('--dry-run');
const onlyIdx = process.argv.indexOf('--only');
const ONLY = onlyIdx >= 0 ? Number(process.argv[onlyIdx + 1]) : null;

const REPO = process.env.AIDEON_GH_REPO || 'fenrick/aideon-praxis';
const [OWNER, NAME] = REPO.split('/');
const PROJECT_OWNER = process.env.AIDEON_GH_PROJECT_OWNER || OWNER;
const PROJECT_NUMBER = Number(process.env.AIDEON_GH_PROJECT_NUMBER || '0');
const STATUS_FIELD = process.env.AIDEON_GH_STATUS_FIELD || 'Status';
let STATUS_MAP = {};
try { STATUS_MAP = JSON.parse(process.env.AIDEON_GH_STATUS_MAP || '{}'); } catch {}

function gh(args, input) {
  const res = spawnSync('gh', args, { encoding: 'utf8', input });
  if (res.status !== 0) throw new Error(`gh ${args.join(' ')} failed: ${res.stderr || res.stdout}`);
  return res.stdout.trim();
}

function gql(query) {
  const out = gh(['api', 'graphql', '-f', `query=${query}`]);
  const j = JSON.parse(out);
  return j.data || j;
}

function getProject() {
  const qUser = `query{ user(login:"${PROJECT_OWNER}"){ projectV2(number:${PROJECT_NUMBER}){ id title fields(first:50){ nodes{ __typename ... on ProjectV2FieldCommon { id name } ... on ProjectV2SingleSelectField { id name options { id name } } } } } } }`;
  const qOrg = `query{ organization(login:"${PROJECT_OWNER}"){ projectV2(number:${PROJECT_NUMBER}){ id title fields(first:50){ nodes{ __typename ... on ProjectV2FieldCommon { id name } ... on ProjectV2SingleSelectField { id name options { id name } } } } } } }`;
  let data = gql(qUser);
  let proj = data.user?.projectV2;
  if (!proj) { data = gql(qOrg); proj = data.organization?.projectV2; }
  if (!proj) throw new Error(`Project not found for owner=${PROJECT_OWNER} number=${PROJECT_NUMBER}`);
  return proj;
}

function getIssue(number) {
  const q = `query{ repository(owner:"${OWNER}",name:"${NAME}"){ issue(number:${number}){ id number title labels(first:50){ nodes{ name } } projectItems(first:20){ nodes{ id project{ id title } } } } } }`;
  const data = gql(q);
  const issue = data.repository?.issue;
  if (!issue) throw new Error(`Issue #${number} not found`);
  return issue;
}

function addItem(projectId, contentId) {
  const m = `mutation{ addProjectV2ItemById(input:{projectId:"${projectId}",contentId:"${contentId}"}){ item{ id } } }`;
  const data = gql(m);
  return data.addProjectV2ItemById?.item?.id;
}

function setStatus(projectId, itemId, fieldId, optionId) {
  const m = `mutation{ updateProjectV2ItemFieldValue(input:{projectId:"${projectId}",itemId:"${itemId}",fieldId:"${fieldId}",value:{ singleSelectOptionId:"${optionId}" }}){ projectV2Item{ id } } }`;
  gql(m);
}

function labelsToStatus(labels) {
  const set = new Set(labels.map((l) => (typeof l === 'string' ? l : l.name)));
  for (const [label, status] of Object.entries(STATUS_MAP)) {
    if (set.has(label)) return status;
  }
  // fallback
  return 'Todo';
}

function findField(proj, name) {
  return proj.fields.nodes.find((n) => n.name === name && n.__typename === 'ProjectV2SingleSelectField');
}

function findOption(field, name) {
  return field.options.find((o) => o.name === name);
}

function listIssues() {
  let page = 1; const per = 100; const acc = [];
  for (;;) {
    const out = gh(['api', `repos/${OWNER}/${NAME}/issues?state=all&per_page=${per}&page=${page}`]);
    const arr = JSON.parse(out);
    if (arr.length === 0) break;
    acc.push(...arr.filter((x) => !x.pull_request));
    if (arr.length < per) break;
    page++;
  }
  return acc.map((i) => i.number);
}

try {
  if (!PROJECT_NUMBER) throw new Error('AIDEON_GH_PROJECT_NUMBER not set');
  const proj = getProject();
  const statusField = findField(proj, STATUS_FIELD);
  if (!statusField) throw new Error(`Field '${STATUS_FIELD}' not found in project`);

  const numbers = ONLY ? [ONLY] : listIssues();
  for (const n of numbers) {
    const issue = getIssue(n);
    const inProject = issue.projectItems.nodes.find((pi) => pi.project.id === proj.id);
    if (!inProject) {
      if (DRY) { console.log(`[dry] add issue #${n} to project`); }
      else addItem(proj.id, issue.id);
    }
    // re-fetch to get item id (in case it was added now)
    const issue2 = getIssue(n);
    const item = issue2.projectItems.nodes.find((pi) => pi.project.id === proj.id);
    if (!item) { console.warn(`[warn] no project item for #${n}`); continue; }
    const targetStatus = labelsToStatus(issue2.labels.nodes || []);
    const opt = findOption(statusField, targetStatus);
    if (!opt) { console.warn(`[warn] missing option '${targetStatus}' in field '${STATUS_FIELD}'`); continue; }
    if (DRY) { console.log(`[dry] set #${n} → ${targetStatus}`); }
    else setStatus(proj.id, item.id, statusField.id, opt.id);
  }
  console.log(`issues-project-sync: processed ${numbers.length} issue(s).`);
} catch (e) {
  console.error(`[issues-project-sync] ${e.message}`);
  process.exit(2);
}
