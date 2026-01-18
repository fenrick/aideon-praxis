import fs from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

async function listSourceFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listSourceFiles(fullPath)));
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      continue;
    }
    files.push(fullPath);
  }

  return files;
}

describe('Security posture: renderer networking', () => {
  it('rejects direct renderer HTTP usage', async () => {
    const srcRoot = path.resolve('app/AideonDesktop/src');
    const files = await listSourceFiles(srcRoot);

    const violations: Array<{ file: string; pattern: string }> = [];
    const patterns: Array<{ label: string; re: RegExp }> = [
      { label: 'fetch(', re: /\bfetch\s*\(/ },
      { label: 'XMLHttpRequest', re: /\bXMLHttpRequest\b/ },
      { label: 'axios', re: /\baxios\b/ },
    ];

    await Promise.all(
      files.map(async (file) => {
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
