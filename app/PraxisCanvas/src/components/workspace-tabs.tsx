import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import type { CanvasWidget, SelectionState } from '@/canvas/types';
import { ActivityTimelinePanel } from '@/components/blocks/activity-timeline-panel';
import { CommitTimelineList } from '@/components/blocks/commit-timeline-list';
import { CanvasRuntimeCard } from '@/components/dashboard/canvas-runtime-card';
import type { TemporalPanelActions, TemporalPanelState } from '@/time/use-temporal-panel';
import { useTemporalPanel } from '@/time/use-temporal-panel';

import { Button } from '@aideon/design-system/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@aideon/design-system/components/ui/card';
import * as TabsPrimitive from '@radix-ui/react-tabs';

export type WorkspaceTabValue = 'overview' | 'timeline' | 'canvas' | 'activity';

interface WorkspaceTabsProperties {
  readonly widgets: CanvasWidget[];
  readonly selection: SelectionState;
  readonly onSelectionChange: (selection: SelectionState) => void;
  readonly onRequestMetaModelFocus: (types: string[]) => void;
  readonly value?: WorkspaceTabValue;
  readonly onValueChange?: (value: WorkspaceTabValue) => void;
}

const tabOptions: { value: WorkspaceTabValue; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'canvas', label: 'Canvas' },
  { value: 'activity', label: 'Activity' },
];

const TabRoot = TabsPrimitive.Root;
const TabList = TabsPrimitive.List;
const TabTrigger = TabsPrimitive.Trigger;
const TabContent = TabsPrimitive.Content;

export function WorkspaceTabs({
  widgets,
  selection,
  onSelectionChange,
  onRequestMetaModelFocus,
  value,
  onValueChange,
}: WorkspaceTabsProperties) {
  const [tab, setTab] = useState<WorkspaceTabValue>(value ?? 'overview');
  const [state, actions] = useTemporalPanel();

  useEffect(() => {
    if (value && value !== tab) {
      setTab(value);
    }
  }, [value, tab]);

  const handleTabChange = (nextValue: string) => {
    const next = nextValue as WorkspaceTabValue;
    setTab(next);
    onValueChange?.(next);
  };

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-background/90 p-6 shadow-inner">
      <TabRoot value={tab} onValueChange={handleTabChange} className="space-y-4">
        <TabList className="grid grid-cols-4 gap-2 rounded-lg border border-border/60 bg-muted/20 p-[3px] text-xs font-semibold">
          {tabOptions.map((entry) => (
            <TabTrigger
              key={entry.value}
              value={entry.value}
              className="relative flex h-9 items-center justify-center rounded-md border border-transparent bg-transparent px-3 text-sm font-semibold text-foreground transition hover:bg-background/90 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              {entry.label}
            </TabTrigger>
          ))}
        </TabList>
        <TabContent value="overview" className="mt-4">
          <OverviewTab state={state} />
        </TabContent>
        <TabContent value="timeline" className="mt-4">
          <TimelineTab state={state} actions={actions} />
        </TabContent>
        <TabContent value="canvas" className="mt-4">
          <CanvasRuntimeCard
            widgets={widgets}
            selection={selection}
            onSelectionChange={onSelectionChange}
            onRequestMetaModelFocus={onRequestMetaModelFocus}
          />
        </TabContent>
        <TabContent value="activity" className="mt-4">
          <ActivityTab />
        </TabContent>
      </TabRoot>
    </div>
  );
}

interface OverviewTabProperties {
  readonly state: TemporalPanelState;
}

function OverviewTab({ state }: OverviewTabProperties) {
  if (state.loading && !state.snapshot) {
    return (
      <div className="rounded-2xl border border-border/70 p-6 text-sm text-muted-foreground">
        Loading snapshot…
      </div>
    );
  }

  const snapshot = state.snapshot;
  const metrics = state.diff?.metrics;
  const overviewStats = [
    { label: 'Nodes', value: snapshot?.nodes },
    { label: 'Edges', value: snapshot?.edges },
    {
      label: 'Confidence',
      value:
        typeof snapshot?.confidence === 'number'
          ? `${Math.round(snapshot.confidence * 100).toString()}%`
          : 'Not set',
    },
    { label: 'Scenario', value: snapshot?.scenario ?? 'Production' },
  ];

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle>Snapshot overview</CardTitle>
        <CardDescription>
          {state.branch ? `Branch · ${state.branch.toUpperCase()}` : 'Temporal branches pending.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {overviewStats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {stat.label}
              </p>
              <p className="text-2xl font-semibold">{stat.value ?? '—'}</p>
            </div>
          ))}
        </div>
        <div className="space-y-3 text-sm">
          <p className="font-semibold">Diff metrics</p>
          {metrics ? (
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                {
                  label: 'Nodes',
                  details: `+${metrics.nodeAdds.toLocaleString()} / Δ${metrics.nodeMods.toLocaleString()} / -${metrics.nodeDels.toLocaleString()}`,
                },
                {
                  label: 'Edges',
                  details: `+${metrics.edgeAdds.toLocaleString()} / Δ${metrics.edgeMods.toLocaleString()} / -${metrics.edgeDels.toLocaleString()}`,
                },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-border/70 bg-muted/10 p-3"
                >
                  <p className="text-2xs text-muted-foreground">{metric.label}</p>
                  <p className="text-xs font-semibold">{metric.details}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Diff metrics pending snapshot comparison.
            </p>
          )}
        </div>
        {state.mergeConflicts && state.mergeConflicts.length > 0 ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-xs">
            <p className="text-destructive font-semibold">Merge conflicts detected</p>
            <ul className="mt-2 space-y-2">
              {state.mergeConflicts.map((conflict) => (
                <li key={conflict.reference}>
                  <strong>{conflict.kind}</strong> · {conflict.reference}
                  <p className="text-destructive/80">{conflict.message}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {state.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
      </CardContent>
    </Card>
  );
}

interface TimelineTabProperties {
  readonly state: TemporalPanelState;
  readonly actions: TemporalPanelActions;
}

function TimelineTab({ state, actions }: TimelineTabProperties) {
  const hasCommits = state.commits.length > 0;
  let content: ReactNode;

  if (state.loading) {
    content = <p className="text-sm text-muted-foreground">Loading commits…</p>;
  } else if (hasCommits) {
    content = (
      <CommitTimelineList
        commits={state.commits}
        activeCommitId={state.commitId}
        onSelect={actions.selectCommit}
      />
    );
  } else {
    content = (
      <p className="text-xs text-muted-foreground">No commits recorded yet for this branch.</p>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>Commit timeline</CardTitle>
          <CardDescription>Select a commit to pivot the workspace.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Button size="sm" variant="secondary" onClick={actions.refreshBranches}>
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
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}

function ActivityTab() {
  return <ActivityTimelinePanel />;
}
