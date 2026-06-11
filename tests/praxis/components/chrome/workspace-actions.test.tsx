import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SidebarProvider } from 'design-system/components/ui/sidebar';
import { WorkspaceActions } from 'praxis/components/chrome/workspace-actions';

describe('WorkspaceActions', () => {
  it('renders the action groups and labels', () => {
    render(
      <SidebarProvider>
        <WorkspaceActions />
      </SidebarProvider>,
    );

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    expect(screen.getByText('Customize workspace')).toBeInTheDocument();
    expect(screen.getByText('Export snapshot')).toBeInTheDocument();
    expect(screen.getByText('View analytics')).toBeInTheDocument();
  });
});
