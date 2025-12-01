import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SidebarProvider } from '@aideon/design-system';
import { vi } from 'vitest';

vi.mock('./hooks/useWorkspaceTree', () => ({
  useWorkspaceTree: () => ({
    loading: false,
    items: [
      {
        id: 'project-1',
        label: 'Project Alpha',
        kind: 'project',
        children: [{ id: 'workspace-1', label: 'Workspace · Default', kind: 'workspace' }],
      },
    ],
  }),
}));

import { DesktopTree } from './DesktopTree';

describe('DesktopTree', () => {
  it('renders stub projects and workspaces', () => {
    render(
      <SidebarProvider>
        <DesktopTree />
      </SidebarProvider>,
    );

    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('Workspace · Default')).toBeInTheDocument();
  });
});
