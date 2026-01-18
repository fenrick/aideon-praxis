import fs from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

async function listRustFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listRustFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.rs')) {
      files.push(fullPath);
    }
  }

  return files;
}

describe('Security posture: desktop TCP listeners', () => {
  it('rejects TCP listener usage in the desktop host', async () => {
    const hostRoot = path.resolve('crates/desktop/src');
    const files = await listRustFiles(hostRoot);

    const patterns: Array<{ label: string; re: RegExp }> = [
      { label: 'std::net::TcpListener', re: /\bstd::net::TcpListener\b/ },
      { label: 'tokio::net::TcpListener', re: /\btokio::net::TcpListener\b/ },
      { label: 'TcpListener::bind', re: /\bTcpListener::bind\b/ },
      { label: 'actix_web::HttpServer', re: /\bactix_web::HttpServer\b/ },
      { label: 'hyper::Server', re: /\bhyper::Server\b/ },
      { label: 'warp::serve', re: /\bwarp::serve\b/ },
    ];

    const violations: Array<{ file: string; pattern: string }> = [];

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
