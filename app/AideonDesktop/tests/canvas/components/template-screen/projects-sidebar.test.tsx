import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProjectsSidebar } from 'canvas/components/template-screen/projects-sidebar';
import { SidebarProvider } from 'design-system/components/ui/sidebar';

const scenarios = [
  { id: 's1', name: 'Default', branch: 'main', updatedAt: '2024-01-02', isDefault: true },
  { id: 's2', name: 'Feature', branch: 'feat', updatedAt: undefined, isDefault: false },
];

describe('ProjectsSidebar', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows skeleton while loading', () => {
    const { container } = render(
      <SidebarProvider>
        <ProjectsSidebar scenarios={[]} loading error={undefined} onRetry={vi.fn()} />
      </SidebarProvider>,
    );
    expect(container.querySelectorAll('.h-5').length).toBeGreaterThan(0);
  });

  it('renders scenarios and triggers selection', () => {
    const onSelect = vi.fn();
    render(
      <SidebarProvider>
        <ProjectsSidebar
          projects={[{ id: 'p1', name: 'Proj', scenarios }]}
          scenarios={scenarios}
          loading={false}
          error={undefined}
          activeScenarioId="s2"
          onSelectScenario={onSelect}
        />
      </SidebarProvider>,
    );

    const featureButton = screen.getByText('Feature').closest('button');
    expect(featureButton?.dataset.state).toBe('active');
    featureButton?.click();
    expect(onSelect).toHaveBeenCalledWith('s2');
  });

  it('renders error with retry', () => {
    const onRetry = vi.fn();
    render(
      <SidebarProvider>
        <ProjectsSidebar
          scenarios={scenarios}
          projects={[]}
          loading={false}
          error="boom"
          onRetry={onRetry}
        />
      </SidebarProvider>,
    );
    fireEvent.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.getByText(/Failed to load scenarios/)).toBeInTheDocument();
  });
});
