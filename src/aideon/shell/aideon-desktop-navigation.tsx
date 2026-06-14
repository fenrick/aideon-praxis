import type { ComponentType, ReactNode } from 'react';

import { TooltipProvider } from 'design-system';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from 'design-system/desktop-shell';
import { Brain, Database, LayoutGrid } from 'design-system/icons';
import { cn } from 'design-system/lib/utilities';
import type { WorkspaceNavigationProperties } from 'workspaces/types';

export interface AideonDesktopNavigationProperties extends Readonly<WorkspaceNavigationProperties> {
  readonly children: ReactNode;
  readonly className?: string;
}

const WORKSPACE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  praxis: LayoutGrid,
  metis: Brain,
  mneme: Database,
};

/**
 * Host navigation rail built on the nested-sidebar pattern (shadcn sidebar-09):
 * a fixed module icon rail plus a contextual workspace panel, composed as one
 * `collapsible="icon"` Sidebar so ⌘B collapses to icons and the whole rail
 * becomes a drawer on small screens.
 * @param root0 - Component props.
 * @param root0.activeWorkspaceId - Active workspace id.
 * @param root0.workspaceOptions - Available workspaces.
 * @param root0.onWorkspaceSelect - Workspace selection handler.
 * @param root0.children - Contextual workspace panel (e.g. the scenarios sidebar).
 * @param root0.className - Optional wrapper class.
 */
export function AideonDesktopNavigation({
  activeWorkspaceId,
  workspaceOptions,
  onWorkspaceSelect,
  children,
  className,
}: AideonDesktopNavigationProperties) {
  return (
    <TooltipProvider>
      <Sidebar
        collapsible="icon"
        className={cn('overflow-hidden *:data-[sidebar=sidebar]:flex-row', className)}
      >
        <Sidebar collapsible="none" className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r">
          <SidebarHeader className="items-center p-2">
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 items-center justify-center rounded-lg text-sm font-semibold">
              A
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup className="px-1.5">
              <SidebarGroupContent>
                <SidebarMenu>
                  {workspaceOptions.map((workspace) => {
                    const Icon = WORKSPACE_ICONS[workspace.id] ?? LayoutGrid;
                    return (
                      <SidebarMenuItem key={workspace.id}>
                        <SidebarMenuButton
                          tooltip={{
                            children: workspace.disabled
                              ? `${workspace.label} (Coming soon)`
                              : workspace.label,
                            hidden: false,
                          }}
                          isActive={workspace.id === activeWorkspaceId}
                          disabled={workspace.disabled}
                          className="px-2.5 md:px-2"
                          onClick={() => {
                            onWorkspaceSelect(workspace.id);
                          }}
                        >
                          <Icon />
                          <span className="sr-only">{workspace.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        {children}
      </Sidebar>
    </TooltipProvider>
  );
}
