import { useMemo, type ReactNode } from 'react';

import type { TemporalCommitSummary } from '@/praxis-api';
import { useTemporalPanel } from '@/time/use-temporal-panel';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ActivityFeedCard() {
  const [state, actions] = useTemporalPanel();

  const entries = useMemo(() => {
    const withTime = state.commits.filter((commit) => Boolean(commit.time));
    const withoutTime = state.commits.filter((commit) => !commit.time);
    const sorted = [...withTime].toSorted((a, b) => {
      return new Date(b.time ?? '').getTime() - new Date(a.time ?? '').getTime();
    });
    return [...sorted, ...withoutTime].slice(0, 8);
  }, [state.commits]);

  let content: ReactNode;
  if (state.loading && entries.length === 0) {
    content = <p className="text-xs text-muted-foreground">Loading activity…</p>;
  } else if (entries.length === 0) {
    content = <p className="text-xs text-muted-foreground">No activity on this branch yet.</p>;
  } else {
    content = entries.map((commit) => (
      <FeedEntry
        key={commit.id}
        commit={commit}
        onInspect={(commitId) => {
          actions.selectCommit(commitId);
        }}
      />
    ));
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle>Activity feed</CardTitle>
        <CardDescription>Recent branch events and commit metadata from the twin.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">{content}</CardContent>
    </Card>
  );
}

function FeedEntry({
  commit,
  onInspect,
}: {
  readonly commit: TemporalCommitSummary;
  readonly onInspect: (commitId: string) => void;
}) {
  const timestamp = commit.time ? new Date(commit.time).toLocaleString() : 'Unknown time';
  return (
    <div className="rounded-2xl border border-border/70 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{commit.message}</p>
          <p className="text-xs text-muted-foreground">
            {commit.author ? `${commit.author} · ` : ''}
            {timestamp}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onInspect(commit.id);
          }}
        >
          Inspect
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge label={commit.branch} />
        <Badge label={`${commit.changeCount.toString()} changes`} variant="muted" />
        {commit.tags.map((tag) => (
          <Badge key={tag} label={`#${tag}`} variant="ghost" />
        ))}
      </div>
    </div>
  );
}

function Badge({
  label,
  variant,
}: {
  readonly label: string;
  readonly variant?: 'muted' | 'ghost';
}) {
  const base = 'rounded-full border px-2 py-0.5 text-[0.7rem] font-medium';
  const styles =
    variant === 'ghost'
      ? 'border-transparent bg-muted/30 text-muted-foreground'
      : 'border-border/70 text-muted-foreground';
  return <span className={`${base} ${styles}`}>{label}</span>;
}
