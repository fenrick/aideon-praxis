import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ScrollArea,
  Skeleton,
} from 'design-system';
import { AlertTriangle, GitBranch, Layers, Star } from 'design-system/icons';
import { useTranslations } from 'next-intl';

import type { ScenarioSummary } from 'praxis/praxis-api';

import { useHostPlatform } from '../host-platform-context';

/** Number of skeleton rows shown while scenarios load. */
const SKELETON_ROW_COUNT = 3;

/**
 * A single selectable scenario row: name, branch, and default marker. The active
 * scenario is highlighted; the whole row is a button so selection is one click.
 * @param root0 - Component props.
 * @param root0.scenario - The scenario summary to render.
 * @param root0.active - Whether this scenario is the active viewpoint.
 * @param root0.onSelect - Handler invoked with the scenario id on selection.
 */
function ScenarioRow({
  scenario,
  active,
  onSelect,
}: {
  readonly scenario: ScenarioSummary;
  readonly active: boolean;
  readonly onSelect: (scenarioId: string) => void;
}) {
  const t = useTranslations('surfaces.scenarioStudio');
  return (
    <button
      type="button"
      onClick={() => {
        onSelect(scenario.id);
      }}
      aria-pressed={active}
      aria-label={t('selectLabel', { name: scenario.name })}
      data-testid="scenario-studio-row"
      data-active={active ? 'true' : 'false'}
      className={
        active
          ? 'border-ring/60 bg-accent/40 flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors'
          : 'border-border/60 hover:bg-accent/30 flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors'
      }
    >
      <Layers aria-hidden className="text-muted-foreground size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{scenario.name}</span>
          {scenario.isDefault ? (
            <Badge variant="secondary" className="gap-1 font-normal">
              <Star aria-hidden className="size-3" />
              {t('defaultBadge')}
            </Badge>
          ) : undefined}
        </span>
        <span className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
          <GitBranch aria-hidden className="size-3" />
          <span className="truncate">{scenario.branch}</span>
        </span>
      </span>
      {active ? (
        <Badge variant="outline" className="font-normal" data-testid="scenario-studio-active">
          {t('activeBadge')}
        </Badge>
      ) : undefined}
    </button>
  );
}

/**
 * The scenario list body, switching between loading, error, empty, and populated
 * treatments driven entirely by the host scenario state.
 * @param root0 - Component props.
 * @param root0.loading - Whether scenarios are still loading.
 * @param root0.error - Load error message, if any.
 * @param root0.scenarios - Loaded scenarios.
 * @param root0.activeScenarioId - Currently active scenario id.
 * @param root0.onSelect - Scenario selection handler.
 */
function ScenarioList({
  loading,
  error,
  scenarios,
  activeScenarioId,
  onSelect,
}: {
  readonly loading: boolean;
  readonly error?: string;
  readonly scenarios: readonly ScenarioSummary[];
  readonly activeScenarioId?: string;
  readonly onSelect: (scenarioId: string) => void;
}) {
  const t = useTranslations('surfaces.scenarioStudio');
  if (loading) {
    return (
      <div className="flex flex-col gap-2" data-testid="scenario-studio-loading">
        {Array.from({ length: SKELETON_ROW_COUNT }, (_value, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-2xl" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <Alert variant="destructive" data-testid="scenario-studio-error">
        <AlertTriangle aria-hidden />
        <AlertTitle>{t('error')}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (scenarios.length === 0) {
    return (
      <div data-testid="scenario-studio-empty">
        <EmptyState title={t('empty')} description={t('emptyDescription')} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2" data-testid="scenario-studio-list">
      {scenarios.map((scenario) => (
        <ScenarioRow
          key={scenario.id}
          scenario={scenario}
          active={scenario.id === activeScenarioId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

interface ScenarioStudioViewProperties {
  readonly loading: boolean;
  readonly error?: string;
  readonly scenarios: readonly ScenarioSummary[];
  readonly activeScenarioId?: string;
  readonly onSelect: (scenarioId: string) => void;
}

/**
 * Presentational scenario studio: a dense card holding the selectable scenario
 * list on a subdued surface. State is supplied by the caller so the view is
 * trivially testable and story-friendly (golden pattern).
 * @param root0 - Component props.
 * @param root0.loading - Whether scenarios are still loading.
 * @param root0.error - Load error message, if any.
 * @param root0.scenarios - Loaded scenarios.
 * @param root0.activeScenarioId - Currently active scenario id.
 * @param root0.onSelect - Scenario selection handler.
 */
export function ScenarioStudioView({
  loading,
  error,
  scenarios,
  activeScenarioId,
  onSelect,
}: ScenarioStudioViewProperties) {
  const t = useTranslations('surfaces.scenarioStudio');
  return (
    <ScrollArea className="bg-muted/20 h-full">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ScenarioList
              loading={loading}
              error={error}
              scenarios={scenarios}
              activeScenarioId={activeScenarioId}
              onSelect={onSelect}
            />
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

/**
 * Scenario studio surface (bounded composition): binds the presentational view
 * to the host scenario state. Selecting a scenario switches the shared viewpoint
 * that every surface reads through.
 */
export function ScenarioStudioSurface() {
  const { scenarioState, activeScenarioId, onSelectScenario } = useHostPlatform();
  return (
    <ScenarioStudioView
      loading={scenarioState.loading}
      error={scenarioState.error}
      scenarios={scenarioState.data}
      activeScenarioId={activeScenarioId}
      onSelect={onSelectScenario}
    />
  );
}
