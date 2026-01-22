import fs from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

interface IpcManifest {
  readonly schemaVersion: number;
  readonly commands: string[];
}

interface EventManifest {
  readonly schemaVersion: number;
  readonly events: {
    readonly name: string;
    readonly payloadKeys: string[];
  }[];
}

describe('Setup contract', () => {
  it('snapshots required setup commands and events', async () => {
    const [ipcRaw, eventsRaw] = await Promise.all([
      fs.readFile('docs/contracts/ipc-manifest.json', 'utf8'),
      fs.readFile('docs/contracts/event-manifest.json', 'utf8'),
    ]);

    const ipc = JSON.parse(ipcRaw) as IpcManifest;
    const events = JSON.parse(eventsRaw) as EventManifest;

    expect(ipc.schemaVersion).toBeGreaterThan(0);
    expect(events.schemaVersion).toBeGreaterThan(0);

    const commands = new Set(ipc.commands);
    const eventNames = new Set(events.events.map((event) => event.name));

    expect(commands.has('system_setup_complete')).toBe(true);
    expect(commands.has('system_setup_state')).toBe(true);

    expect(eventNames.has('setup_backend_ready')).toBe(true);
    expect(eventNames.has('setup_frontend_ready_ack')).toBe(true);
    expect(eventNames.has('setup_progress')).toBe(true);
    expect(eventNames.has('setup_failed')).toBe(true);
  });
});
