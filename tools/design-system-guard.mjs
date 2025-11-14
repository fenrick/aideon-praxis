#!/usr/bin/env node

/**
 * Guard to ensure shared UI components live in @aideon/PraxisDesignSystem.
 * Fails if app/PraxisDesktop/src/lib/ui contains any implementation files.
 */

import { access, constants, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const uiDir = join(process.cwd(), 'app/PraxisDesktop/src/lib/ui');

try {
  await access(uiDir, constants.F_OK);
} catch {
  // Directory absent: nothing to guard.
  process.exit(0);
}

const entries = await readdir(uiDir, { withFileTypes: true });
const offenders = entries
  .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
  .map((entry) => entry.name);

if (offenders.length === 0) {
  process.exit(0);
}

console.error(
  [
    '❌ Design system guard failed:',
    'Move UI components into app/PraxisDesignSystem and export them there.',
    `Found disallowed files in app/PraxisDesktop/src/lib/ui: ${offenders.join(', ')}`,
  ].join('\n'),
);
process.exitCode = 1;
