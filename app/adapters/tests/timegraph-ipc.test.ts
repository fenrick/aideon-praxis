import { describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (cmd: string, args?: Record<string, unknown>) =>
    Promise.resolve(
      cmd === 'commit_changes'
        ? { id: 'c1' }
        : cmd === 'list_commits'
          ? { commits: [] }
          : {
              asOf: (args as any)?.asOf ?? 'x',
              scenario: (args as any)?.scenario ?? null,
              confidence: (args as any)?.confidence ?? null,
              nodes: 0,
              edges: 0,
            },
    ),
}));

describe('IpcTemporalAdapter', () => {
  it('stateAt/commit/list/create stubs roundtrip', async () => {
    const { IpcTemporalAdapter } = await import('../src/timegraph-ipc');
    const a = new IpcTemporalAdapter();
    const s = await a.stateAt({ asOf: '2025-01-01' });
    expect(s.asOf).toBe('2025-01-01');
    const c = await a.commit({ branch: 'main', asOf: '2025-01-01', addNodes: ['n1'] });
    expect(c.id).toBe('c1');
    const ls = await a.listCommits({ branch: 'main' });
    expect(Array.isArray(ls)).toBe(true);
    await a.createBranch({ name: 'feature/x', from: 'c1' });
  });
});
