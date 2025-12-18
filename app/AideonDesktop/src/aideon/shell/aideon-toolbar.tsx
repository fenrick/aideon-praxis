import { useEffect, useMemo, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';

import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from 'design-system';
import { Toolbar, ToolbarSection, ToolbarSeparator } from 'design-system/blocks/toolbar';
import { Badge } from 'design-system/components/ui/badge';
import { Button } from 'design-system/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from 'design-system/components/ui/dropdown-menu';
import { Kbd } from 'design-system/components/ui/kbd';
import { cn } from 'design-system/lib/utilities';
import {
  CommandIcon,
  LaptopIcon,
  MoonIcon,
  PanelLeftIcon,
  PanelRightClose,
  PanelRightOpen,
  SunIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAideonShellControls } from './shell-controls';

import { useSidebar } from 'design-system/desktop-shell';
import { AideonCommandPalette, type AideonCommandItem } from './command-palette';

export interface AideonToolbarProperties extends Readonly<ComponentPropsWithoutRef<'div'>> {
  readonly title: string;
  readonly subtitle?: string;
  readonly modeLabel?: string;
  readonly start?: ReactNode;
  readonly center?: ReactNode;
  readonly end?: ReactNode;
  readonly statusMessage?: string;
  readonly commands?: readonly AideonCommandItem[];
}

/**
 * Safely read sidebar controls when the toolbar is rendered outside a SidebarProvider (tests).
 */
function useOptionalSidebar() {
  try {
    return useSidebar();
  } catch {
    return;
  }
}

/**
 * Detect whether we are running inside a Tauri runtime.
 */
function isTauriRuntime(): boolean {
  const metaEnvironment = (import.meta as { env?: { TAURI_PLATFORM?: string } }).env;
  return Boolean(metaEnvironment?.TAURI_PLATFORM);
}

/**
 * Best-effort platform detection without deprecated `navigator.platform`.
 */
function isMacPlatform(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('mac') || ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod');
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || target.isContentEditable;
}

function shortcutFor(letter: string): string {
  return isMacPlatform() ? `⌘${letter}` : `Ctrl+${letter}`;
}

function useOptionalTheme() {
  try {
    return useTheme();
  } catch {
    return;
  }
}

function buildShellCommands({
  sidebar,
  shell,
  theme,
  workspaceCommands,
}: {
  readonly sidebar: ReturnType<typeof useOptionalSidebar>;
  readonly shell: ReturnType<typeof useAideonShellControls>;
  readonly theme: ReturnType<typeof useOptionalTheme>;
  readonly workspaceCommands: readonly AideonCommandItem[];
}): AideonCommandItem[] {
  const viewCommands: AideonCommandItem[] = [
    ...(sidebar
      ? ([
          {
            id: 'toggle-navigation',
            group: 'View',
            label: 'Toggle navigation',
            shortcut: shortcutFor('B'),
            onSelect: () => {
              sidebar.toggleSidebar();
            },
          },
        ] satisfies AideonCommandItem[])
      : []),
    ...(shell
      ? ([
          {
            id: 'toggle-inspector',
            group: 'View',
            label: 'Toggle inspector',
            shortcut: shortcutFor('I'),
            onSelect: () => {
              shell.toggleInspector();
            },
          },
        ] satisfies AideonCommandItem[])
      : []),
  ];

  const themeCommands: AideonCommandItem[] = theme
    ? ([
        {
          id: 'theme.system',
          group: 'Theme',
          label: 'Use system theme',
          onSelect: () => {
            theme.setTheme('system');
          },
        },
        {
          id: 'theme.light',
          group: 'Theme',
          label: 'Light theme',
          onSelect: () => {
            theme.setTheme('light');
          },
        },
        {
          id: 'theme.dark',
          group: 'Theme',
          label: 'Dark theme',
          onSelect: () => {
            theme.setTheme('dark');
          },
        },
      ] satisfies AideonCommandItem[])
    : [];

  return [...viewCommands, ...themeCommands, ...workspaceCommands];
}

function handleBrowserShortcut({
  key,
  sidebar,
  shell,
  openCommandPalette,
}: {
  readonly key: string;
  readonly sidebar: ReturnType<typeof useOptionalSidebar>;
  readonly shell: ReturnType<typeof useAideonShellControls>;
  readonly openCommandPalette: () => void;
}): boolean {
  switch (key) {
    case 'b': {
      if (!sidebar) {
        return false;
      }
      sidebar.toggleSidebar();
      return true;
    }
    case 'i': {
      if (!shell) {
        return false;
      }
      shell.toggleInspector();
      return true;
    }
    case 'k': {
      openCommandPalette();
      return true;
    }
    default: {
      return false;
    }
  }
}

/**
 * Application-level toolbar shell for Aideon Desktop.
 * Workspace modules provide `center` (search) and `end` (actions) content.
 * @param root0
 * @param root0.title
 * @param root0.subtitle
 * @param root0.modeLabel
 * @param root0.start
 * @param root0.center
 * @param root0.end
 * @param root0.statusMessage
 * @param root0.className
 */
export function AideonToolbar({
  title,
  subtitle,
  modeLabel,
  start,
  center,
  end,
  statusMessage,
  commands: workspaceCommands = [],
  className,
  ...properties
}: AideonToolbarProperties) {
  const sidebar = useOptionalSidebar();
  const shell = useAideonShellControls();
  const isTauri = isTauriRuntime();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const theme = useOptionalTheme();

  const commands = useMemo(() => {
    return buildShellCommands({ sidebar, shell, theme, workspaceCommands });
  }, [shell, sidebar, theme, workspaceCommands]);

  useEffect(() => {
    if (isTauri) {
      return;
    }
    const handleKeydown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }
      if (isEditableTarget(event.target)) {
        return;
      }
      const key = event.key.toLowerCase();
      const didHandle = handleBrowserShortcut({
        key,
        sidebar,
        shell,
        openCommandPalette: () => {
          setCommandPaletteOpen(true);
        },
      });
      if (didHandle) {
        event.preventDefault();
      }
    };
    globalThis.addEventListener('keydown', handleKeydown);
    return () => {
      globalThis.removeEventListener('keydown', handleKeydown);
    };
  }, [isTauri, shell, sidebar]);

  useEffect(() => {
    if (!isTauri) {
      return;
    }
    let cancelled = false;
    let unlisten: undefined | (() => void);

    const subscribe = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        if (cancelled) {
          return;
        }
        unlisten = await listen<{ command?: string }>('aideon.shell.command', (event) => {
          const command = event.payload.command;
          if (command === 'toggle-navigation') {
            sidebar?.toggleSidebar();
          }
          if (command === 'toggle-inspector') {
            shell?.toggleInspector();
          }
          if (command === 'open-command-palette') {
            setCommandPaletteOpen(true);
          }
        });
      } catch {
        // ignore missing tauri event module (browser preview)
      }
    };

    subscribe().catch((_ignoredError: unknown) => {
      // ignore missing tauri event module (browser preview)
    });

    return () => {
      cancelled = true;
      if (unlisten) {
        unlisten();
      }
    };
  }, [isTauri, shell, sidebar]);

  return (
    <div className={cn('flex flex-col gap-2', className)} {...properties}>
      <Toolbar className="h-12 w-full rounded-2xl px-3 py-2">
        <ToolbarSection className="min-w-0 gap-2">
          {sidebar ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Toggle navigation"
              onClick={() => {
                sidebar.toggleSidebar();
              }}
            >
              <PanelLeftIcon className="size-4" />
            </Button>
          ) : undefined}
          {shell ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Toggle inspector"
              onClick={() => {
                shell.toggleInspector();
              }}
            >
              {shell.inspectorCollapsed ? (
                <PanelRightOpen className="size-4" />
              ) : (
                <PanelRightClose className="size-4" />
              )}
            </Button>
          ) : undefined}
          {start ?? (
            <AppMenu
              onOpenCommandPalette={() => {
                setCommandPaletteOpen(true);
              }}
            />
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden h-8 gap-2 md:inline-flex"
            aria-label="Open command palette"
            onClick={() => {
              setCommandPaletteOpen(true);
            }}
          >
            <CommandIcon className="size-4" />
            Commands
            <Kbd className="ml-1">{shortcutFor('K')}</Kbd>
          </Button>
          <ToolbarSeparator />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold tracking-tight">{title}</span>
              {modeLabel ? (
                <Badge variant="secondary" className="hidden sm:inline-flex">
                  {modeLabel}
                </Badge>
              ) : undefined}
            </div>
            {subtitle ? (
              <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
            ) : undefined}
          </div>
        </ToolbarSection>

        <ToolbarSection justify="center" className="hidden min-w-0 max-w-[520px] px-2 md:flex">
          {center}
        </ToolbarSection>

        <ToolbarSection justify="end" className="gap-2">
          {end}
          {theme ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label="Theme"
                >
                  {(() => {
                    if (theme.resolvedTheme === 'dark') {
                      return <MoonIcon className="size-4" />;
                    }
                    if (theme.resolvedTheme === 'light') {
                      return <SunIcon className="size-4" />;
                    }
                    return <LaptopIcon className="size-4" />;
                  })()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => {
                    theme.setTheme('system');
                  }}
                >
                  System
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    theme.setTheme('light');
                  }}
                >
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    theme.setTheme('dark');
                  }}
                >
                  Dark
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : undefined}
        </ToolbarSection>
      </Toolbar>

      {statusMessage ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {statusMessage}
        </div>
      ) : undefined}

      <AideonCommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        commands={commands}
      />
    </div>
  );
}

/**
 * Placeholder menubar for desktop shell actions.
 */
function AppMenu({ onOpenCommandPalette }: { readonly onOpenCommandPalette: () => void }) {
  const sidebar = useOptionalSidebar();
  const shell = useAideonShellControls();

  return (
    <Menubar className="border-none bg-transparent p-0 shadow-none">
      <MenubarMenu>
        <MenubarTrigger className="px-2 py-1 text-sm font-medium">App</MenubarTrigger>
        <MenubarContent>
          <MenubarItem disabled>Preferences…</MenubarItem>
          <MenubarItem disabled>Check for updates…</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger className="px-2 py-1 text-sm font-medium">View</MenubarTrigger>
        <MenubarContent>
          <MenubarItem
            onSelect={() => {
              onOpenCommandPalette();
            }}
          >
            Command palette{' '}
            <span className="ml-auto text-xs text-muted-foreground">{shortcutFor('K')}</span>
          </MenubarItem>
          <MenubarItem
            disabled={!sidebar}
            onSelect={() => {
              sidebar?.toggleSidebar();
            }}
          >
            Toggle navigation
          </MenubarItem>
          <MenubarItem
            disabled={!shell}
            onSelect={() => {
              shell?.toggleInspector();
            }}
          >
            Toggle inspector
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger className="px-2 py-1 text-sm font-medium">Help</MenubarTrigger>
        <MenubarContent>
          <MenubarItem
            onSelect={() => {
              onOpenCommandPalette();
            }}
          >
            Keyboard shortcuts…
          </MenubarItem>
          <MenubarItem disabled>About Aideon</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
