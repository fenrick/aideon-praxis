import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('design-system/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, ...properties }: PropsWithChildren<Record<string, unknown>>) => (
    <div {...properties}>{children}</div>
  ),
}));

vi.mock('design-system/desktop-shell', () => ({
  SidebarProvider: ({ children }: PropsWithChildren) => <div>{children}</div>,
  Sidebar: ({ children }: PropsWithChildren) => <div>{children}</div>,
  SidebarContent: ({ children }: PropsWithChildren) => <div>{children}</div>,
  SidebarInset: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));

vi.mock('design-system/lib/utilities', () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
}));

import { AideonDesktopShell } from 'aideon/shell/aideon-desktop-shell';
import { useAideonShellControls } from 'aideon/shell/shell-controls';

/**
 * Patch `globalThis.localStorage` for inspector-state persistence tests.
 * @param storage replacement storage implementation
 */
function setLocalStorage(storage: Storage | undefined) {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
}

describe('AideonDesktopShell storage', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders slots without a toolbar and tolerates missing localStorage', () => {
    setLocalStorage(undefined);

    render(
      <AideonDesktopShell
        navigation={<div>Nav</div>}
        content={<div>Content</div>}
        inspector={<div>Inspector</div>}
      />,
    );

    expect(screen.getByText('Nav')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Inspector')).toBeInTheDocument();
    expect(screen.queryByText('Toolbar')).not.toBeInTheDocument();
  });

  it('reads the persisted inspector-collapsed flag on mount', () => {
    const getItem = vi.fn().mockReturnValue('1');
    setLocalStorage({ getItem, setItem: vi.fn() } as unknown as Storage);

    render(
      <AideonDesktopShell
        navigation={<div>Nav</div>}
        content={<div>Content</div>}
        inspector={<div>Inspector</div>}
        toolbar={<div>Toolbar</div>}
      />,
    );

    expect(getItem).toHaveBeenCalledWith('aideon-shell-inspector-collapsed');
    expect(screen.getByText('Toolbar')).toBeInTheDocument();
  });

  it('persists inspector collapse state when toggled', () => {
    const getItem = vi.fn();
    const setItem = vi.fn();
    setLocalStorage({ getItem, setItem } as unknown as Storage);

    /**
     * Toolbar stand-in that toggles the inspector via shell controls.
     */
    function ToggleInspector() {
      const shell = useAideonShellControls();
      return (
        <button
          type="button"
          onClick={() => {
            shell?.toggleInspector();
          }}
        >
          toggle
        </button>
      );
    }

    render(
      <AideonDesktopShell
        navigation={<div>Nav</div>}
        content={<div>Content</div>}
        inspector={<div>Inspector</div>}
        toolbar={<ToggleInspector />}
      />,
    );

    fireEvent.click(screen.getByText('toggle'));
    expect(setItem).toHaveBeenCalledWith('aideon-shell-inspector-collapsed', '1');
  });

  it('tolerates a throwing localStorage on read', () => {
    const getItem = vi.fn(() => {
      throw new Error('blocked');
    });
    setLocalStorage({ getItem, setItem: vi.fn() } as unknown as Storage);

    render(
      <AideonDesktopShell
        navigation={<div>Nav</div>}
        content={<div>Content</div>}
        inspector={<div>Inspector</div>}
      />,
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});
