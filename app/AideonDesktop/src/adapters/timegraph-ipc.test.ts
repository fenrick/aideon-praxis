import { describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

const invokeMock = vi.mocked(invoke);

describe('IpcTemporalAdapter', () => {
  it('serializes optional parameters for stateAt', async () => {
    const { IpcTemporalAdapter } = await import('./timegraph-ipc');
    const adapter = new IpcTemporalAdapter();
    invokeMock.mockResolvedValueOnce({ asOf: '2025-01-01', scenario: null, confidence: null, nodes: 1, edges: 2 });

    const snapshot = await adapter.stateAt({ asOf: '2025-01-01' });

    expect(invokeMock).toHaveBeenCalledWith('temporal_state_at', { payload: { asOf: '2025-01-01' } });
    expect(snapshot).toEqual({ asOf: '2025-01-01', scenario: undefined, confidence: undefined, nodes: 1, edges: 2 });
  });

  it('maps diff summary metrics', async () => {
    const { IpcTemporalAdapter } = await import('./timegraph-ipc');
    const adapter = new IpcTemporalAdapter();
    invokeMock.mockResolvedValueOnce({ from: 'a', to: 'b', node_adds: 1, node_mods: 0, node_dels: 2, edge_adds: 0, edge_mods: 0, edge_dels: 1 });

    const diff = await adapter.diff({ from: 'a', to: 'b' });
    expect(diff.metrics).toMatchObject({ nodeAdds: 1, edgeDels: 1 });
  });
});
