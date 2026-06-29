import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SidebarProvider } from 'design-system/components/ui/sidebar';
import { TooltipProvider } from 'design-system/components/ui/tooltip';
import { ProjectsSidebar } from 'praxis/components/template-screen/projects-sidebar';

const scenarios = [
  { id: 's1', name: 'Default', branch: 'main', updatedAt: '2024-01-02', isDefault: true },
  { id: 's2', name: 'Feature', branch: 'feat', updatedAt: '2024-01-03', isDefault: false },
];

describe('ProjectsSidebar', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows skeleton while loading', () => {
    const { container } = render(
      <TooltipProvider>
        <SidebarProvider>
          <ProjectsSidebar scenarios={[]} loading error={undefined} onRetry={vi.fn()} />
        </SidebarProvider>
      </TooltipProvider>,
    );
    expect(container.querySelectorAll('.h-5').length).toBeGreaterThan(0);
  });

  it('renders scenarios and triggers selection', () => {
    const onSelect = vi.fn();
    render(
      <TooltipProvider>
        <SidebarProvider>
          <ProjectsSidebar
            projects={[{ id: 'p1', name: 'Proj', scenarios }]}
            scenarios={scenarios}
            loading={false}
            error={undefined}
            activeScenarioId="s2"
            onSelectScenario={onSelect}
          />
        </SidebarProvider>
      </TooltipProvider>,
    );

    const featureButtons = screen
      .getAllByText('Feature')
      .map((node) => node.closest('button'))
      .filter(Boolean);
    const activeFeatureButton = featureButtons.find((button) => button?.dataset.state === 'active');
    expect(activeFeatureButton).toBeDefined();
    activeFeatureButton?.click();
    expect(onSelect).toHaveBeenCalledWith('s2');
  });

  it('renders error with retry', () => {
    const onRetry = vi.fn();
    render(
      <TooltipProvider>
        <SidebarProvider>
          <ProjectsSidebar
            scenarios={scenarios}
            projects={[]}
            loading={false}
            error="boom"
            onRetry={onRetry}
          />
        </SidebarProvider>
      </TooltipProvider>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('boom');
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalled();
  });
});
