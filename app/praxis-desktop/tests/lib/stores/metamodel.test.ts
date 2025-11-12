import { get } from 'svelte/store';
import { describe, expect, it, vi } from 'vitest';

import type { MetaModelPort } from '$lib/ports/meta-model';
import { createMetaModelStore } from '$lib/stores/metamodel';
import type { MetaModelDocument } from '@aideon/praxis-adapters/contracts';

const baseDoc: MetaModelDocument = {
  version: '1.0.0',
  description: 'base',
  types: [
    {
      id: 'Capability',
      label: 'Capability',
      attributes: [{ name: 'name', type: 'string', required: true }],
      effectTypes: [],
    },
  ],
  relationships: [],
};

describe('metaModelStore', () => {
  it('loads schema data and transitions to ready state', async () => {
    const fetch = vi.fn(async () => baseDoc);
    const store = createMetaModelStore({ fetch } satisfies MetaModelPort);
    await store.load();
    const state = get(store);
    expect(state.status).toBe('ready');
    expect(state.schema?.version).toBe('1.0.0');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('refreshes schema data even when already ready', async () => {
    const fetch = vi
      .fn<MetaModelPort['fetch']>()
      .mockResolvedValueOnce(baseDoc)
      .mockResolvedValueOnce({ ...baseDoc, version: '1.0.1' });
    const store = createMetaModelStore({ fetch } satisfies MetaModelPort);
    await store.load();
    await store.refresh();
    const state = get(store);
    expect(state.schema?.version).toBe('1.0.1');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('records errors and can reset to idle', async () => {
    const fetch = vi.fn<MetaModelPort['fetch']>().mockRejectedValue(new Error('boom'));
    const store = createMetaModelStore({ fetch } satisfies MetaModelPort);
    await store.load();
    let state = get(store);
    expect(state.status).toBe('error');
    expect(state.error).toBe('boom');
    store.reset();
    state = get(store);
    expect(state.status).toBe('idle');
    expect(state.schema).toBeNull();
  });
});
