import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as canvasModule from '../../src/canvas';
import { useWorkspaceTree } from '../../src/hooks/use-workspace-tree';

describe('useWorkspaceTree', () => {
  let listScenariosSpy: vi.SpyInstance<
    ReturnType<typeof canvasModule.listScenarios>,
    Parameters<typeof canvasModule.listScenarios>
  >;

  beforeEach(() => {
    listScenariosSpy = vi.spyOn(canvasModule, 'listScenarios');
    listScenariosSpy.mockResolvedValue([
      {
        id: 's-default',
        name: '',
        branch: 'main',
        isDefault: true,
        updatedAt: '2024-11-05T00:00:00Z',
      },
      {
        id: 's-feature',
        name: 'Feature Exploration',
        branch: 'feature/refactor',
        updatedAt: '2024-12-01T00:00:00Z',
      },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps host scenarios into workspace tree items and keeps metadata', async () => {
    const { result } = renderHook(() => useWorkspaceTree());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeUndefined();
    expect(result.current.items).toHaveLength(1);

    const [project] = result.current.items;
    expect(project.label).toBe('Scenarios');
    expect(project.children).toHaveLength(2);

    const [defaultWorkspace, featureWorkspace] = project.children ?? [];
    expect(defaultWorkspace).toMatchObject({
      id: 'workspace-s-default',
      label: 'main',
      kind: 'workspace',
      meta: { branch: 'main', isDefault: true },
    });
    expect(featureWorkspace).toMatchObject({
      id: 'workspace-s-feature',
      label: 'Feature Exploration',
      meta: { branch: 'feature/refactor', isDefault: undefined },
    });
  });

  it('surfaces errors when scenario loading fails', async () => {
    listScenariosSpy.mockRejectedValueOnce(new Error('offline'));

    const { result } = renderHook(() => useWorkspaceTree());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('offline');
    expect(result.current.items[0]?.children).toHaveLength(0);
  });

  it('uses the fallback error message when the thrown value is empty', async () => {
    listScenariosSpy.mockRejectedValueOnce('');

    const { result } = renderHook(() => useWorkspaceTree());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Failed to load workspaces');
  });

  it('returns an empty workspace list when no scenarios are available', async () => {
    listScenariosSpy.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useWorkspaceTree());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.children).toEqual([]);
  });
});
