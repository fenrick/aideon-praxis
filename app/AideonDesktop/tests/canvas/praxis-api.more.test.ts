import { describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
const invoke = vi.mocked(await import('@tauri-apps/api/core').then((m) => m.invoke));

vi.mock('canvas/platform', () => ({ isTauri: () => true }));

const baseMeta = {
  id: 'chart1',
  name: 'Chart',
  asOf: '2025-01-01T00:00:00Z',
  fetchedAt: '2025-01-01T00:00:00Z',
  source: 'host' as const,
};

describe('praxis-api host paths', () => {
  it('merges branches and surfaces conflicts', async () => {
    invoke.mockResolvedValueOnce({ conflicts: [{ reference: 'r1', kind: 'diverge', message: 'conflict' }] });
    const { mergeTemporalBranches } = await import('../../src/canvas/praxis-api');

    const result = await mergeTemporalBranches({ source: 'a', target: 'b' });

    expect(result.conflicts?.[0]).toMatchObject({ reference: 'r1', kind: 'diverge', message: 'conflict' });
  });

  it('fills in missing branch names when listing commits', async () => {
    invoke.mockResolvedValueOnce({ commits: [{ id: 'c1', parents: [], message: 'msg', change_count: 1 }] });
    const { listTemporalCommits } = await import('../../src/canvas/praxis-api');

    const commits = await listTemporalCommits('dev');
    expect(commits[0]).toMatchObject({ id: 'c1', branch: 'dev', changeCount: 1 });
  });

  it('invokes host for chart view when in tauri', async () => {
    invoke.mockResolvedValueOnce({ metadata: baseMeta, chartType: 'kpi', series: [] });
    const { getChartView } = await import('../../src/canvas/praxis-api');

    const view = await getChartView({ ...baseMeta, kind: 'chart', chartType: 'kpi', measure: 'm' });
    expect(view.chartType).toBe('kpi');
    expect(invoke).toHaveBeenCalledWith('praxis_chart_view', { definition: expect.objectContaining({ kind: 'chart' }) });
  });
});
