import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SidebarProvider } from '@aideon/design-system';

vi.mock('@aideon/PraxisCanvas', () => ({
  listScenarios: vi.fn().mockResolvedValue([
    { id: 'p1-w1', name: 'Workspace · Default', branch: 'main', updatedAt: '2025-11-01T00:00Z' },
  ]),
}));

import { DesktopTree } from './DesktopTree';

describe('DesktopTree', () => {
  it('renders stub projects and workspaces', () => {
    render(
      <SidebarProvider>
        <DesktopTree />
      </SidebarProvider>,
    );

    return waitFor(() => {
      expect(screen.getByText('Scenarios')).toBeInTheDocument();
      expect(screen.getByText('Workspace · Default')).toBeInTheDocument();
    });
  });

  it('shows an error when loading fails', async () => {
    const listScenarios = vi.mocked(
      (await import('@aideon/PraxisCanvas')).listScenarios,
      true,
    );
    listScenarios.mockRejectedValueOnce(new Error('offline'));

    render(
      <SidebarProvider>
        <DesktopTree />
      </SidebarProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to load workspaces/i)).toBeInTheDocument();
    });
  });
});
