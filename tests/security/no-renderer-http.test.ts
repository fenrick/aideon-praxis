import fs from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/* eslint-disable security/detect-non-literal-fs-filename -- intentionally enumerating renderer files for security checks */

interface Pattern {
  readonly label: string;
  readonly re: RegExp;
}

interface Violation {
  readonly file: string;
  readonly pattern: string;
}

/**
 * Recursively gather each renderer source file under `directory`.
 * @param directory - Starting path for the search.
 */
async function listSourceFiles(directory: string): Promise<string[]> {
  // nosemgrep: rule-non-literal-fs-filename -- enumerating renderer sources is the point of this test
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listSourceFiles(fullPath)));
    } else if (entry.isFile() && /\.(?:ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Vendored third-party component sources excluded from the renderer HTTP scan.
 * - kibo-ui/glimpse/server.tsx runs server-side (fetch is legitimate there).
 * - kibo-ui/image-crop fetches local blob/object URLs for crop output.
 */
const EXCLUDED_PREFIXES = [path.join('src', 'components', 'kibo-ui')];

describe('Security posture: renderer networking', () => {
  it('rejects direct renderer HTTP usage', async () => {
    const sourceRoot = path.resolve('src');
    const sourceFiles = await listSourceFiles(sourceRoot);
    const files = sourceFiles.filter((file) => {
      const relative = path.relative(process.cwd(), file);
      return !EXCLUDED_PREFIXES.some((prefix) => relative.startsWith(prefix));
    });

    const violations: Violation[] = [];
    const patterns: Pattern[] = [
      { label: 'fetch(', re: /\bfetch\s*\(/ },
      { label: 'XMLHttpRequest', re: /\bXMLHttpRequest\b/ },
      { label: 'axios', re: /\baxios\b/ },
    ];

    await Promise.all(
      files.map(async (file) => {
        // nosemgrep: rule-non-literal-fs-filename -- reading enumerated renderer sources under test
        const raw = await fs.readFile(file, 'utf8');
        for (const pattern of patterns) {
          if (pattern.re.test(raw)) {
            violations.push({ file: path.relative(process.cwd(), file), pattern: pattern.label });
          }
        }
      }),
    );

    expect(violations).toEqual([]);
  });
});

/* eslint-enable security/detect-non-literal-fs-filename */
