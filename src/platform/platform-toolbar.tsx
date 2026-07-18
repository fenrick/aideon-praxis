import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Toolbar,
  ToolbarSection,
  ToolbarSeparator,
} from 'design-system';
import { Clock, Download, GitCommitHorizontal, Layers } from 'design-system/icons';
import { useTranslations } from 'next-intl';
import type { RefCallback } from 'react';

import type { Layer } from 'dtos';
import type { ScenarioSummary, TemporalCommitSummary } from 'praxis/praxis-api';
import type { useTemporalPanel } from 'praxis/time/use-temporal-panel';

import { useHostPlatform } from './host-platform-context';

type TemporalState = ReturnType<typeof useTemporalPanel>[0];

/** Length of the short commit identifier shown in the time control. */
const SHORT_COMMIT_LENGTH = 7;

/** The plan/actual layers a viewer can slice the model by. */
const LAYERS: readonly Layer[] = ['Plan', 'Actual'];

interface ToolbarControlBandProperties {
  readonly templateName?: string;
  readonly scenarios: readonly ScenarioSummary[];
  readonly scenariosLoading: boolean;
  readonly activeScenarioId?: string;
  readonly onSelectScenario: (scenarioId: string) => void;
  readonly scenarioTriggerReference: RefCallback<HTMLButtonElement>;
  readonly branch?: string;
  readonly commits: readonly TemporalCommitSummary[];
  readonly commitId?: string;
  readonly onSelectCommit: (commitId: string) => void;
  readonly layer: TemporalState['layer'];
  readonly onSelectLayer: (layer: Layer) => void;
  readonly timeLoading: boolean;
}

/**
 * Shorten a commit identifier for a compact time control label.
 * @param commitId - Full commit identifier, if any.
 * @returns The leading characters of the identifier.
 */
function shortenCommit(commitId: string): string {
  return commitId.slice(0, SHORT_COMMIT_LENGTH);
}

/**
 * Narrow a raw select value to a valid plan/actual layer without assertions.
 * @param value - The value emitted by the layer select.
 * @returns The matching {@link Layer}, defaulting to `Plan`.
 */
function toLayer(value: string): Layer {
  return value === 'Actual' ? 'Actual' : 'Plan';
}

/**
 * Workspace identity chip: the active template name or a neutral fallback.
 * @param root0 - Component props.
 * @param root0.templateName - Active template name, if any.
 */
function WorkspaceIdentity({ templateName }: { readonly templateName?: string }) {
  const t = useTranslations('platform.toolbar');
  return (
    <span className="truncate text-sm font-medium" data-testid="toolbar-workspace-identity">
      {templateName ?? t('workspaceFallback')}
    </span>
  );
}

/**
 * Always-visible scenario selector bound to the host scenario collection.
 * @param root0 - Component props.
 * @param root0.scenarios - Available scenarios.
 * @param root0.loading - Whether scenarios are still loading.
 * @param root0.activeScenarioId - Currently active scenario id.
 * @param root0.onSelectScenario - Scenario selection handler.
 * @param root0.triggerReference - Ref callback for the select trigger.
 */
function ScenarioControl({
  scenarios,
  loading,
  activeScenarioId,
  onSelectScenario,
  triggerReference,
}: {
  readonly scenarios: readonly ScenarioSummary[];
  readonly loading: boolean;
  readonly activeScenarioId?: string;
  readonly onSelectScenario: (scenarioId: string) => void;
  readonly triggerReference: RefCallback<HTMLButtonElement>;
}) {
  const t = useTranslations('platform.toolbar');
  const placeholder = loading ? t('scenarioLoading') : t('scenarioPlaceholder');
  const disabled = !loading && scenarios.length === 0;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground text-xs">{t('scenarioLabel')}</span>
      <Select value={activeScenarioId ?? ''} onValueChange={onSelectScenario} disabled={disabled}>
        <SelectTrigger
          ref={triggerReference}
          size="sm"
          aria-label={t('scenarioLabel')}
          data-testid="toolbar-scenario-select"
        >
          <SelectValue placeholder={disabled ? t('scenarioEmpty') : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {scenarios.map((scenario) => (
            <SelectItem key={scenario.id} value={scenario.id}>
              {scenario.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Interactive valid-time control: picks the commit the current view is read at.
 * Latest is the newest commit; picking an earlier one reads the model as of that
 * moment. Disabled while loading or when the active timeline has no commits.
 * @param root0 - Component props.
 * @param root0.branch - Active scenario branch, if any.
 * @param root0.commits - Commits available on the active timeline, oldest first.
 * @param root0.commitId - Active commit id, if any.
 * @param root0.loading - Whether the temporal cursor is still loading.
 * @param root0.onSelectCommit - Handler that moves the valid-time cursor.
 */
function TimeControl({
  branch,
  commits,
  commitId,
  loading,
  onSelectCommit,
}: {
  readonly branch?: string;
  readonly commits: readonly TemporalCommitSummary[];
  readonly commitId?: string;
  readonly loading: boolean;
  readonly onSelectCommit: (commitId: string) => void;
}) {
  const t = useTranslations('platform.toolbar');
  const latestId = commits.at(-1)?.id;
  const disabled = loading || commits.length === 0;
  const placeholder = loading ? t('timeLoading') : t('timeLatest');
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="text-muted-foreground text-xs">{t('timeLabel')}</span>
      {branch ? (
        <span className="text-muted-foreground truncate text-xs">{branch}</span>
      ) : undefined}
      <Select value={commitId ?? ''} onValueChange={onSelectCommit} disabled={disabled}>
        <SelectTrigger size="sm" aria-label={t('timeLabel')} data-testid="toolbar-time-select">
          <Clock aria-hidden className="size-3" />
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {commits.toReversed().map((commit) => (
            <SelectItem key={commit.id} value={commit.id}>
              <GitCommitHorizontal aria-hidden className="size-3" />
              {commit.id === latestId
                ? t('timeLatest')
                : t('timeCommit', { commit: shortenCommit(commit.id) })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Interactive layer control: slices the view by the plan or actual layer.
 * @param root0 - Component props.
 * @param root0.layer - Active plan/actual layer.
 * @param root0.onSelectLayer - Handler that switches the active layer.
 * @param root0.disabled - Whether the control is inert (e.g. while loading).
 */
function LayerControl({
  layer,
  onSelectLayer,
  disabled,
}: {
  readonly layer: Layer;
  readonly onSelectLayer: (layer: Layer) => void;
  readonly disabled: boolean;
}) {
  const t = useTranslations('platform.toolbar');
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground text-xs">{t('layerLabel')}</span>
      <Select
        value={layer}
        onValueChange={(value) => {
          onSelectLayer(toLayer(value));
        }}
        disabled={disabled}
      >
        <SelectTrigger size="sm" aria-label={t('layerLabel')} data-testid="toolbar-layer-select">
          <Layers aria-hidden className="size-3" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LAYERS.map((value) => (
            <SelectItem key={value} value={value}>
              {value === 'Actual' ? t('layerActual') : t('layerPlan')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Subdued placeholder for the viewpoint dimensions the host does not yet expose
 * (asserted time and scope). Rendered as inert badges so the always-visible
 * viewpoint stays honest about what is — and is not — adjustable today.
 */
function ViewpointPlaceholders() {
  const t = useTranslations('platform.toolbar');
  const hint = t('viewpointPlaceholderHint');
  return (
    <div
      className="flex items-center gap-1.5"
      data-testid="toolbar-viewpoint-placeholders"
      title={hint}
    >
      <Badge variant="outline" className="text-muted-foreground gap-1 font-normal" aria-disabled>
        {t('assertedLabel')}
        <span className="opacity-70">{t('assertedNow')}</span>
      </Badge>
      <Badge variant="outline" className="text-muted-foreground gap-1 font-normal" aria-disabled>
        {t('scopeLabel')}
        <span className="opacity-70">{t('scopeAll')}</span>
      </Badge>
    </div>
  );
}

/**
 * Presentational control band rendered as the toolbar's second row. Subdued by
 * design (density-and-calm): identity, scenario, valid time, and layer are the
 * always-visible viewpoint controls; asserted time and scope are placeholdered
 * until the host exposes them.
 * @param root0 - Control band props sourced from the host platform context.
 * @param root0.templateName - Active template name, if any.
 * @param root0.scenarios - Available scenarios.
 * @param root0.scenariosLoading - Whether scenarios are still loading.
 * @param root0.activeScenarioId - Currently active scenario id.
 * @param root0.onSelectScenario - Scenario selection handler.
 * @param root0.scenarioTriggerReference - Ref callback for the scenario select trigger.
 * @param root0.branch - Active scenario branch, if any.
 * @param root0.commits - Commits on the active timeline, oldest first.
 * @param root0.commitId - Active commit id, if any.
 * @param root0.onSelectCommit - Handler that moves the valid-time cursor.
 * @param root0.layer - Active plan/actual layer.
 * @param root0.onSelectLayer - Handler that switches the active layer.
 * @param root0.timeLoading - Whether the temporal cursor is still loading.
 */
export function ToolbarControlBand({
  templateName,
  scenarios,
  scenariosLoading,
  activeScenarioId,
  onSelectScenario,
  scenarioTriggerReference,
  branch,
  commits,
  commitId,
  onSelectCommit,
  layer,
  onSelectLayer,
  timeLoading,
}: ToolbarControlBandProperties) {
  const t = useTranslations('platform.toolbar');
  return (
    <Toolbar className="text-muted-foreground min-h-9">
      <ToolbarSection className="min-w-0 flex-none">
        <WorkspaceIdentity templateName={templateName} />
      </ToolbarSection>
      <ToolbarSeparator />
      <ToolbarSection className="flex-none">
        <ScenarioControl
          scenarios={scenarios}
          loading={scenariosLoading}
          activeScenarioId={activeScenarioId}
          onSelectScenario={onSelectScenario}
          triggerReference={scenarioTriggerReference}
        />
      </ToolbarSection>
      <ToolbarSeparator />
      <ToolbarSection className="min-w-0 flex-none gap-2">
        <TimeControl
          branch={branch}
          commits={commits}
          commitId={commitId}
          loading={timeLoading}
          onSelectCommit={onSelectCommit}
        />
        <LayerControl layer={layer} onSelectLayer={onSelectLayer} disabled={timeLoading} />
      </ToolbarSection>
      <ToolbarSeparator />
      <ToolbarSection className="min-w-0">
        <ViewpointPlaceholders />
      </ToolbarSection>
      <ToolbarSection justify="end" className="flex-none gap-2">
        <span className="text-muted-foreground text-xs" data-testid="toolbar-status">
          {t('statusReady')}
        </span>
        <Button type="button" variant="ghost" size="sm" disabled>
          <Download aria-hidden className="size-4" />
          {t('export')}
        </Button>
      </ToolbarSection>
    </Toolbar>
  );
}

/**
 * Toolbar control band bound to the host platform context. Rendered as the
 * second row of the Aideon toolbar; scenario, time, and layer are always visible
 * and interactive, driving the shared temporal viewpoint.
 */
export function PlatformToolbar() {
  const {
    templateName,
    scenarioState,
    activeScenarioId,
    onSelectScenario,
    branchSelectReferenceCallback,
    temporalState,
    temporalActions,
  } = useHostPlatform();
  return (
    <ToolbarControlBand
      templateName={templateName}
      scenarios={scenarioState.data}
      scenariosLoading={scenarioState.loading}
      activeScenarioId={activeScenarioId}
      onSelectScenario={onSelectScenario}
      scenarioTriggerReference={branchSelectReferenceCallback}
      branch={temporalState.branch}
      commits={temporalState.commits}
      commitId={temporalState.commitId}
      onSelectCommit={temporalActions.selectCommit}
      layer={temporalState.layer}
      onSelectLayer={temporalActions.selectLayer}
      timeLoading={temporalState.loading}
    />
  );
}
