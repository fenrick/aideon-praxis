import type { ComponentType } from 'react';

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
import type { EngineId } from './engine';
import { ENGINES } from './engines';
import { useLicensing } from './licensing';

const ENGINE_ICONS: Partial<Record<EngineId, ComponentType<{ className?: string }>>> = {
  praxis: LayoutGrid,
  metis: Brain,
  mneme: Database,
};

interface PlatformNavigationProperties {
  readonly className?: string;
}

/**
 * Host navigation rail (shadcn sidebar-09): a licensed-engine presence rail plus
 * the scenarios panel. The engine rail is a passive indicator — engines are
 * functional/licensed, not surfaces to switch between — so the whole rail
 * collapses to icons with ⌘B and becomes a drawer on small screens.
 * @param root0 - Component props.
 * @param root0.className - Optional wrapper class.
 */
export function PlatformNavigation({ className }: PlatformNavigationProperties) {
  const { licensed } = useLicensing();
  const engines = ENGINES.filter((engine) => licensed(engine.id));

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
                  {engines.map((engine) => {
                    const Icon = ENGINE_ICONS[engine.id] ?? LayoutGrid;
                    return (
                      <SidebarMenuItem key={engine.id}>
                        <SidebarMenuButton
                          tooltip={{ children: engine.label, hidden: false }}
                          isActive={engine.id === 'praxis'}
                          className="px-2.5 md:px-2"
                        >
                          <Icon />
                          <span className="sr-only">{engine.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarContent />
      </Sidebar>
    </TooltipProvider>
  );
}
