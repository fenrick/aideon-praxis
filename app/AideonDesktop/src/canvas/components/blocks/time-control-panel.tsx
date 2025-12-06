import { useMemo } from 'react';

import type { TemporalPanelActions, TemporalPanelState } from 'canvas/time/use-temporal-panel';

import {
  Panel,
  PanelContent,
  PanelDescription,
  PanelField,
  PanelHeader,
  PanelTitle,
  PanelToolbar,
} from '../../../design-system/blocks/panel';
import { Button } from '../../../design-system/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../design-system/components/ui/select';
import { Slider } from '../../../design-system/components/ui/slider';

interface TimeControlPanelProperties {
  readonly title?: string;
  readonly description?: string;
  readonly state: TemporalPanelState;
  readonly actions: TemporalPanelActions;
}

/**
 * Render the timeline controls for selecting branches and commits.
 * @param root0 - Component properties including current state and actions.
 * @param root0.title - Panel title.
 * @param root0.description - Panel helper text.
 * @param root0.state - Current temporal panel state.
 * @param root0.actions - Actions that mutate the temporal panel.
 * @returns JSX element containing branch/commit selectors and timeline slider.
 */
export function TimeControlPanel({
  title = 'Time cursor',
  description = 'Branch & commit selection for state_at snapshots.',
  state,
  actions,
}: TimeControlPanelProperties) {
  const branchOptions = useMemo(
    () => state.branches.map((branch) => branch.name),
    [state.branches],
  );

  const sliderValue = resolveSliderValue(state.commitId, state.commits);
  const sliderMax = Math.max(state.commits.length - 1, 0);

  return (
    <Panel>
      <PanelHeader className="space-y-1">
        <PanelTitle>{title}</PanelTitle>
        <PanelDescription>{description}</PanelDescription>
      </PanelHeader>
      <PanelContent>
          <PanelField label="Branch">
            <Select
              value={state.branch ?? undefined}
              disabled={state.loading || branchOptions.length === 0}
            onValueChange={(value: string) => {
              actions.selectBranch(value).catch((error: unknown) => {
                console.error('Failed to select branch', error);
              });
            }}
            >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {branchOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PanelField>
        <PanelField
          label="Commit"
          helper={<CommitSummary commits={state.commits} selectedCommitId={state.commitId} />}
        >
          <Select
            value={state.commitId ?? undefined}
            disabled={state.loading || state.commits.length === 0}
            onValueChange={(value: string) => {
              actions.selectCommit(value);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select commit" />
            </SelectTrigger>
            <SelectContent>
              {state.commits.map((commit) => (
                <SelectItem key={commit.id} value={commit.id}>
                  {commit.message}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PanelField>
        <PanelField
          label="Timeline slider"
          helper="Use ←/→ after focusing the slider to scrub commits chronologically."
        >
          <Slider
            min={0}
            max={sliderMax}
            step={1}
            value={sliderValue}
            disabled={state.loading || state.commits.length === 0}
            onValueCommit={(value: number[]) => {
              const [position] = value;
              if (typeof position !== 'number' || position < 0) {
                return;
              }
              const nextCommit = state.commits.find((_, index) => index === position);
              if (nextCommit) {
                actions.selectCommit(nextCommit.id);
              }
            }}
          />
        </PanelField>
        <SnapshotStats
          nodes={state.snapshot?.nodes}
          edges={state.snapshot?.edges}
          loading={state.snapshotLoading || state.loading}
        />
        {state.mergeConflicts && state.mergeConflicts.length > 0 && (
          <MergeConflicts conflicts={state.mergeConflicts} />
        )}
        {state.error && <p className="text-xs text-destructive">{state.error}</p>}
        <PanelToolbar>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              actions.refreshBranches().catch((error: unknown) => {
                console.error('Failed to refresh branches', error);
              });
            }}
            disabled={state.loading}
          >
            Refresh branches
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              actions.selectCommit(state.commitId);
            }}
            disabled={state.snapshotLoading || !state.commitId}
          >
            Reload snapshot
          </Button>
          {state.branch && state.branch !== 'main' ? (
            <Button
              size="sm"
              onClick={() => {
                actions.mergeIntoMain().catch((error: unknown) => {
                  console.error('Merge into main failed', error);
                });
              }}
              disabled={state.merging}
            >
              {state.merging ? 'Merging…' : 'Merge into main'}
            </Button>
          ) : undefined}
        </PanelToolbar>
      </PanelContent>
    </Panel>
  );
}

/**
 * Resolve the slider position index based on the selected commit.
 * @param commitId - Current commit identifier from state.
 * @param commits - Ordered commits for the active branch.
 * @returns Single-element array containing the slider index.
 */
function resolveSliderValue(commitId: string | undefined, commits: TemporalPanelState['commits']) {
  if (commits.length === 0) {
    return [0];
  }
  if (!commitId) {
    return [commits.length - 1];
  }
  const index = commits.findIndex((commit) => commit.id === commitId);
  return [index === -1 ? commits.length - 1 : index];
}

/**
 * Show a short summary of the selected commit or the latest commit.
 * @param root0 - Commit list and current selection.
 * @param root0.commits
 * @param root0.selectedCommitId
 * @returns JSX fragment describing the selected commit.
 */
function CommitSummary({
  commits,
  selectedCommitId,
}: {
  readonly commits: TemporalPanelState['commits'];
  readonly selectedCommitId?: string;
}) {
  if (commits.length === 0) {
    return <p className="text-xs text-muted-foreground">Load a branch to view commits.</p>;
  }
  const selectedCommit = commits.find((commit) => commit.id === selectedCommitId);
  return (
    <p className="text-xs text-muted-foreground">
      {selectedCommit ? selectedCommit.message : 'Latest commit'}
    </p>
  );
}

/**
 * Present snapshot metrics for nodes and edges.
 * @param root0 - Node/edge counts and loading flag.
 * @param root0.nodes
 * @param root0.edges
 * @param root0.loading
 * @returns Snapshot statistic tiles.
 */
function SnapshotStats({
  nodes,
  edges,
  loading,
}: {
  readonly nodes?: number;
  readonly edges?: number;
  readonly loading: boolean;
}) {
  const formattedNodes = typeof nodes === 'number' ? nodes.toLocaleString() : '—';
  const formattedEdges = typeof edges === 'number' ? edges.toLocaleString() : '—';
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Snapshot</p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <Stat label="Nodes" value={formattedNodes} loading={loading} />
        <Stat label="Edges" value={formattedEdges} loading={loading} />
      </div>
    </div>
  );
}

/**
 * Generic stat tile used within the panel.
 * @param root0 - Label/value pair with loading state.
 * @param root0.label
 * @param root0.value
 * @param root0.loading
 * @returns JSX element displaying the metric.
 */
function Stat({
  label,
  value,
  loading,
}: {
  readonly label: string;
  readonly value: string;
  readonly loading: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{loading ? '…' : value}</p>
    </div>
  );
}

/**
 * Render a list of merge conflicts returned by the host.
 * @param root0 - Conflict entries to display.
 * @param root0.conflicts
 * @returns JSX list of conflicts.
 */
function MergeConflicts({
  conflicts,
}: {
  readonly conflicts: NonNullable<TemporalPanelState['mergeConflicts']>;
}) {
  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs">
      <p className="font-semibold text-destructive">Merge conflicts</p>
      <ul className="mt-2 space-y-1">
        {conflicts.map((conflict, index) => (
          <li key={`${conflict.reference}-${index.toString()}`}>
            <span className="font-medium">{conflict.reference}</span>:{conflict.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
