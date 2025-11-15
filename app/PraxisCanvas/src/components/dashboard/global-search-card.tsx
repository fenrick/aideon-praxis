import { useEffect, useMemo, useState } from 'react';

import type { TemporalCommitSummary } from '@/praxis-api';
import { useTemporalPanel } from '@/time/use-temporal-panel';

import { TemporalCommandMenu } from '@/components/blocks/temporal-command-menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function GlobalSearchCard() {
  const [state, actions] = useTemporalPanel();
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    return () => {
      globalThis.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const recentCommits = useMemo(() => {
    return state.commits.toSorted((left, right) => {
      const leftTime = left.time ? Date.parse(left.time) : 0;
      const rightTime = right.time ? Date.parse(right.time) : 0;
      return rightTime - leftTime;
    });
  }, [state.commits]);

  return (
    <>
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Command palette</CardTitle>
          <CardDescription>
            Use ⌘K / Ctrl+K to switch branches, jump to commits, or run actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              onClick={() => {
                setCommandOpen(true);
              }}
            >
              Open command palette
            </Button>
            <ShortcutHint keys={['⌘', 'K']} />
            <ShortcutHint keys={['Ctrl', 'K']} />
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Recent commits</p>
          {recentCommits.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No recent commits available. Start by creating a branch.
            </p>
          ) : (
            <div className="space-y-2">
              {recentCommits.slice(0, 4).map((commit) => (
                <CommitPreview
                  key={commit.id}
                  commit={commit}
                  onSelectBranch={actions.selectBranch}
                  onSelectCommit={actions.selectCommit}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <TemporalCommandMenu
        open={commandOpen}
        onOpenChange={setCommandOpen}
        branches={state.branches}
        activeBranch={state.branch}
        commits={state.commits}
        loading={state.loading}
        onSelectBranch={actions.selectBranch}
        onSelectCommit={(commitId) => {
          actions.selectCommit(commitId);
        }}
        onRefreshBranches={actions.refreshBranches}
      />
    </>
  );
}

function ShortcutHint({ keys }: { readonly keys: string[] }) {
  return (
    <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      {keys.map((key) => (
        <kbd
          key={key}
          className="rounded border border-border/70 bg-muted/50 px-1 py-0.5 font-medium"
        >
          {key}
        </kbd>
      ))}
    </div>
  );
}

function CommitPreview({
  commit,
  onSelectBranch,
  onSelectCommit,
}: {
  readonly commit: TemporalCommitSummary;
  readonly onSelectBranch: (branch: string) => void;
  readonly onSelectCommit: (commitId: string | null) => void;
}) {
  return (
    <div className="rounded-2xl border border-border/70 p-3">
      <p className="text-sm font-semibold">{commit.message}</p>
      <p className="text-xs text-muted-foreground">
        {commit.branch} · {commit.tags.map((tag) => `#${tag}`).join(' ') || 'No tags'}
      </p>
      <div className="mt-2 flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onSelectBranch(commit.branch);
          }}
        >
          Switch branch
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onSelectCommit(commit.id);
          }}
        >
          Jump to commit
        </Button>
      </div>
    </div>
  );
}
