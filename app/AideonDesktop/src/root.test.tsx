import type { ReactNode } from 'react';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-resizable-panels', () => ({
  PanelGroup: ({ children }: { readonly children: ReactNode }) => <div>{children}</div>,
  Panel: ({ children }: { readonly children: ReactNode }) => <div>{children}</div>,
  PanelResizeHandle: () => <div aria-label="Resize handle" />,
}));

vi.mock('./canvas', () => ({
  PraxisCanvasSurface: ({ onSelectionChange }: { readonly onSelectionChange?: () => void }) => {
    onSelectionChange?.();
    return <div>Praxis Canvas Surface</div>;
  },
}));

vi.mock('./hooks/use-workspace-tree', () => ({
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

import { AideonDesktopRoot } from './root';

describe('AideonDesktopRoot', () => {
  it('renders the desktop shell placeholders', () => {
    render(<AideonDesktopRoot />);

    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(screen.getByText(/Project Alpha/)).toBeInTheDocument();
    expect(screen.getByText(/Praxis Canvas Surface/i)).toBeInTheDocument();
    expect(screen.getByText(/Properties/)).toBeInTheDocument();
  });
});
