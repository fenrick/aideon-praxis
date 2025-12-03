import type { TemporalCommitSummary } from 'canvas/praxis-api';
import { Button } from '../../../design-system/components/ui/button';

interface CommitTimelineListProperties {
  readonly commits: TemporalCommitSummary[];
  readonly activeCommitId?: string;
  readonly onSelect: (commitId: string | null) => void;
}

export function CommitTimelineList({
  commits,
  activeCommitId,
  onSelect,
}: CommitTimelineListProperties) {
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
