import fs from 'node:fs/promises';

import { HOST_SHELL_COMMAND_IDS } from '@/adapters/host-events';
import { describe, expect, it } from 'vitest';

interface ShellCommandManifest {
  readonly schemaVersion: number;
  readonly commands: {
    readonly id: string;
    readonly payloadKeys: string[];
  }[];
}

describe('Shell command contract manifest', () => {
  it('ensures renderer shell command ids exist in manifest', async () => {
    const manifestRaw = await fs.readFile('docs/contracts/shell-command-manifest.json', 'utf8');
    const manifest = JSON.parse(manifestRaw) as ShellCommandManifest;
    const hostShellCommands = new Set(manifest.commands.map((command) => command.id));

    const usedShellCommands = Object.values(HOST_SHELL_COMMAND_IDS);
    const missing = usedShellCommands.filter((id) => !hostShellCommands.has(id));
    expect(missing).toEqual([]);
  });
});
