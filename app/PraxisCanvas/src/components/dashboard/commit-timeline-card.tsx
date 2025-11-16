import { useMemo } from 'react';

import type { TemporalCommitSummary, TemporalMergeConflict } from '@/praxis-api';
import { useTemporalPanel } from '@/time/use-temporal-panel';

import { Button } from '@aideon/design-system/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@aideon/design-system/components/ui/card';

export function CommitTimelineCard() {
  const [state, actions] = useTemporalPanel();

  const commits = state.commits;
  const selectedCommitId = state.commitId;
  const hasNonMainBranch = state.branch !== undefined && state.branch !== 'main';

  const sortedBranches = useMemo(() => {
    return state.branches.toSorted((a, b) => a.name.localeCompare(b.name));
  }, [state.branches]);

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle>Commit timeline</CardTitle>
        <CardDescription>
          View branch activity and pin a commit for the current canvas snapshot.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <BranchList
          branches={sortedBranches.map((branch) => branch.name)}
          activeBranch={state.branch}
          loading={state.loading}
          onSelect={(branch) => {
            actions.selectBranch(branch);
          }}
        />
        <CommitList
          commits={commits}
          selectedCommitId={selectedCommitId}
          loading={state.loading}
          onSelectCommit={actions.selectCommit}
        />
        {state.mergeConflicts && state.mergeConflicts.length > 0 ? (
          <MergeConflicts conflicts={state.mergeConflicts} />
        ) : null}
        {state.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={actions.refreshBranches}
            disabled={state.loading}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={actions.mergeIntoMain}
            disabled={!hasNonMainBranch || state.merging}
          >
            {state.merging ? 'Merging…' : 'Merge into main'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BranchList({
  branches,
  activeBranch,
  loading,
  onSelect,
}: {
  readonly branches: string[];
  readonly activeBranch?: string;
  readonly loading: boolean;
  readonly onSelect: (branch: string) => void;
}) {
  if (branches.length === 0) {
    return <p className="text-xs text-muted-foreground">No branches available.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {branches.map((branch) => {
        const isActive = branch === activeBranch;
        return (
          <button
            key={branch}
            type="button"
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              isActive
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-border/70 text-muted-foreground hover:bg-muted/30'
            }`}
            disabled={loading}
            onClick={() => {
              onSelect(branch);
            }}
          >
            {branch}
          </button>
        );
      })}
    </div>
  );
}

function CommitList({
  commits,
  selectedCommitId,
  loading,
  onSelectCommit,
}: {
  readonly commits: TemporalCommitSummary[];
  readonly selectedCommitId?: string;
  readonly loading: boolean;
  readonly onSelectCommit: (commitId: string | null) => void;
}) {
  if (loading && commits.length === 0) {
    return <p className="text-xs text-muted-foreground">Loading commits…</p>;
  }
  if (commits.length === 0) {
    return <p className="text-xs text-muted-foreground">No commits on this branch.</p>;
  }
  return (
    <div className="max-h-64 space-y-3 overflow-auto pr-2">
      {commits.map((commit) => {
        const isSelected = commit.id === selectedCommitId;
        return (
          <button
            key={commit.id}
            type="button"
            className={`w-full rounded-2xl border px-3 py-2 text-left transition ${
              isSelected
                ? 'border-primary/60 bg-primary/10 text-primary'
                : 'border-border/70 hover:bg-muted/20'
            }`}
            onClick={() => {
              onSelectCommit(commit.id);
            }}
          >
            <p className="text-sm font-medium">{commit.message}</p>
            <p className="text-xs text-muted-foreground">
              {commit.time ? new Date(commit.time).toLocaleString() : 'Unknown time'} ·{' '}
              {commit.changeCount} changes
            </p>
          </button>
        );
      })}
    </div>
  );
}

function MergeConflicts({ conflicts }: { readonly conflicts: TemporalMergeConflict[] }) {
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
