#!/usr/bin/env node
/*
 Backfill commit references into issues by scanning git commits and commenting on referenced issues.

 Usage:
   node scripts/issues-commits-backfill.mjs [--since 2025-01-01] [--ref main] [--close]

 Flags:
   --since ISO_DATE   Default: 90 days ago
   --ref   GIT_REF    Branch or range to scan (default: main)
   --close            Close issues that are referenced with Fixes/Closes/Resolves

 Env:
   AIDEON_GH_REPO=owner/repo (default fenrick/aideon-praxis)
*/
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const REPO = process.env.AIDEON_GH_REPO || 'fenrick/aideon-praxis';
const args = process.argv.slice(2);
const getArg = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i+1] : fallback; };
const SINCE = getArg('--since', new Date(Date.now() - 90*24*3600*1000).toISOString().slice(0,10));
const REF = getArg('--ref', 'main');
const DO_CLOSE = args.includes('--close');
const SNAP = path.join(process.cwd(), '.aideon', 'commit-links.json');

function sh(cmd, argv) { const r = spawnSync(cmd, argv, {encoding:'utf8'}); if (r.status!==0) throw new Error(`${cmd} ${argv.join(' ')} failed: ${r.stderr||r.stdout}`); return r.stdout.trim(); }
function gh(argv) { return sh('gh', argv); }

function readSnap(){ try { return JSON.parse(fs.readFileSync(SNAP,'utf8')); } catch { return { items:{} }; } }
function saveSnap(s){ fs.mkdirSync(path.dirname(SNAP), { recursive:true }); fs.writeFileSync(SNAP, JSON.stringify(s,null,2)); }

function listCommits(){
  const out = sh('git', ['log', REF, `--since=${SINCE}`, '--no-merges', '--pretty=format:%H%x09%ad%x09%s', '--date=iso-strict']);
  return out.split('\n').filter(Boolean).map(line=>{ const [sha, date, subject] = line.split('\t'); return {sha, date, subject}; });
}

function parseRefs(subject){
  const closers=[]; const refs=[];
  const reClose=/(close[sd]?|fix(e[sd])?|resolve[sd]?)\s+#(\d+)/ig;
  let m; while((m=reClose.exec(subject))) closers.push(Number(m[3]||m[2]||m[1]));
  const reRef=/#(\d+)/g; while((m=reRef.exec(subject))) refs.push(Number(m[1]));
  const unique=(arr)=>Array.from(new Set(arr));
  return { closers: unique(closers), refs: unique(refs) };
}

function issueState(num){ const j = JSON.parse(gh(['api', `repos/${REPO}/issues/${num}`])); return j.state; }

const snap = readSnap();
const commits = listCommits();
let total=0;
for (const c of commits) {
  const {closers, refs} = parseRefs(c.subject);
  const all = Array.from(new Set(refs));
  for (const n of all) {
    snap.items[n] ||= { shas: [] };
    if (snap.items[n].shas.includes(c.sha)) continue;
    const url = `https://github.com/${REPO}/commit/${c.sha}`;
    const text = `Commit ${c.sha.slice(0,7)} on ${c.date}: ${c.subject}\n\n${url}`;
    gh(['issue', 'comment', String(n), '-R', REPO, '--body', text]);
    snap.items[n].shas.push(c.sha);
    total++;
    if (DO_CLOSE && closers.includes(n)) {
      try {
        if (issueState(n) === 'open') {
          gh(['issue', 'edit', String(n), '-R', REPO, '--add-label', 'status/done']);
          gh(['issue', 'close', String(n), '-R', REPO, '--comment', `Closed via commit ${c.sha.slice(0,7)} (${url})`]);
        }
      } catch {}
    }
  }
}
saveSnap(snap);
console.log(`issues-commits-backfill: commented on ${total} issue reference(s).`);

