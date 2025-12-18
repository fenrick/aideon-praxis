import { useEffect, type ComponentPropsWithoutRef, type ReactNode } from 'react';

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from 'design-system';
import { Toolbar, ToolbarSection, ToolbarSeparator } from 'design-system/blocks/toolbar';
import { Badge } from 'design-system/components/ui/badge';
import { Button } from 'design-system/components/ui/button';
import { cn } from 'design-system/lib/utilities';
import { PanelLeftIcon, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useAideonShellControls } from './shell-controls';

import { useSidebar } from 'design-system/desktop-shell';

export interface AideonToolbarProperties extends Readonly<ComponentPropsWithoutRef<'div'>> {
  readonly title: string;
  readonly subtitle?: string;
  readonly modeLabel?: string;
  readonly start?: ReactNode;
  readonly center?: ReactNode;
  readonly end?: ReactNode;
  readonly statusMessage?: string;
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
  className,
  ...properties
}: AideonToolbarProperties) {
  const sidebar = useOptionalSidebar();
  const shell = useAideonShellControls();
  const isTauri = isTauriRuntime();

  useEffect(() => {
    if (isTauri) {
      return;
    }
    const handleKeydown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 'b') {
        if (!sidebar) {
          return;
        }
        event.preventDefault();
        sidebar.toggleSidebar();
        return;
      }
      if (key === 'i') {
        if (!shell) {
          return;
        }
        event.preventDefault();
        shell.toggleInspector();
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
        });
      } catch {
        // ignore missing tauri event module (browser preview)
      }
    };

    subscribe().catch(() => {
      return;
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
          {start ?? <AppMenu />}
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
        </ToolbarSection>
      </Toolbar>

      {statusMessage ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {statusMessage}
        </div>
      ) : undefined}
    </div>
  );
}

/**
 * Placeholder menubar for desktop shell actions.
 */
function AppMenu() {
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
          <MenubarItem disabled>Keyboard shortcuts</MenubarItem>
          <MenubarItem disabled>About Aideon</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
