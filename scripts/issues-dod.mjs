#!/usr/bin/env node
/*
 Ensure a "Definition of Done" (DoD) block exists for actively worked issues (label: status/in-progress).
 If missing, append a templated checklist to the issue body.

 Usage: node scripts/issues-dod.mjs [--dry-run] [--label status/in-progress]
 Env: AIDEON_GH_REPO=owner/repo
*/
import 'dotenv/config';
import { spawnSync } from 'node:child_process';

const REPO = process.env.AIDEON_GH_REPO || 'fenrick/aideon-praxis';
const TARGET_LABEL = process.argv.includes('--label') ? process.argv[process.argv.indexOf('--label') + 1] : 'status/in-progress';
const DRY = process.argv.includes('--dry-run');

function gh(args, input) {
  const res = spawnSync('gh', args, { encoding: 'utf8', input });
  if (res.status !== 0) throw new Error(`gh ${args.join(' ')} failed: ${res.stderr || res.stdout}`);
  return res.stdout.trim();
}

function listInProgress() {
  let page = 1; const per = 100; const items = [];
  for (;;) {
    const out = gh(['api', `repos/${REPO}/issues?state=open&labels=${encodeURIComponent(TARGET_LABEL)}&per_page=${per}&page=${page}`]);
    const arr = JSON.parse(out);
    items.push(...arr.filter((x) => !x.pull_request));
    if (arr.length < per) break;
    page++;
  }
  return items;
}

function hasDoD(body) {
  return /## Definition of Done/i.test(body);
}

function renderDoD(issue) {
  return `\n\n## Definition of Done\n\n- [ ] CI: lint, typecheck, unit tests updated\n- [ ] Docs: user & dev docs updated (README/ADR/CHANGELOG)\n- [ ] Security: renderer IPC boundaries respected, no new ports\n- [ ] Performance: SLO notes or bench results captured (if applicable)\n- [ ] UX: matches GitHub‑inspired style, light/dark\n- [ ] Packaging: desktop build verified on macOS (DMG/ZIP)\n- [ ] Tracking: linked PR(s), issue status updated, project field set\n`;
}

try {
  const items = listInProgress();
  for (const it of items) {
    const body = it.body || '';
    if (!hasDoD(body)) {
      const newBody = body + renderDoD(it);
      if (DRY) {
        console.log(`[dry] would append DoD to #${it.number}`);
      } else {
        gh(['issue', 'edit', String(it.number), '-R', REPO, '--body', newBody]);
        gh(['issue', 'comment', String(it.number), '-R', REPO, '--body', 'Added Definition of Done checklist and set expectations.']);
      }
    }
  }
  console.log(`issues-dod: processed ${items.length} issue(s).`);
} catch (e) {
  console.error(`[issues-dod] ${e.message}`);
  process.exit(2);
}

