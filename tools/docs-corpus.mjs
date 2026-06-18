#!/usr/bin/env node
// Generate a single, well-structured documentation corpus from the repo's
// Markdown sources (curated root entry points + the numbered docs/ tree, which
// includes per-module docs under docs/05-modules/). All design documentation
// lives under docs/; the code tree carries none. Output is written to out/ (a
// gitignored, generated artifact). Regenerate with `pnpm run docs:corpus`.

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'out');
const OUT_FILE = path.join(OUT_DIR, 'aideon-docs-corpus.md');

// Directories never worth walking into.
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'out',
  'target',
  'dist',
  'build',
  'coverage',
  '.turbo',
  '.pnpm',
]);

// Curated, ordered root documents (the entry points a reader wants first).
const ROOT_DOCS = [
  'README.md',
  'CONTEXT.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'CODE-OF-CONDUCT.md',
];

/**
 * Recursively collect Markdown files under `dir`, sorted for determinism.
 * The numbered docs tree (00-index, 01-architecture, …) sorts naturally.
 * @param {string} dir Absolute directory to walk.
 * @param {(abs: string) => boolean} [accept] Optional per-file filter.
 * @returns {string[]} Absolute paths, sorted.
 */
function collectMarkdown(dir, accept = () => true) {
  if (!existsSync(dir)) {
    return [];
  }
  const found = [];
  const walk = (current) => {
    const entries = readdirSync(current, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          walk(path.join(current, entry.name));
        }
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        const abs = path.join(current, entry.name);
        if (accept(abs)) {
          found.push(abs);
        }
      }
    }
  };
  walk(dir);
  return found;
}

/**
 * Build the ordered list of source documents grouped into readable sections.
 * @returns {{ group: string, abs: string }[]}
 */
function gatherSources() {
  const sources = [];
  const seen = new Set();
  const add = (group, abs) => {
    if (existsSync(abs) && !seen.has(abs)) {
      seen.add(abs);
      sources.push({ group, abs });
    }
  };

  // 1. Root entry points (curated order).
  for (const name of ROOT_DOCS) {
    add('Overview', path.join(ROOT, name));
  }

  // 2. The numbered docs/ tree — grouped by its top-level folder. All
  //    design/architecture/module documentation lives under docs/ (module docs
  //    in docs/05-modules/<module>/); the code tree (crates/, src/, src-tauri/)
  //    carries no design docs, so there is nothing to walk there.
  for (const abs of collectMarkdown(path.join(ROOT, 'docs'))) {
    const relFromDocs = path.relative(path.join(ROOT, 'docs'), abs);
    const top = relFromDocs.includes(path.sep) ? relFromDocs.split(path.sep)[0] : 'docs';
    add(`docs/${top}`, abs);
  }

  return sources;
}

/**
 * Strip a leading YAML front-matter block, if present.
 * @param {string} content
 * @returns {string}
 */
function stripFrontMatter(content) {
  if (!content.startsWith('---\n')) {
    return content;
  }
  const end = content.indexOf('\n---', 4);
  return end === -1 ? content : content.slice(content.indexOf('\n', end + 1) + 1);
}

/**
 * Demote every ATX heading by `levels` so file headings nest under the corpus
 * structure, without touching `#` characters inside fenced code blocks.
 * @param {string} content
 * @param {number} levels
 * @returns {string}
 */
function demoteHeadings(content, levels) {
  let inFence = false;
  let fenceMarker = '';
  return content
    .split('\n')
    .map((line) => {
      const fence = line.match(/^\s*(```+|~~~+)/);
      if (fence) {
        if (!inFence) {
          inFence = true;
          fenceMarker = fence[1][0];
        } else if (fence[1][0] === fenceMarker) {
          inFence = false;
        }
        return line;
      }
      if (inFence) {
        return line;
      }
      const heading = line.match(/^(#{1,6})(\s.*)$/);
      if (heading) {
        const depth = Math.min(6, heading[1].length + levels);
        return '#'.repeat(depth) + heading[2];
      }
      return line;
    })
    .join('\n');
}

/**
 * Derive a human title for a file: its first H1, else a tidied path.
 * @param {string} content
 * @param {string} rel
 * @returns {string}
 */
function deriveTitle(content, rel) {
  const h1 = content.match(/^#\s+(.+)$/m);
  if (h1) {
    return h1[1].trim();
  }
  return rel.replace(/\.md$/i, '').replace(/[/_-]+/g, ' ');
}

const usedSlugs = new Map();
/**
 * Stable, unique GitHub-style anchor slug.
 * @param {string} text
 * @returns {string}
 */
function slugify(text) {
  const base =
    text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-') || 'section';
  const count = usedSlugs.get(base) ?? 0;
  usedSlugs.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
}

function main() {
  const sources = gatherSources();
  if (sources.length === 0) {
    console.error('docs-corpus: no Markdown sources found.');
    process.exit(1);
  }

  // First pass: resolve section metadata (title, slug, group).
  const sections = sources.map(({ group, abs }, index) => {
    const rel = path.relative(ROOT, abs);
    const raw = stripFrontMatter(readFileSync(abs, 'utf8'));
    const title = deriveTitle(raw, rel);
    return { index: index + 1, group, rel, raw, title, slug: slugify(title) };
  });

  const generatedAt = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  const out = [];

  // Header.
  out.push('# Aideon — Documentation Corpus');
  out.push('');
  out.push(
    `> Consolidated from **${String(sections.length)}** source files on ${generatedAt}. ` +
      'Generated artifact — do not edit by hand; regenerate with `pnpm run docs:corpus`.',
  );
  out.push('');
  out.push(
    'Each section reproduces one source file verbatim (headings demoted to nest under ' +
      'this document). The `Source` line under every heading is the path in the repository.',
  );
  out.push('');

  // Table of contents, grouped.
  out.push('## Contents');
  out.push('');
  let currentGroup = '';
  for (const section of sections) {
    if (section.group !== currentGroup) {
      currentGroup = section.group;
      out.push(`### ${currentGroup}`);
    }
    out.push(`- [${section.index}. ${section.title}](#${section.slug}) — \`${section.rel}\``);
  }
  out.push('');

  // Body.
  for (const section of sections) {
    out.push('---');
    out.push('');
    out.push(`<a id="${section.slug}"></a>`);
    out.push(`## ${section.index}. ${section.title}`);
    out.push('');
    out.push(`_Source: \`${section.rel}\`_`);
    out.push('');
    out.push(demoteHeadings(section.raw, 2).trim());
    out.push('');
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const text = out.join('\n') + '\n';
  writeFileSync(OUT_FILE, text);

  const bytes = statSync(OUT_FILE).size;
  console.log(
    `docs-corpus: wrote ${sections.length} sections (${(bytes / 1024).toFixed(0)} KB) → ${path.relative(ROOT, OUT_FILE)}`,
  );
}

main();
