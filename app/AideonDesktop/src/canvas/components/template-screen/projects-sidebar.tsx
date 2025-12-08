import { Badge } from 'design-system/components/ui/badge';
import { Skeleton } from 'design-system/components/ui/skeleton';
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from 'design-system/desktop-shell';

import type { ScenarioSummary } from 'canvas/praxis-api';

interface ProjectsSidebarProperties {
  readonly scenarios: ScenarioSummary[];
  readonly loading: boolean;
  readonly error?: string;
  readonly activeScenarioId?: string;
  readonly onSelectScenario?: (scenarioId: string) => void;
}

/**
 * Project/scenario navigation for the left sidebar.
 * Uses shadcn Sidebar primitives to align with the suite shell.
 * @param root0
 * @param root0.scenarios
 * @param root0.loading
 * @param root0.error
 * @param root0.activeScenarioId
 * @param root0.onSelectScenario
 */
export function ProjectsSidebar({
  scenarios,
  loading,
  error: errorMessage,
  activeScenarioId,
  onSelectScenario,
}: ProjectsSidebarProperties) {
  return (
    <SidebarContent className="p-3">
      <SidebarGroup>
        <SidebarGroupLabel>Projects</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {loading && (
              <div className="space-y-2 p-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
              </div>
            )}

            {!loading && errorMessage && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  disabled
                  className="text-left text-xs text-destructive hover:text-destructive"
                >
                  Failed to load scenarios: {errorMessage}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {!loading &&
              !errorMessage &&
              scenarios.map((scenario) => {
                const active = scenario.id === activeScenarioId;
                return (
                  <SidebarMenuItem key={scenario.id}>
                    <SidebarMenuButton
                      size="sm"
                      className="flex flex-col items-start gap-1 text-left"
                      onClick={() => onSelectScenario?.(scenario.id)}
                      data-state={active ? 'active' : undefined}
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{scenario.name}</span>
                        {scenario.isDefault ? <Badge variant="outline">Default</Badge> : undefined}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Branch {scenario.branch} · Updated {formatDate(scenario.updatedAt)}
                      </p>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

            {!loading && !errorMessage && scenarios.length === 0 && (
              <SidebarMenuItem>
                <SidebarMenuButton disabled className="text-left text-sm text-muted-foreground">
                  No scenarios available yet.
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}

/**
 *
 * @param value
 */
function formatDate(value: string | undefined): string {
  if (!value) {
    return 'recently';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString();
}
