import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProjectsSidebar } from './projects-sidebar';

// Minimal stubs — only the shell chrome that surrounds the content under test.
vi.mock('design-system/desktop-shell', async (importOriginal) => {
  const actual = await importOriginal<typeof import('design-system/desktop-shell')>();
  return {
    ...actual,
    Sidebar: ({ children, ...rest }: React.HTMLAttributes<HTMLElement>) => (
      <aside {...rest}>{children}</aside>
    ),
    SidebarContent: ({ children, ...rest }: React.HTMLAttributes<HTMLElement>) => (
      <div {...rest}>{children}</div>
    ),
    SidebarGroup: ({ children, ...rest }: React.HTMLAttributes<HTMLElement>) => (
      <div {...rest}>{children}</div>
    ),
    SidebarGroupContent: ({ children, ...rest }: React.HTMLAttributes<HTMLElement>) => (
      <div {...rest}>{children}</div>
    ),
    SidebarGroupLabel: ({ children, ...rest }: React.HTMLAttributes<HTMLElement>) => (
      <div {...rest}>{children}</div>
    ),
    SidebarHeader: ({ children, ...rest }: React.HTMLAttributes<HTMLElement>) => (
      <header {...rest}>{children}</header>
    ),
    SidebarInput: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
    SidebarMenu: ({ children, ...rest }: React.HTMLAttributes<HTMLElement>) => (
      <ul {...rest}>{children}</ul>
    ),
    SidebarMenuButton: ({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...rest}>{children}</button>
    ),
    SidebarMenuItem: ({ children, ...rest }: React.HTMLAttributes<HTMLElement>) => (
      <li {...rest}>{children}</li>
    ),
  };
});

describe('ProjectsSidebar', () => {
  describe('empty state', () => {
    it('renders an accessible empty-state when a project has no scenarios', () => {
      render(
        <ProjectsSidebar
          projects={[{ id: 'p1', name: 'Alpha', scenarios: [] }]}
          scenarios={[]}
          loading={false}
        />,
      );
      expect(screen.getByText(/no scenarios/i)).toBeInTheDocument();
    });

    it('does not render a disabled button as the empty-state message', () => {
      render(
        <ProjectsSidebar
          projects={[{ id: 'p1', name: 'Alpha', scenarios: [] }]}
          scenarios={[]}
          loading={false}
        />,
      );
      const buttons = screen.queryAllByRole('button');
      const disabledEmptyStateButton = buttons.find(
        (b) => b.hasAttribute('disabled') && /no scenarios/i.test(b.textContent ?? ''),
      );
      expect(disabledEmptyStateButton).toBeUndefined();
    });

    it('renders an accessible empty-state when no scenarios match the filter', () => {
      const { rerender } = render(
        <ProjectsSidebar
          projects={[
            {
              id: 'p1',
              name: 'Alpha',
              scenarios: [{ id: 's1', name: 'Base', branch: 'main', isDefault: true }],
            },
          ]}
          scenarios={[]}
          loading={false}
        />,
      );
      // Simulate typing a query that matches nothing
      const input = screen.getByPlaceholderText(/filter scenarios/i);
      fireEvent.change(input, { target: { value: 'zzz-no-match' } });
      expect(screen.getByText(/no scenarios match/i)).toBeInTheDocument();
    });
  });

  describe('UI-state isolation', () => {
    it('filter query is independent between two sidebar instances', () => {
      const scenarios = [
        { id: 's1', name: 'Alpha', branch: 'main', isDefault: true },
        { id: 's2', name: 'Beta', branch: 'feat', isDefault: false },
      ];
      const { unmount } = render(
        <ProjectsSidebar
          projects={[{ id: 'p1', name: 'P', scenarios }]}
          scenarios={scenarios}
          loading={false}
          data-testid="sidebar-a"
        />,
      );

      // Type 'zzz' into first sidebar's filter — should hide all scenarios
      const inputA = screen.getByPlaceholderText(/filter scenarios/i);
      fireEvent.change(inputA, { target: { value: 'zzz' } });
      expect(screen.queryByText('Alpha')).toBeNull();

      // Unmount; a second sidebar should start with an empty filter
      unmount();

      render(
        <ProjectsSidebar
          projects={[{ id: 'p1', name: 'P', scenarios }]}
          scenarios={scenarios}
          loading={false}
        />,
      );
      // Second instance starts fresh — both scenarios visible
      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText('Beta')).toBeInTheDocument();
    });
  });

  describe('stale state', () => {
    it('shows no stale badge by default', () => {
      render(<ProjectsSidebar projects={[]} scenarios={[]} loading={false} />);
      expect(screen.queryByText(/stale/i)).toBeNull();
    });

    it('shows a stale badge when stale=true', () => {
      render(<ProjectsSidebar projects={[]} scenarios={[]} loading={false} stale />);
      expect(screen.getByText(/stale/i)).toBeInTheDocument();
    });
  });

  describe('rebuilding state', () => {
    it('shows no rebuilding indicator by default', () => {
      render(<ProjectsSidebar projects={[]} scenarios={[]} loading={false} />);
      expect(screen.queryByText(/rebuilding/i)).toBeNull();
    });

    it('shows a rebuilding indicator when rebuilding=true', () => {
      render(<ProjectsSidebar projects={[]} scenarios={[]} loading={false} rebuilding />);
      expect(screen.getByText(/rebuilding/i)).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('renders an alert region when an error is present', () => {
      render(
        <ProjectsSidebar projects={[]} scenarios={[]} loading={false} error="Network failure" />,
      );
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('includes the error message in the alert region', () => {
      render(<ProjectsSidebar projects={[]} scenarios={[]} loading={false} error="Timed out" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Timed out');
    });

    it('surfaces a retry button when onRetry is provided', () => {
      const onRetry = vi.fn();
      render(
        <ProjectsSidebar
          projects={[]}
          scenarios={[]}
          loading={false}
          error="Timed out"
          onRetry={onRetry}
        />,
      );
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });
  });
});
