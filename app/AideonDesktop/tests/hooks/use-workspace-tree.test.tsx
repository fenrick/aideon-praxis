import { cleanup, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useWorkspaceTree } from '../../src/hooks/use-workspace-tree';
import { listScenarios } from '../../src/canvas';

vi.mock('../../src/canvas', () => ({
  listScenarios: vi.fn(),
}));

const listScenariosMock = vi.mocked(listScenarios);

function WorkspaceTreeProbe() {
  const { loading, error, items } = useWorkspaceTree();
  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'ready'}</div>
      <div data-testid="error">{error ?? ''}</div>
      <div data-testid="tree">{JSON.stringify(items)}</div>
    </div>
  );
}

describe('useWorkspaceTree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('builds a workspace tree from scenario summaries', async () => {
    listScenariosMock.mockResolvedValue([
      {
        id: 'scenario-main',
        name: 'Main branch',
        branch: 'main',
        updatedAt: '2025-01-01T00:00:00.000Z',
        isDefault: true,
      },
      {
        id: 'scenario-exp',
        name: '',
        branch: 'experiments',
        description: 'preview',
        updatedAt: '2025-01-02T00:00:00.000Z',
      },
    ]);

    render(<WorkspaceTreeProbe />);

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'));

    const treeItems = JSON.parse(screen.getByTestId('tree').textContent ?? '[]');
    expect(treeItems).toHaveLength(1);
    expect(treeItems[0]).toMatchObject({
      id: 'project-scenarios',
      label: 'Scenarios',
      kind: 'project',
    });
    const workspaces = treeItems[0]?.children ?? [];
    expect(workspaces).toHaveLength(2);
    expect(workspaces[0]).toMatchObject({
      id: 'workspace-scenario-main',
      label: 'Main branch',
      meta: { branch: 'main', isDefault: true },
    });
    expect(workspaces[1]).toMatchObject({
      id: 'workspace-scenario-exp',
      label: 'experiments',
      meta: { branch: 'experiments' },
    });
    expect(workspaces[1]?.meta?.isDefault).toBeUndefined();
  });

  it('surfaces host errors and stops loading', async () => {
    listScenariosMock.mockRejectedValue(new Error('host unreachable'));

    render(<WorkspaceTreeProbe />);

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'));

    expect(screen.getByTestId('error').textContent).toBe('host unreachable');
    const treeItems = JSON.parse(screen.getByTestId('tree').textContent ?? '[]');
    expect(treeItems[0]?.children).toHaveLength(0);
  });
});
