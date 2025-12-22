import { describe, expect, it, vi } from 'vitest';

vi.mock('praxis/platform', () => ({ isTauri: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

import { invoke } from '@tauri-apps/api/core';
import { isTauri } from 'praxis/platform';

import {
  applyOperations,
  getCatalogueView,
  getChartView,
  getGraphView,
  getMatrixView,
  getStateAtSnapshot,
  listTemporalCommits,
  mergeTemporalBranches,
} from 'praxis/praxis-api';

const isTauriMock = vi.mocked(isTauri);
const invokeMock = vi.mocked(invoke);

describe('praxis-api mock branches', () => {
  it('covers mock builders for catalogue, matrix, chart, commits, merge, operations, state-at', async () => {
    isTauriMock.mockReturnValue(false);

    const catalogue = await getCatalogueView({
      id: 'cat',
      name: 'Catalogue',
      kind: 'catalogue',
      asOf: '2025-01-01T00:00:00Z',
      columns: [],
    });
    expect(catalogue.columns.length).toBeGreaterThan(0);

    const matrix = await getMatrixView({
      id: 'm1',
      name: 'Matrix',
      kind: 'matrix',
      asOf: '2025-01-01T00:00:00Z',
      rowType: 'Capability',
      columnType: 'Service',
      relationship: 'depends_on',
    });
    expect(matrix.cells.length).toBeGreaterThan(0);

    const kpi = await getChartView({
      id: 'c1',
      name: 'KPI',
      kind: 'chart',
      asOf: '2025-01-01T00:00:00Z',
      chartType: 'kpi',
      measure: 'count',
    });
    expect(kpi.kpi?.value).toBeGreaterThan(0);

    const line = await getChartView({
      id: 'c2',
      name: 'Line',
      kind: 'chart',
      asOf: '2025-01-01T00:00:00Z',
      chartType: 'line',
      measure: 'velocity',
    });
    expect(line.series[0]?.points.length).toBe(7);

    const bar = await getChartView({
      id: 'c3',
      name: 'Bar',
      kind: 'chart',
      asOf: '2025-01-01T00:00:00Z',
      chartType: 'bar',
      measure: 'score',
    });
    expect(bar.series.length).toBe(2);

    const commits = await listTemporalCommits('chronaplay');
    expect(commits.length).toBeGreaterThan(0);
    expect(commits[0]?.branch).toBe('chronaplay');

    const merge = await mergeTemporalBranches({ source: 'chronaplay', target: 'main' });
    expect(merge.result).toBe('conflicts');
    expect(merge.conflicts?.[0]?.reference).toBeTruthy();

    const opResult = await applyOperations([{ kind: 'deleteNode', nodeId: 'n1' }]);
    expect(opResult.accepted).toBe(true);
    expect(opResult.commitId).toMatch(/^mock-commit-/);

    const state = await getStateAtSnapshot({ asOf: '2025-01-01T00:00:00Z' });
    expect(state.scenario).toBeDefined();
    expect(typeof state.nodes).toBe('number');
  });

  it('invokes host on success when in Tauri', async () => {
    isTauriMock.mockReturnValue(true);
    const graphView = {
      metadata: {
        id: 'g1',
        name: 'Graph',
        asOf: '2025-01-01',
        fetchedAt: '2025-01-01',
        source: 'host' as const,
      },
      stats: { nodes: 1, edges: 0 },
      nodes: [{ id: 'n1', label: 'Node 1' }],
      edges: [],
    };
    invokeMock.mockResolvedValueOnce(graphView);

    await expect(
      getGraphView({ id: 'g1', name: 'Graph', kind: 'graph', asOf: '2025-01-01' }),
    ).resolves.toMatchObject({ stats: { nodes: 1 } });
  });
});
