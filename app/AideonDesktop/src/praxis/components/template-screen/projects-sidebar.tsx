import { useMemo, useState } from 'react';

import { Badge } from 'design-system/components/ui/badge';
import { Skeleton } from 'design-system/components/ui/skeleton';
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from 'design-system/desktop-shell';

import type { ProjectSummary } from 'praxis/domain-data';
import type { ScenarioSummary } from 'praxis/praxis-api';
import { Button } from 'design-system/components/ui/button';

interface ProjectsSidebarProperties {
  readonly projects?: ProjectSummary[];
  readonly scenarios: ScenarioSummary[];
  readonly loading: boolean;
  readonly error?: string;
  readonly activeScenarioId?: string;
  readonly onSelectScenario?: (scenarioId: string) => void;
  readonly onRetry?: () => void;
}

/**
 * Project/scenario navigation for the left sidebar.
 * Uses shadcn Sidebar primitives to align with the suite shell.
 * @param root0
 * @param root0.projects
 * @param root0.scenarios
 * @param root0.loading
 * @param root0.error
 * @param root0.activeScenarioId
 * @param root0.onSelectScenario
 * @param root0.onRetry
 */
export function ProjectsSidebar({
  projects,
  scenarios,
  loading,
  error: errorMessage,
  activeScenarioId,
  onSelectScenario,
  onRetry,
}: ProjectsSidebarProperties) {
  const projectList = useMemo(() => {
    return projects?.length ? projects : [{ id: 'default', name: 'Projects', scenarios }];
  }, [projects, scenarios]);

  const [query, setQuery] = useState('');
  const filteredProjects = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return projectList;
    }
    return projectList
      .map((project) => {
        const nextScenarios = project.scenarios.filter((scenario) => {
          const haystack = `${scenario.name} ${scenario.branch}`.toLowerCase();
          return haystack.includes(trimmed);
        });
        return { ...project, scenarios: nextScenarios };
      })
      .filter((project) => project.scenarios.length > 0);
  }, [projectList, query]);

  const scenarioCount = projectList.reduce((sum, project) => sum + project.scenarios.length, 0);

  return (
    <>
      <SidebarHeader className="p-3">
        <SidebarGroupLabel className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Scenarios
        </SidebarGroupLabel>
        <SidebarInput
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          placeholder={`Filter ${scenarioCount.toString()} scenarios…`}
          aria-label="Filter scenarios"
          className="bg-background/70"
        />
        <SidebarSeparator className="my-3" />
      </SidebarHeader>
      <SidebarContent className="p-3 pt-0">
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
                {onRetry ? (
                  <Button
                    variant="link"
                    className="px-0 text-xs"
                    onClick={() => {
                      onRetry();
                    }}
                  >
                    Retry
                  </Button>
                ) : undefined}
              </SidebarMenuItem>
            )}

            {!loading && !errorMessage && projectList.length === 0 && (
              <SidebarMenuItem>
                <SidebarMenuButton disabled className="text-left text-sm text-muted-foreground">
                  No projects yet.
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {!loading && !errorMessage && query.trim() && filteredProjects.length === 0 ? (
              <SidebarMenuItem>
                <SidebarMenuButton disabled className="text-left text-sm text-muted-foreground">
                  No scenarios match “{query.trim()}”.
                </SidebarMenuButton>
              </SidebarMenuItem>
            ) : undefined}

            {!loading && !errorMessage
              ? filteredProjects.map((project) => (
                  <SidebarGroup key={project.id} className="pb-2">
                    <SidebarGroupLabel className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {project.name}
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                      {project.scenarios.length === 0 ? (
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            disabled
                            className="text-left text-xs text-muted-foreground"
                          >
                            No scenarios yet.
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ) : (
                        project.scenarios.map((scenario) => {
                          const active = scenario.id === activeScenarioId;
                          return (
                            <SidebarMenuItem key={scenario.id}>
                              <SidebarMenuButton
                                size="sm"
                                className="flex flex-col items-start gap-1 text-left data-[state=active]:bg-primary/10 data-[state=active]:text-foreground"
                                onClick={() => onSelectScenario?.(scenario.id)}
                                data-state={active ? 'active' : undefined}
                              >
                                <div className="flex w-full items-center justify-between gap-2">
                                  <span className="text-sm font-semibold">{scenario.name}</span>
                                  {scenario.isDefault ? (
                                    <Badge variant="outline">Default</Badge>
                                  ) : undefined}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Branch {scenario.branch} · Updated{' '}
                                  {formatDate(scenario.updatedAt)}
                                </p>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })
                      )}
                    </SidebarGroupContent>
                  </SidebarGroup>
                ))
              : undefined}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </>
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
