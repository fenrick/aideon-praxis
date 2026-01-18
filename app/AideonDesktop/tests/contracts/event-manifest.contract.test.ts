import fs from 'node:fs/promises';

import { HOST_EVENT_NAMES } from '@/adapters/host-events';
import { describe, expect, it } from 'vitest';

interface EventManifest {
  readonly schemaVersion: number;
  readonly events: Array<{
    readonly name: string;
    readonly payloadKeys: string[];
  }>;
}

describe('Event contract manifest', () => {
  it('ensures renderer event subscriptions exist in host manifest', async () => {
    const manifestRaw = await fs.readFile('docs/contracts/event-manifest.json', 'utf8');
    const manifest = JSON.parse(manifestRaw) as EventManifest;
    const hostEvents = new Set(manifest.events.map((event) => event.name));

    const usedEvents = Object.values(HOST_EVENT_NAMES);
    const missing = usedEvents.filter((name) => !hostEvents.has(name));
    expect(missing).toEqual([]);
  });
});
