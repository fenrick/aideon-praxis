import { useEffect, useMemo, useState } from 'react';

import { listScenarios, type ScenarioSummary } from '@aideon/PraxisCanvas';

export interface WorkspaceTreeItem {
  id: string;
  label: string;
  kind: 'project' | 'workspace';
  children?: WorkspaceTreeItem[];
  meta?: {
    branch?: string;
    isDefault?: boolean;
  };
}

export interface WorkspaceTreeState {
  loading: boolean;
  error?: string;
  items: WorkspaceTreeItem[];
}

const FALLBACK_PROJECT_ID = 'project-scenarios';

function buildTreeFromScenarios(scenarios: ScenarioSummary[]): WorkspaceTreeItem[] {
  return [
    {
      id: FALLBACK_PROJECT_ID,
      label: 'Scenarios',
      kind: 'project',
      children: scenarios.map((scenario) => ({
        id: `workspace-${scenario.id}`,
        label: scenario.name || scenario.branch,
        kind: 'workspace',
        meta: { branch: scenario.branch, isDefault: scenario.isDefault },
      })),
    },
  ];
}

/**
 * Fetches the workspace tree from the host via Praxis adapters (scenarios -> workspaces).
 * Falls back to mock data when not running inside Tauri.
 */
export function useWorkspaceTree(): WorkspaceTreeState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(undefined);
      try {
        const result = await listScenarios();
        if (cancelled) return;
        setScenarios(result);
      } catch (unknownError) {
        if (cancelled) return;
        const message = unknownError instanceof Error ? unknownError.message : String(unknownError);
        setError(message || 'Failed to load workspaces');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo(() => buildTreeFromScenarios(scenarios), [scenarios]);

  return { loading, error, items };
}
