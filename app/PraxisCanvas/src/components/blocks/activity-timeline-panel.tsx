import type { TemporalCommitSummary } from '@/praxis-api';
import { useTemporalPanel } from '@/time/use-temporal-panel';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ActivityTimelinePanelProperties {
  readonly title?: string;
  readonly description?: string;
}

export function ActivityTimelinePanel({
  title = 'Activity & diagnostics',
  description = 'Jump between timeline, diff, and canvas views when chasing events.',
}: ActivityTimelinePanelProperties) {
  const [state, actions] = useTemporalPanel();
  const commits = state.commits;
  const activeCommitId = state.commitId;

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Button
            size="sm"
            variant="secondary"
            onClick={actions.refreshBranches}
            disabled={state.loading}
          >
            Refresh timeline
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              actions.selectCommit(state.commitId ?? null);
            }}
            disabled={!state.commitId}
          >
            Reset to latest
          </Button>
        </div>
        <TimelineList
          commits={commits}
          activeCommitId={activeCommitId}
          onSelect={actions.selectCommit}
        />
      </CardContent>
    </Card>
  );
}

function TimelineList({
  commits,
  activeCommitId,
  onSelect,
}: {
  readonly commits: TemporalCommitSummary[];
  readonly activeCommitId?: string;
  readonly onSelect: (commitId: string | null) => void;
}) {
  if (commits.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No commits recorded yet for this branch.</p>
    );
  }
  return (
    <ol className="space-y-3">
      {commits.map((commit) => {
        const isActive = commit.id === activeCommitId;
        return (
          <li
            key={commit.id}
            className={`rounded-2xl border px-3 py-2 ${
              isActive ? 'border-primary/70 bg-primary/10' : 'border-border/70'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{commit.message}</p>
                <p className="text-xs text-muted-foreground">
                  {commit.time ? new Date(commit.time).toLocaleString() : 'Unknown time'} ·{' '}
                  {commit.changeCount} changes
                </p>
              </div>
              <Button
                size="sm"
                variant={isActive ? 'secondary' : 'outline'}
                onClick={() => {
                  onSelect(commit.id);
                }}
              >
                View
              </Button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
