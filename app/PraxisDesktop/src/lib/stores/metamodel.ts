import type { MetaModelDocument } from '@aideon/PraxisAdapters/contracts';
import { get, writable } from 'svelte/store';
import type { MetaModelPort } from '../ports/meta-model.js';
import { metaModelPort } from '../ports/meta-model.js';

export interface MetaModelState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  schema: MetaModelDocument | null;
  error: string | null;
  lastLoaded?: number;
}

export interface MetaModelStore {
  subscribe: (run: (value: MetaModelState) => void) => () => void;
  load: (force?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

const initialState: MetaModelState = {
  status: 'idle',
  schema: null,
  error: null,
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
};

export function createMetaModelStore(port: MetaModelPort = metaModelPort): MetaModelStore {
  const store = writable<MetaModelState>(initialState);

  async function load(force = false): Promise<void> {
    const state = get(store);
    if (!force && (state.status === 'loading' || state.status === 'ready')) {
      return;
    }
    store.set({
      status: 'loading',
      schema: state.schema,
      error: null,
      lastLoaded: state.lastLoaded,
    });
    try {
      const schema = await port.fetch();
      store.set({
        status: 'ready',
        schema,
        error: null,
        lastLoaded: Date.now(),
      });
    } catch (error) {
      store.set({
        status: 'error',
        schema: state.schema,
        error: toErrorMessage(error),
        lastLoaded: state.lastLoaded,
      });
    }
  }

  async function refresh(): Promise<void> {
    await load(true);
  }

  function reset(): void {
    store.set(initialState);
  }

  return {
    subscribe: store.subscribe,
    load,
    refresh,
    reset,
  };
}

export const metaModelStore = createMetaModelStore();
