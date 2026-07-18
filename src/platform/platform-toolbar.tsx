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
import { Clock, Download } from 'design-system/icons';
import { useTranslations } from 'next-intl';
import type { RefCallback } from 'react';

import type { ScenarioSummary } from 'praxis/praxis-api';
import type { useTemporalPanel } from 'praxis/time/use-temporal-panel';

import { useHostPlatform } from './host-platform-context';

type TemporalState = ReturnType<typeof useTemporalPanel>[0];

/** Length of the short commit identifier shown in the time indicator. */
const SHORT_COMMIT_LENGTH = 7;

interface ToolbarControlBandProperties {
  readonly templateName?: string;
  readonly scenarios: readonly ScenarioSummary[];
  readonly scenariosLoading: boolean;
  readonly activeScenarioId?: string;
  readonly onSelectScenario: (scenarioId: string) => void;
  readonly scenarioTriggerReference: RefCallback<HTMLButtonElement>;
  readonly branch?: string;
  readonly commitId?: string;
  readonly layer: TemporalState['layer'];
  readonly timeLoading: boolean;
}

/**
 * Shorten a commit identifier for a compact, read-only time indicator.
 * @param commitId - Full commit identifier, if any.
 * @returns The leading characters of the identifier.
 */
function shortenCommit(commitId: string): string {
  return commitId.slice(0, SHORT_COMMIT_LENGTH);
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
 * Compact, read-only time indicator: the active commit (or latest) and layer.
 * @param root0 - Component props.
 * @param root0.branch - Active scenario branch, if any.
 * @param root0.commitId - Active commit id, if any.
 * @param root0.layer - Active plan/actual layer.
 * @param root0.loading - Whether the temporal cursor is still loading.
 */
function TimeIndicator({
  branch,
  commitId,
  layer,
  loading,
}: {
  readonly branch?: string;
  readonly commitId?: string;
  readonly layer: TemporalState['layer'];
  readonly loading: boolean;
}) {
  const t = useTranslations('platform.toolbar');
  const commitLabel = (() => {
    if (loading) {
      return t('timeLoading');
    }
    if (commitId) {
      return t('timeCommit', { commit: shortenCommit(commitId) });
    }
    return t('timeLatest');
  })();
  return (
    <div className="flex items-center gap-1.5" data-testid="toolbar-time-indicator">
      <span className="text-muted-foreground text-xs">{t('timeLabel')}</span>
      <Badge variant="outline" className="gap-1 font-normal">
        <Clock aria-hidden className="size-3" />
        <span className="truncate">{branch ? `${branch} · ${commitLabel}` : commitLabel}</span>
      </Badge>
      <Badge variant="secondary" className="font-normal" aria-label={t('layerLabel')}>
        {layer}
      </Badge>
    </div>
  );
}

/**
 * Presentational control band rendered as the toolbar's second row.
 * Subdued by design (density-and-calm): identity, scenario, and time are always
 * visible; search and commands stay in the primary toolbar's ⌘K palette.
 * @param root0 - Control band props sourced from the host platform context.
 * @param root0.templateName - Active template name, if any.
 * @param root0.scenarios - Available scenarios.
 * @param root0.scenariosLoading - Whether scenarios are still loading.
 * @param root0.activeScenarioId - Currently active scenario id.
 * @param root0.onSelectScenario - Scenario selection handler.
 * @param root0.scenarioTriggerReference - Ref callback for the scenario select trigger.
 * @param root0.branch - Active scenario branch, if any.
 * @param root0.commitId - Active commit id, if any.
 * @param root0.layer - Active plan/actual layer.
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
  commitId,
  layer,
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
      <ToolbarSection className="min-w-0">
        <TimeIndicator branch={branch} commitId={commitId} layer={layer} loading={timeLoading} />
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
 * second row of the Aideon toolbar; time and scenario are always visible.
 */
export function PlatformToolbar() {
  const {
    templateName,
    scenarioState,
    activeScenarioId,
    onSelectScenario,
    branchSelectReferenceCallback,
    temporalState,
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
      commitId={temporalState.commitId}
      layer={temporalState.layer}
      timeLoading={temporalState.loading}
    />
  );
}
