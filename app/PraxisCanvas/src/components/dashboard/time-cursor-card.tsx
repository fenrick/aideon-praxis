import { useMemo, type ReactNode } from 'react';

import { useTemporalPanel } from '@/time/use-temporal-panel';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function TimeCursorCard() {
  const [state, actions] = useTemporalPanel();

  const branchOptions = useMemo(
    () => state.branches.map((branch) => branch.name),
    [state.branches],
  );
  const commitOptions = state.commits;

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle>Time cursor</CardTitle>
        <CardDescription>Branch & commit selection for state_at snapshots.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <Field label="Branch">
          <Select
            value={state.branch ?? undefined}
            disabled={state.loading || branchOptions.length === 0}
            onValueChange={(value) => {
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
            disabled={state.loading || commitOptions.length === 0}
            onValueChange={(value) => {
              actions.selectCommit(value);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select commit" />
            </SelectTrigger>
            <SelectContent>
              {commitOptions.map((commit) => (
                <SelectItem key={commit.id} value={commit.id}>
                  {commit.message}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {commitOptions.length === 0
              ? 'Load a branch to view commits.'
              : (commitOptions.find((commit) => commit.id === state.commitId)?.message ??
                'Latest commit')}
          </p>
        </Field>
        <SnapshotStats
          nodes={state.snapshot?.nodes}
          edges={state.snapshot?.edges}
          loading={state.snapshotLoading || state.loading}
        />
        {state.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={actions.refreshBranches}
            disabled={state.loading}
          >
            Refresh branches
          </Button>
          <Button
            size="sm"
            onClick={() => {
              actions.selectCommit(state.commitId ?? null);
            }}
            disabled={state.snapshotLoading || !state.commitId}
          >
            Reload snapshot
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
      {children}
    </div>
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
