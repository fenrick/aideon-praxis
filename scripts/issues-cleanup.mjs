#!/usr/bin/env node
/*
 Remove legacy docs/issues files that are not mirrored from GitHub.
 A mirrored file has YAML front matter with a `github:` number and `state:`.

 Usage: node scripts/issues-cleanup.mjs [--dry-run]
*/
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'docs', 'issues');
const DRY = process.argv.includes('--dry-run');

function listFiles(dir) {
  return fs.readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) return listFiles(p);
    return [p];
  });
}

function isLegacy(file) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.startsWith('---')) return true;
  const head = text.split('\n---')[0];
  return !/\ngithub:\s*\d+/i.test(head) || !/\nstate:\s*(open|closed)/i.test(head);
}

if (!fs.existsSync(DIR)) {
  console.log('issues-cleanup: docs/issues not found');
  process.exit(0);
}

const files = listFiles(DIR).filter((p) => !p.endsWith('/README.md') && !p.endsWith('README.md'));
let removed = 0;
for (const f of files) {
  if (isLegacy(f)) {
    if (!DRY) fs.rmSync(f);
    removed++;
    console.log(`${DRY ? '[dry] would remove' : 'removed'}: ${path.relative(ROOT, f)}`);
  }
}
console.log(`issues-cleanup: ${removed} legacy file(s) ${DRY ? 'would be ' : ''}removed.`);
