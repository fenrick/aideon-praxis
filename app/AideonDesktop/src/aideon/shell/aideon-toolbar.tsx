import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from 'design-system';
import { Toolbar, ToolbarSection, ToolbarSeparator } from 'design-system/blocks/toolbar';
import { Badge } from 'design-system/components/ui/badge';
import { cn } from 'design-system/lib/utilities';

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
  return (
    <div className={cn('flex flex-col gap-2', className)} {...properties}>
      <Toolbar className="h-12 w-full rounded-2xl px-3 py-2">
        <ToolbarSection className="min-w-0 gap-2">
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
          <MenubarItem disabled>Toggle left sidebar</MenubarItem>
          <MenubarItem disabled>Toggle inspector</MenubarItem>
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
