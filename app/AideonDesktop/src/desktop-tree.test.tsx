import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SidebarProvider } from './design-system';

vi.mock('./canvas', () => ({
  listScenarios: vi
    .fn()
    .mockResolvedValue([
      { id: 'p1-w1', name: 'Workspace · Default', branch: 'main', updatedAt: '2025-11-01T00:00Z' },
    ]),
}));

import { listScenarios } from './canvas';

import { DesktopTree } from './desktop-tree';

describe('DesktopTree', () => {
  it('renders stub projects and workspaces', () => {
    render(
      <SidebarProvider>
        <DesktopTree />
      </SidebarProvider>,
    );

    return waitFor(() => {
      expect(screen.getByText('Scenarios')).toBeTruthy();
      expect(screen.getByText('Workspace · Default')).toBeTruthy();
    });
  });

  it('shows an error when loading fails', async () => {
    vi.mocked(listScenarios).mockRejectedValueOnce(new Error('offline'));

    render(
      <SidebarProvider>
        <DesktopTree />
      </SidebarProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to load workspaces/i)).toBeTruthy();
    });
  });
});
