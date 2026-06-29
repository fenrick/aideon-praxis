import { type Ref } from 'react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'design-system';
import { Clock, GitBranch, Layers } from 'design-system/icons';
import { cn } from 'design-system/lib/utilities';
import type { Layer } from 'dtos';
import type { TemporalPanelActions, TemporalPanelState } from 'praxis/time/use-temporal-panel';

const LAYERS: readonly Layer[] = ['Plan', 'Actual'];

export interface ViewpointBarProperties {
  readonly state: TemporalPanelState;
  readonly actions: TemporalPanelActions;
  /** Ref to the scenario trigger, focused by the workspace shortcut. */
  readonly scenarioTriggerRef?: Ref<HTMLButtonElement>;
  readonly className?: string;
}

/**
 * The viewpoint bar: an always-visible control band exposing the three
 * coordinates every result resolves at — scenario, as-of moment, and layer.
 * Per the shell contract these controls are never collapsible; changing one
 * re-executes the active view rather than silently mutating it.
 * @param root0 - Component props.
 * @param root0.state - Current temporal panel state.
 * @param root0.actions - Temporal panel actions.
 * @param root0.scenarioTriggerRef - Ref to the scenario trigger button.
 * @param root0.className - Optional wrapper class.
 */
export function ViewpointBar({
  state,
  actions,
  scenarioTriggerRef,
  className,
}: ViewpointBarProperties) {
  const scenarioOptions = state.branches.map((branch) => branch.name);
  const hasScenarios = scenarioOptions.length > 0;
  const hasCommits = state.commits.length > 0;
  const latestCommitId = state.commits.at(-1)?.id;
  const selectedCommit =
    state.commits.find((commit) => commit.id === state.commitId) ?? state.commits.at(-1);
  const atLatest = !state.commitId || state.commitId === latestCommitId;
  const freshnessLabel = resolveFreshnessLabel(hasCommits, atLatest, selectedCommit?.time);

  return (
    <div
      role="toolbar"
      aria-label="Viewpoint"
      className={cn(
        'border-border/60 inline-flex h-8 items-center rounded-md border px-1',
        className,
      )}
    >
      <Coordinate icon={<GitBranch />} label="Scenario">
        <Select
          value={hasScenarios ? state.branch : ''}
          disabled={state.loading || !hasScenarios}
          onValueChange={(value) => {
            void actions.selectBranch(value);
          }}
        >
          <CoordinateTrigger
            ref={scenarioTriggerRef}
            ariaLabel="Scenario"
            placeholder="No scenario"
          />
          <SelectContent>
            {scenarioOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Coordinate>

      <Divider />

      <Coordinate icon={<Clock />} label="As of">
        <Select
          value={hasCommits ? (state.commitId ?? latestCommitId ?? '') : ''}
          disabled={state.loading || !hasCommits}
          onValueChange={(value) => {
            actions.selectCommit(value);
          }}
        >
          <CoordinateTrigger ariaLabel="As-of moment" placeholder="Latest" />
          <SelectContent>
            {state.commits.map((commit) => (
              <SelectItem key={commit.id} value={commit.id}>
                {commit.message}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {freshnessLabel ? (
          <span className="text-muted-foreground text-[11px] font-medium">{freshnessLabel}</span>
        ) : undefined}
      </Coordinate>

      <Divider />

      <Coordinate icon={<Layers />} label="Layer">
        <Select
          value={state.layer}
          onValueChange={(value) => {
            actions.selectLayer(value as Layer);
          }}
        >
          <CoordinateTrigger ariaLabel="Layer" placeholder="Plan" />
          <SelectContent>
            {LAYERS.map((layer) => (
              <SelectItem key={layer} value={layer}>
                {layer}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Coordinate>
    </div>
  );
}

/**
 * One viewpoint coordinate: an icon, an eyebrow label, and its control.
 * @param root0 - Component props.
 * @param root0.icon - Coordinate icon.
 * @param root0.label - Eyebrow label.
 * @param root0.children - The control (a Select).
 */
function Coordinate({
  icon,
  label,
  children,
}: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2">
      <span className="text-muted-foreground [&_svg]:size-3.5">{icon}</span>
      <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

/**
 * A ghost Select trigger sized to sit inline within the viewpoint bar.
 * @param root0 - Component props.
 * @param root0.ariaLabel - Accessible label for the trigger.
 * @param root0.placeholder - Placeholder shown when no value is selected.
 * @param root0.ref - Forwarded trigger ref.
 */
function CoordinateTrigger({
  ariaLabel,
  placeholder,
  ref,
}: {
  readonly ariaLabel: string;
  readonly placeholder: string;
  readonly ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <SelectTrigger
      ref={ref}
      size="sm"
      aria-label={ariaLabel}
      className="text-foreground data-[state=open]:bg-foreground/5 h-7 max-w-[160px] border-0 bg-transparent px-1.5 font-medium shadow-none focus-visible:ring-0"
    >
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
  );
}

/**
 * Thin vertical divider between coordinates.
 */
function Divider() {
  return <span aria-hidden className="bg-border/60 h-5 w-px shrink-0" />;
}

/**
 * Resolve the freshness hint shown beside the as-of control.
 * @param hasCommits - Whether the active scenario has any commits.
 * @param atLatest - Whether the as-of moment is the latest commit.
 * @param time - ISO timestamp of the selected commit, if known.
 */
function resolveFreshnessLabel(
  hasCommits: boolean,
  atLatest: boolean,
  time: string | undefined,
): string | undefined {
  if (!hasCommits) {
    return undefined;
  }
  if (atLatest) {
    return 'Latest';
  }
  return time ? formatRelativeTime(time) : undefined;
}

/**
 * Format an ISO timestamp as a compact relative time (e.g. "3m ago").
 * @param iso - ISO timestamp.
 */
function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return '';
  }
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) {
    return 'just now';
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${String(minutes)}m ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${String(hours)}h ago`;
  }
  const days = Math.round(hours / 24);
  return `${String(days)}d ago`;
}
