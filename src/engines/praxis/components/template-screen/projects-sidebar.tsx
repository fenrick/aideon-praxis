import { useMemo, useState } from 'react';

import { Badge, Button, Skeleton } from 'design-system';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from 'design-system/desktop-shell';
import type { ProjectSummary } from 'praxis/domain-data';
import type { ScenarioSummary } from 'praxis/praxis-api';

/**
 * Render menu items for a single project and its scenarios.
 * @param parameters - Render parameters.
 * @param parameters.project - Project whose scenarios to render.
 * @param parameters.activeScenarioId - Currently active scenario id.
 * @param parameters.onSelectScenario - Selection handler.
 */
function renderProjectScenarioMenuItems(parameters: {
  project: ProjectSummary;
  activeScenarioId?: string;
  onSelectScenario?: (scenarioId: string) => void;
}) {
  const { project, activeScenarioId, onSelectScenario } = parameters;
  const headerId = `project-${project.id}`;

  const header = (
    <SidebarMenuItem key={headerId}>
      <SidebarMenuButton disabled className="text-muted-foreground text-left text-xs font-semibold">
        {project.name}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  if (project.scenarios.length === 0) {
    return [
      header,
      <SidebarMenuItem key={`${project.id}-empty`}>
        <SidebarMenuButton disabled className="text-muted-foreground text-left text-xs">
          No scenarios yet.
        </SidebarMenuButton>
      </SidebarMenuItem>,
    ];
  }

  return [
    header,
    ...project.scenarios.map((scenario) => {
      const active = scenario.id === activeScenarioId;
      return (
        <SidebarMenuItem key={scenario.id}>
          <SidebarMenuButton
            size="sm"
            className="data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-accent-foreground flex h-auto flex-col items-start gap-1 py-2 text-left whitespace-normal"
            onClick={() => {
              onSelectScenario?.(scenario.id);
            }}
            data-state={active ? 'active' : undefined}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-sm font-medium">{scenario.name}</span>
              {scenario.isDefault ? <Badge variant="outline">Base case</Badge> : undefined}
            </div>
            <p className="text-muted-foreground text-xs">
              {scenario.branch} · Updated {formatDate(scenario.updatedAt)}
            </p>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    }),
  ];
}

/**
 * Render the scenario list area within the sidebar menu, covering loading,
 * error, empty, and no-match states.
 * @param parameters - Render parameters.
 * @param parameters.loading - Whether scenarios are loading.
 * @param parameters.errorMessage - Error message, if any.
 * @param parameters.projectList - All projects.
 * @param parameters.filteredProjects - Projects after the active filter.
 * @param parameters.query - Current filter query.
 * @param parameters.activeScenarioId - Currently active scenario id.
 * @param parameters.onSelectScenario - Selection handler.
 * @param parameters.onRetry - Retry handler for the error state.
 */
function renderProjectsSidebarMenu(parameters: {
  loading: boolean;
  errorMessage?: string;
  projectList: ProjectSummary[];
  filteredProjects: ProjectSummary[];
  query: string;
  activeScenarioId?: string;
  onSelectScenario?: (scenarioId: string) => void;
  onRetry?: () => void;
}) {
  const {
    loading,
    errorMessage,
    projectList,
    filteredProjects,
    query,
    activeScenarioId,
    onSelectScenario,
    onRetry,
  } = parameters;

  if (loading) {
    return (
      <div className="space-y-2 p-1">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-28" />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          disabled
          className="text-destructive hover:text-destructive text-left text-xs"
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
    );
  }

  if (projectList.length === 0) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton disabled className="text-muted-foreground text-left text-sm">
          No projects yet.
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  if (query.trim() && filteredProjects.length === 0) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton disabled className="text-muted-foreground text-left text-sm">
          No scenarios match “{query.trim()}”.
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <>
      {filteredProjects.flatMap((project) =>
        renderProjectScenarioMenuItems({ project, activeScenarioId, onSelectScenario }),
      )}
    </>
  );
}

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
 * Scenario navigation for the Praxis workspace. Reads as product structure: the
 * scenarios the twin can be resolved against, grouped by project, filterable,
 * with the active scenario obvious. The workspace icon rail (module switching)
 * is provided by the shell, so this rail carries no chrome of its own.
 *
 * Artefact-family and pinned/recent navigation will join here once Praxis
 * artefacts exist; until then this rail shows only real scenario data.
 * @param root0 - Component props.
 * @param root0.projects - Projects with their scenarios.
 * @param root0.scenarios - Flat scenario list used when no projects are given.
 * @param root0.loading - Whether scenarios are loading.
 * @param root0.error - Error message, if loading failed.
 * @param root0.activeScenarioId - Currently active scenario id.
 * @param root0.onSelectScenario - Selection handler.
 * @param root0.onRetry - Retry handler for the error state.
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
    <Sidebar collapsible="none" className="bg-sidebar hidden flex-1 overflow-hidden md:flex">
      <SidebarHeader className="gap-3 border-b p-4">
        <div className="flex w-full items-center justify-between">
          <div className="text-foreground text-base font-medium">Scenarios</div>
          <Badge variant="secondary" className="text-xs">
            {scenarioCount.toString()}
          </Badge>
        </div>
        <SidebarInput
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          placeholder="Filter scenarios…"
          aria-label="Filter scenarios"
          className="bg-background"
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs tracking-[0.16em] uppercase">
            Projects
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderProjectsSidebarMenu({
                loading,
                errorMessage,
                projectList,
                filteredProjects,
                query,
                activeScenarioId,
                onSelectScenario,
                onRetry,
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

/**
 * Format an ISO date for the scenario meta line.
 * @param value - ISO date string.
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
