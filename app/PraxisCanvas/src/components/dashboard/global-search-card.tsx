import { useMemo, useState } from 'react';

import type { TemporalCommitSummary } from '@/praxis-api';
import { useTemporalPanel } from '@/time/use-temporal-panel';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function GlobalSearchCard() {
  const [state, actions] = useTemporalPanel();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) {
      return [];
    }
    const lower = query.trim().toLowerCase();
    return state.commits.filter((commit) => {
      return (
        commit.message.toLowerCase().includes(lower) ||
        commit.branch.toLowerCase().includes(lower) ||
        commit.tags.some((tag) => tag.toLowerCase().includes(lower))
      );
    });
  }, [query, state.commits]);

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle>Command search</CardTitle>
        <CardDescription>Jump to commits or switch branches from one place.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Input
          placeholder="Search commits, branches, tags"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
        {renderResults({
          query,
          results,
          loading: state.loading,
          onSelectCommit: actions.selectCommit,
          onSelectBranch: actions.selectBranch,
        })}
      </CardContent>
    </Card>
  );
}

function renderResults(parameters: {
  readonly query: string;
  readonly results: TemporalCommitSummary[];
  readonly loading: boolean;
  readonly onSelectCommit: (commitId: string | null) => void;
  readonly onSelectBranch: (branch: string) => void;
}) {
  const { query, results, loading, onSelectBranch, onSelectCommit } = parameters;
  if (!query.trim()) {
    return <p className="text-xs text-muted-foreground">Start typing to search commits.</p>;
  }
  if (loading) {
    return <p className="text-xs text-muted-foreground">Searching twin data…</p>;
  }
  if (results.length === 0) {
    return <p className="text-xs text-muted-foreground">No matches found.</p>;
  }
  return (
    <div className="space-y-2">
      {results.slice(0, 5).map((commit) => (
        <SearchResult
          key={commit.id}
          commit={commit}
          onSelectCommit={onSelectCommit}
          onSelectBranch={onSelectBranch}
        />
      ))}
    </div>
  );
}

function SearchResult({
  commit,
  onSelectCommit,
  onSelectBranch,
}: {
  readonly commit: TemporalCommitSummary;
  readonly onSelectCommit: (commitId: string | null) => void;
  readonly onSelectBranch: (branch: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border/70 p-3">
      <p className="text-sm font-medium">{commit.message}</p>
      <p className="text-xs text-muted-foreground">
        {commit.branch} · {commit.tags.map((tag) => `#${tag}`).join(' ') || 'No tags'}
      </p>
      <div className="mt-2 flex gap-2">
        <Button
          variant="muted"
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
