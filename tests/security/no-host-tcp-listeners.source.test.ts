import fs from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/* eslint-disable security/detect-non-literal-fs-filename -- walking the repo tree is the point of this security test */

interface Pattern {
  readonly label: string;
  readonly re: RegExp;
}

interface Violation {
  readonly file: string;
  readonly pattern: string;
}

/**
 * Recursively collect every Rust source file under `directory`.
 * @param directory - Starting path for the search.
 */
async function listRustFiles(directory: string): Promise<string[]> {
  // walking the repo tree is the point of this test
  // nosemgrep
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listRustFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.rs')) {
      files.push(fullPath);
    }
  }

  return files;
}

describe('Security posture: desktop TCP listeners', () => {
  it('rejects TCP listener usage in the desktop host', async () => {
    const hostRoot = path.resolve('src-tauri/src');
    const files = await listRustFiles(hostRoot);

    const patterns: Pattern[] = [
      { label: 'std::net::TcpListener', re: /\bstd::net::TcpListener\b/ },
      { label: 'tokio::net::TcpListener', re: /\btokio::net::TcpListener\b/ },
      { label: 'TcpListener::bind', re: /\bTcpListener::bind\b/ },
      { label: 'actix_web::HttpServer', re: /\bactix_web::HttpServer\b/ },
      { label: 'hyper::Server', re: /\bhyper::Server\b/ },
      { label: 'warp::serve', re: /\bwarp::serve\b/ },
    ];

    const violations: Violation[] = [];

    await Promise.all(
      files.map(async (file) => {
        // reading enumerated repo sources under test
        // nosemgrep
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
