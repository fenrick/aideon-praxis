import { useEffect, useState } from 'react';

export type WorkspaceTreeItem = {
  id: string;
  label: string;
  kind: 'project' | 'workspace';
  children?: WorkspaceTreeItem[];
};

export interface WorkspaceTreeState {
  loading: boolean;
  error?: string;
  items: WorkspaceTreeItem[];
}

const STUB_TREE: WorkspaceTreeItem[] = [
  {
    id: 'project-1',
    label: 'Project Alpha',
    kind: 'project',
    children: [
      { id: 'workspace-1', label: 'Workspace · Default', kind: 'workspace' },
      { id: 'workspace-2', label: 'Workspace · Explore', kind: 'workspace' },
    ],
  },
  {
    id: 'project-2',
    label: 'Project Beta',
    kind: 'project',
    children: [{ id: 'workspace-3', label: 'Workspace · Timeline', kind: 'workspace' }],
  },
];

/**
 * Temporary stub that will later call host/adapters to fetch projects/workspaces.
 */
export function useWorkspaceTree(): WorkspaceTreeState {
  const [state, setState] = useState<WorkspaceTreeState>({ loading: true, items: [] });

  useEffect(() => {
    const timer = setTimeout(() => {
      setState({ loading: false, items: STUB_TREE });
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return state;
}
