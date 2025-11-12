import { describe, expect, it, vi } from 'vitest';

const invokeMock = vi.fn(async () => ({
  version: '1.0.0',
  description: 'test schema',
  types: [],
  relationships: [],
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
}));

describe('metaModelPort', () => {
  it('fetches the meta-model document via IPC', async () => {
    const { metaModelPort } = await import('$lib/ports/meta-model');
    const result = await metaModelPort.fetch();
    expect(invokeMock).toHaveBeenCalledWith('temporal_metamodel_get');
    expect(result.version).toBe('1.0.0');
    expect(result.description).toBe('test schema');
  });
});
