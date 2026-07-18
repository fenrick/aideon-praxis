import { useTranslations } from 'next-intl';

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
import { cn } from 'design-system/lib/utilities';

import { SURFACES, type SurfaceDefinition } from './surfaces/surface-registry';
import { useActiveSurface } from './surfaces/surface-router';

interface PlatformNavigationProperties {
  readonly className?: string;
}

const PRIMARY_SURFACES = SURFACES.filter((surface) => surface.id !== 'admin');
const ADMIN_SURFACES = SURFACES.filter((surface) => surface.id === 'admin');

interface SurfaceMenuItemProperties {
  readonly surface: SurfaceDefinition;
  readonly activeSurfaceId: string;
  readonly onSelect: (surfaceId: string) => void;
}

/**
 * A single navigation rail item for a goal surface.
 * @param root0 - Component props.
 * @param root0.surface - The surface this item selects.
 * @param root0.activeSurfaceId - The currently active surface id.
 * @param root0.onSelect - Handler invoked with the surface id when clicked.
 */
function SurfaceMenuItem({ surface, activeSurfaceId, onSelect }: SurfaceMenuItemProperties) {
  const t = useTranslations();
  const Icon = surface.icon;
  const label = t(surface.labelKey);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={{ children: label, hidden: false }}
        isActive={surface.id === activeSurfaceId}
        onClick={() => {
          onSelect(surface.id);
        }}
        className="px-2.5 md:px-2"
      >
        <Icon />
        <span className="sr-only">{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/**
 * Host navigation rail (shadcn sidebar-09): a goal-destination rail. Navigation
 * is by surface, not by engine — each item routes the content area to a goal
 * surface. Administration is grouped apart at the foot of the rail. The rail
 * collapses to icons with ⌘B and becomes a drawer on small screens.
 * @param root0 - Component props.
 * @param root0.className - Optional wrapper class.
 */
export function PlatformNavigation({ className }: PlatformNavigationProperties) {
  const { activeSurfaceId, setActiveSurface } = useActiveSurface();

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
                  {PRIMARY_SURFACES.map((surface) => (
                    <SurfaceMenuItem
                      key={surface.id}
                      surface={surface}
                      activeSurfaceId={activeSurfaceId}
                      onSelect={setActiveSurface}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup className="mt-auto px-1.5">
              <SidebarGroupContent>
                <SidebarMenu>
                  {ADMIN_SURFACES.map((surface) => (
                    <SurfaceMenuItem
                      key={surface.id}
                      surface={surface}
                      activeSurfaceId={activeSurfaceId}
                      onSelect={setActiveSurface}
                    />
                  ))}
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
