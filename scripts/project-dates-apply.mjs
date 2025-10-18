#!/usr/bin/env node
/*
 Create and populate date fields on a Projects v2 board:
  - Planned Start (DATE)
  - Target Ship (DATE)
  - Code Freeze (DATE)
  - Docs/UX Freeze (DATE)
  - Review/Go-NoGo (DATE)
  - Actual Ship (DATE)

 Source defaults per item:
  - Planned Start: issue.created_at (ISO date)
  - Target Ship: issue.milestone.due_on (if any)
  - Code Freeze: Target Ship - FREEZE_DAYS (default 7)
  - Docs/UX Freeze: Target Ship - DOCS_FREEZE_DAYS (default 3)
  - Review/Go-NoGo: Target Ship - REVIEW_DAYS (default 1)
  - Actual Ship: issue.closed_at (if closed)

 Existing values are preserved (no overwrite) unless --force is provided.

 Env:
  - AIDEON_GH_PROJECT_OWNER (required)
  - AIDEON_GH_PROJECT_NUMBER (required)
  - AIDEON_GH_REPO=owner/repo (used to fetch milestone due dates)
  - AIDEON_FREEZE_DAYS=7, AIDEON_DOCS_FREEZE_DAYS=3, AIDEON_REVIEW_DAYS=1

 Usage:
  node scripts/project-dates-apply.mjs [--force] [--dry-run]
*/
import 'dotenv/config';
import { spawnSync } from 'node:child_process';

const OWNER = process.env.AIDEON_GH_PROJECT_OWNER;
const NUMBER = Number(process.env.AIDEON_GH_PROJECT_NUMBER || 0);
const DRY = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const FREEZE_DAYS = Number(process.env.AIDEON_FREEZE_DAYS || '7');
const DOCS_FREEZE_DAYS = Number(process.env.AIDEON_DOCS_FREEZE_DAYS || '3');
const REVIEW_DAYS = Number(process.env.AIDEON_REVIEW_DAYS || '1');

if (!OWNER || !NUMBER) {
  console.error('Set AIDEON_GH_PROJECT_OWNER and AIDEON_GH_PROJECT_NUMBER');
  process.exit(2);
}

function sh(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed: ${r.stderr || r.stdout}`);
  return r.stdout.trim();
}
function gh(args) {
  return sh('gh', args);
}

function listFields() {
  const out = gh(['project', 'field-list', String(NUMBER), '--owner', OWNER, '--format', 'json']);
  return JSON.parse(out).fields || JSON.parse(out); // gh versions may differ
}

function ensureField(name) {
  // Try to find first
  const fields = listFields();
  const found = fields.find((f) => f.name === name);
  if (found) return found.id;
  try {
    const out = gh([
      'project',
      'field-create',
      String(NUMBER),
      '--owner',
      OWNER,
      '--name',
      name,
      '--data-type',
      'DATE',
      '--format',
      'json',
    ]);
    const j = JSON.parse(out);
    return j.id || j.node_id || j.field?.id;
  } catch (e) {
    // Likely already exists; list again and return
    const fields2 = listFields();
    const found2 = fields2.find((f) => f.name === name);
    if (found2) return found2.id;
    throw e;
  }
}

function dateOnly(iso) {
  return (iso || '').slice(0, 10);
}
function minusDays(iso, days) {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() - days);
  return dateOnly(d.toISOString());
}

function getProject() {
  const out = gh(['project', 'view', String(NUMBER), '--owner', OWNER, '--format', 'json']);
  const j = JSON.parse(out);
  return j;
}

function listItems() {
  const out = gh(['project', 'item-list', String(NUMBER), '--owner', OWNER, '--format', 'json']);
  const j = JSON.parse(out);
  return (j.items || j).filter(
    (it) => it.content && String(it.content.type).toLowerCase() === 'issue',
  );
}

function getIssueMeta(repoFullName, number) {
  const out = gh(['api', `repos/${repoFullName}/issues/${number}`]);
  const j = JSON.parse(out);
  return { created_at: j.created_at, closed_at: j.closed_at };
}

function setDate(projectId, itemId, fieldId, date) {
  if (DRY) {
    console.log(`[dry] set ${itemId} field ${fieldId} -> ${date}`);
    return;
  }
  gh([
    'project',
    'item-edit',
    '--id',
    itemId,
    '--project-id',
    projectId,
    '--field-id',
    fieldId,
    '--date',
    date,
  ]);
}

function fieldIdByName(fields, name) {
  const f = fields.find((x) => x.name === name && x.dataType === 'DATE');
  return f?.id || null;
}

function hasDateValue(val) {
  return !!val && /^[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(val);
}

try {
  const proj = getProject();
  const projectId = proj.id || proj.data?.projectV2?.id || proj.project?.id; // tolerate formats
  // Ensure fields exist
  const plannedId = ensureField('Planned Start');
  const targetId = ensureField('Target Ship');
  const freezeId = ensureField('Code Freeze');
  const docsFreezeId = ensureField('Docs/UX Freeze');
  const reviewId = ensureField('Review/Go-NoGo');
  const actualId = ensureField('Actual Ship');

  // Refresh field list to read existing values by name
  const fields = listFields();
  const ids = {
    planned: plannedId || fieldIdByName(fields, 'Planned Start'),
    target: targetId || fieldIdByName(fields, 'Target Ship'),
    freeze: freezeId || fieldIdByName(fields, 'Code Freeze'),
    docs: docsFreezeId || fieldIdByName(fields, 'Docs/UX Freeze'),
    review: reviewId || fieldIdByName(fields, 'Review/Go-NoGo'),
    actual: actualId || fieldIdByName(fields, 'Actual Ship'),
  };

  const items = listItems();
  let updated = 0;
  for (const it of items) {
    const id = it.id || it.item?.id;
    const issue = it.content;
    if (!id || !issue) continue;
    const meta = getIssueMeta(issue.repository, issue.number);
    const created = dateOnly(meta.created_at);
    const closed = meta.closed_at ? dateOnly(meta.closed_at) : null;
    const due = it.milestone?.dueOn ? dateOnly(it.milestone.dueOn) : null;
    // Current values if present
    const values =
      it.fieldValues || it.fieldValueByName
        ? {
            planned:
              it.fieldValues?.find?.((v) => v.field?.name === 'Planned Start')?.date ||
              it.fieldValueByName?.planned,
            target:
              it.fieldValues?.find?.((v) => v.field?.name === 'Target Ship')?.date ||
              it.fieldValueByName?.target,
            freeze:
              it.fieldValues?.find?.((v) => v.field?.name === 'Code Freeze')?.date ||
              it.fieldValueByName?.freeze,
            docs:
              it.fieldValues?.find?.((v) => v.field?.name === 'Docs/UX Freeze')?.date ||
              it.fieldValueByName?.docs,
            review:
              it.fieldValues?.find?.((v) => v.field?.name === 'Review/Go-NoGo')?.date ||
              it.fieldValueByName?.review,
            actual:
              it.fieldValues?.find?.((v) => v.field?.name === 'Actual Ship')?.date ||
              it.fieldValueByName?.actual,
          }
        : {};

    // Planned Start
    if ((FORCE || !hasDateValue(values.planned)) && created) {
      setDate(projectId, id, ids.planned, created);
      updated++;
    }
    // Target Ship
    if ((FORCE || !hasDateValue(values.target)) && due) {
      setDate(projectId, id, ids.target, due);
      updated++;
    }
    // Freeze dates depend on target
    if (due) {
      const cf = minusDays(due, FREEZE_DAYS);
      const df = minusDays(due, DOCS_FREEZE_DAYS);
      const rv = minusDays(due, REVIEW_DAYS);
      if (FORCE || !hasDateValue(values.freeze)) {
        setDate(projectId, id, ids.freeze, cf);
        updated++;
      }
      if (FORCE || !hasDateValue(values.docs)) {
        setDate(projectId, id, ids.docs, df);
        updated++;
      }
      if (FORCE || !hasDateValue(values.review)) {
        setDate(projectId, id, ids.review, rv);
        updated++;
      }
    }
    // Actual Ship
    if (closed && (FORCE || !hasDateValue(values.actual))) {
      setDate(projectId, id, ids.actual, closed);
      updated++;
    }
  }
  console.log(`project-dates-apply: updated ${updated} field values.`);
} catch (e) {
  console.error(`[project-dates-apply] ${e.message}`);
  process.exit(2);
}
