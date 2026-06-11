import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AideonToolbar, __test__ } from 'aideon/shell/aideon-toolbar';
import { AideonShellControlsProvider } from 'aideon/shell/shell-controls';
import type { UseThemeProps } from 'next-themes';

const toggleSidebar = vi.fn();
const keyTarget = globalThis as unknown as Window;

vi.mock('design-system/desktop-shell', async () => {
  const menubar = await import('design-system/components/ui/menubar');
  return {
    Menubar: menubar.Menubar,
    MenubarContent: menubar.MenubarContent,
    MenubarItem: menubar.MenubarItem,
    MenubarMenu: menubar.MenubarMenu,
    MenubarTrigger: menubar.MenubarTrigger,
    SidebarTrigger: ({ className }: { readonly className?: string }) => (
      <button
        type="button"
        className={className}
        onClick={() => {
          toggleSidebar();
        }}
      />
    ),
    useSidebar: () => ({ toggleSidebar }),
  };
});

afterEach(() => {
  cleanup();
  toggleSidebar.mockClear();
});

describe('AideonToolbar', () => {
  it('handles browser shortcuts and opens the command palette', () => {
    const toggleInspector = vi.fn();

    render(
      <AideonShellControlsProvider value={{ inspectorCollapsed: false, toggleInspector }}>
        <AideonToolbar title="Aideon" modeLabel="Browser preview" />
      </AideonShellControlsProvider>,
    );

    fireEvent.keyDown(keyTarget, { key: 'b', ctrlKey: true });
    expect(toggleSidebar).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(keyTarget, { key: 'i', ctrlKey: true });
    expect(toggleInspector).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(keyTarget, { key: 'k', ctrlKey: true });
    expect(screen.getByPlaceholderText('Search commands…')).toBeInTheDocument();
    expect(screen.getByText('Toggle navigation')).toBeInTheDocument();
    expect(screen.getByText('Toggle inspector')).toBeInTheDocument();
  });

  it('does not trigger shortcuts while typing in an input', () => {
    const toggleInspector = vi.fn();

    render(
      <AideonShellControlsProvider value={{ inspectorCollapsed: false, toggleInspector }}>
        <AideonToolbar
          title="Aideon"
          modeLabel="Browser preview"
          center={<input aria-label="Search" />}
        />
      </AideonShellControlsProvider>,
    );

    const input = screen.getByLabelText('Search');
    fireEvent.keyDown(input, { key: 'k', ctrlKey: true });

    expect(screen.queryByPlaceholderText('Search commands…')).not.toBeInTheDocument();
  });

  it('opens keyboard shortcuts from the command palette', () => {
    const toggleInspector = vi.fn();

    render(
      <AideonShellControlsProvider value={{ inspectorCollapsed: false, toggleInspector }}>
        <AideonToolbar title="Aideon" modeLabel="Browser preview" />
      </AideonShellControlsProvider>,
    );

    fireEvent.keyDown(keyTarget, { key: 'k', ctrlKey: true });
    fireEvent.click(screen.getByText('Keyboard shortcuts…'));

    expect(screen.getByText('Keyboard shortcuts')).toBeInTheDocument();
  });

  it('builds shell commands and handles shortcuts', () => {
    interface SidebarContextValue {
      state: 'expanded' | 'collapsed';
      open: boolean;
      setOpen: (open: boolean) => void;
      openMobile: boolean;
      setOpenMobile: (open: boolean) => void;
      isMobile: boolean;
      toggleSidebar: () => void;
    }

    const sidebar: SidebarContextValue = {
      state: 'expanded',
      open: true,
      setOpen: vi.fn(),
      openMobile: false,
      setOpenMobile: vi.fn(),
      isMobile: false,
      toggleSidebar: vi.fn(),
    };

    const shell = { toggleInspector: vi.fn(), inspectorCollapsed: false };
    const theme: UseThemeProps = {
      themes: ['system', 'light', 'dark'],
      setTheme: vi.fn(),
      theme: 'system',
      resolvedTheme: 'system',
      systemTheme: 'light',
      forcedTheme: undefined,
    };
    const workspace = [{ id: 'ws', label: 'Workspace', group: 'Workspace', onSelect: vi.fn() }];
    const commands = __test__.buildShellCommands({
      sidebar,
      shell,
      theme,
      workspaceCommands: workspace,
      shortcutLabelFor: (letter) => `Cmd+${letter}`,
    });

    expect(commands.some((command) => command.id === 'toggle_navigation')).toBe(true);
    expect(commands.some((command) => command.id === 'toggle_inspector')).toBe(true);
    expect(commands.some((command) => command.id === 'theme.system')).toBe(true);
    expect(commands.some((command) => command.id === 'ws')).toBe(true);

    const openCommandPalette = vi.fn();
    expect(
      __test__.handleBrowserShortcut({
        key: 'b',
        sidebar,
        shell,
        openCommandPalette,
      }),
    ).toBe(true);
    expect(
      __test__.handleBrowserShortcut({
        key: 'i',
        sidebar,
        shell,
        openCommandPalette,
      }),
    ).toBe(true);
    expect(
      __test__.handleBrowserShortcut({
        key: 'k',
        sidebar,
        shell,
        openCommandPalette,
      }),
    ).toBe(true);
    expect(openCommandPalette).toHaveBeenCalled();
  });

  it('recognises editable targets and mac platforms', () => {
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const div = document.createElement('div');
    Object.defineProperty(div, 'isContentEditable', { value: true, configurable: true });

    expect(__test__.isEditableTarget(input)).toBe(true);
    expect(__test__.isEditableTarget(textarea)).toBe(true);
    expect(__test__.isEditableTarget(div)).toBe(true);
    const textNode = document.createTextNode('text');
    expect(__test__.isEditableTarget(textNode)).toBe(false);

    expect(typeof __test__.isMacPlatform()).toBe('boolean');
  });
});
