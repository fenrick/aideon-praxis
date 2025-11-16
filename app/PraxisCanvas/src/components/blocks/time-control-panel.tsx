import { useMemo, type ReactNode } from 'react';

import type { TemporalPanelActions, TemporalPanelState } from '@/time/use-temporal-panel';

import { Button } from '@aideon/design-system/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@aideon/design-system/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@aideon/design-system/ui/select';
import { Slider } from '@aideon/design-system/ui/slider';

interface TimeControlPanelProperties {
  readonly title?: string;
  readonly description?: string;
  readonly state: TemporalPanelState;
  readonly actions: TemporalPanelActions;
}

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
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <Field label="Branch">
          <Select
            value={state.branch ?? undefined}
            disabled={state.loading || branchOptions.length === 0}
            onValueChange={(value: string) => {
              actions.selectBranch(value);
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
        </Field>
        <Field label="Commit">
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
          <CommitSummary commits={state.commits} selectedCommitId={state.commitId} />
        </Field>
        <Field label="Timeline slider">
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
          <p className="text-xs text-muted-foreground">
            Use ←/→ after focusing the slider to scrub commits chronologically.
          </p>
        </Field>
        <SnapshotStats
          nodes={state.snapshot?.nodes}
          edges={state.snapshot?.edges}
          loading={state.snapshotLoading || state.loading}
        />
        {state.mergeConflicts && state.mergeConflicts.length > 0 ? (
          <MergeConflicts conflicts={state.mergeConflicts} />
        ) : null}
        {state.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={actions.refreshBranches}
            disabled={state.loading}
          >
            Refresh branches
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              actions.selectCommit(state.commitId ?? null);
            }}
            disabled={state.snapshotLoading || !state.commitId}
          >
            Reload snapshot
          </Button>
          {state.branch && state.branch !== 'main' ? (
            <Button size="sm" onClick={actions.mergeIntoMain} disabled={state.merging}>
              {state.merging ? 'Merging…' : 'Merge into main'}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

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

function Field({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

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
            <span className="font-medium">{conflict.reference}</span>: {conflict.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
