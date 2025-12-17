import type { ReactNode, RefObject } from 'react';

import { ActivityTimelinePanel } from 'canvas/components/blocks/activity-timeline-panel';
import { CommitTimelineList } from 'canvas/components/blocks/commit-timeline-list';
import { CanvasRuntimeCard } from 'canvas/components/dashboard/canvas-runtime-card';
import { templateScreenCopy } from 'canvas/copy/template-screen';
import type { TemporalPanelActions, TemporalPanelState } from 'canvas/time/use-temporal-panel';
import type { CanvasWidget, SelectionState } from 'canvas/types';

import { Tabs, TabsContent, TabsList, TabsTrigger } from 'design-system/components/ui/tabs';
import { SnapshotOverviewCard } from './snapshot-overview-card';
import { TimeCursorCard } from './time-cursor-card';

interface OverviewTabsProperties {
  readonly state: TemporalPanelState;
  readonly actions: TemporalPanelActions;
  readonly widgets: CanvasWidget[];
  readonly selection: SelectionState;
  readonly onSelectionChange: (selection: SelectionState) => void;
  readonly onRequestMetaModelFocus: (types: string[]) => void;
  readonly timelineContent?: ReactNode;
  readonly activityContent?: ReactNode;
  readonly initialTab?: 'overview' | 'timeline' | 'activity';
  readonly reloadSignal?: number;
  readonly branchTriggerRef?: RefObject<HTMLButtonElement | null>;
}

/**
 * Tabs for Overview | Timeline | Activity within the Scenario workspace.
 * @param root0
 * @param root0.state
 * @param root0.actions
 * @param root0.widgets
 * @param root0.selection
 * @param root0.onSelectionChange
 * @param root0.onRequestMetaModelFocus
 * @param root0.timelineContent
 * @param root0.activityContent
 * @param root0.initialTab
 * @param root0.reloadSignal
 * @param root0.branchTriggerRef
 */
export function OverviewTabs({
  state,
  actions,
  widgets,
  selection,
  onSelectionChange,
  onRequestMetaModelFocus,
  timelineContent,
  activityContent,
  initialTab = 'overview',
  reloadSignal,
  branchTriggerRef,
}: OverviewTabsProperties) {
  const copy = templateScreenCopy.tabs;

  return (
    <Tabs defaultValue={initialTab} className="space-y-6">
      <TabsList className="grid grid-cols-3 gap-2 rounded-lg border border-border/70 bg-muted/40 p-1">
        <TabsTrigger value="overview">{copy.overview}</TabsTrigger>
        <TabsTrigger value="timeline">{copy.timeline}</TabsTrigger>
        <TabsTrigger value="activity">{copy.activity}</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <SnapshotOverviewCard state={state} />
          <TimeCursorCard state={state} actions={actions} triggerRef={branchTriggerRef} />
        </div>
        <CanvasRuntimeCard
          widgets={widgets}
          selection={selection}
          onSelectionChange={onSelectionChange}
          onRequestMetaModelFocus={onRequestMetaModelFocus}
          reloadSignal={reloadSignal}
        />
      </TabsContent>

      <TabsContent value="timeline">
        {timelineContent ?? (
          <CommitTimelineList
            commits={state.commits}
            activeCommitId={state.commitId}
            onSelect={actions.selectCommit}
          />
        )}
      </TabsContent>

      <TabsContent value="activity">{activityContent ?? <ActivityTimelinePanel />}</TabsContent>
    </Tabs>
  );
}
