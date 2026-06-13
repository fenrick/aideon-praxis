import type { Meta, StoryObj } from '@storybook/nextjs';
import { fn } from '@storybook/test';

import { ArtefactFrame } from './artefact-frame';
import { WidgetFrame } from './widget-frame';
import { DashboardGrid } from './dashboard-grid';
import { FilterBar } from './filter-bar';

// ── ArtefactFrame ─────────────────────────────────────────────────────────────

const meta: Meta<typeof ArtefactFrame> = {
  title: 'Design System/Blocks/ArtefactFrame',
  component: ArtefactFrame,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Base shell for all artefact forms (view, catalogue, matrix, map, report, page). Provides loading, empty, and error shells as built-in states — no per-surface re-implementation needed. Pass `state` to switch between them; the `ready` state renders children.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ArtefactFrame>;

export const Ready: Story = {
  args: {
    state: 'ready',
    children: <div className="rounded-lg border p-8 text-center text-sm">Content renders here</div>,
  },
};

export const Loading: Story = {
  args: { state: 'loading', loadingRows: 4 },
  parameters: {
    docs: {
      description: {
        story: 'Skeleton rows proportional to expected content shape. No spinner-only default.',
      },
    },
  },
};

export const Empty: Story = {
  args: {
    state: 'empty',
    emptyTitle: 'No results',
    emptyDescription: 'Try adjusting the scope filter or as-of date.',
  },
};

export const Error: Story = {
  args: {
    state: 'error',
    errorMessage: 'Failed to load catalogue data.',
    onRetry: fn(),
  },
};

// ── WidgetFrame ───────────────────────────────────────────────────────────────

const widgetMeta: Meta<typeof WidgetFrame> = {
  title: 'Design System/Blocks/WidgetFrame',
  component: WidgetFrame,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Dashboard widget frame. Composes ArtefactFrame inside a Card with header, status slot, actions slot, and optional drag handle for composition mode.',
      },
    },
  },
};

type WidgetStory = StoryObj<typeof WidgetFrame>;

export const WidgetReady: WidgetStory = {
  name: 'Ready',
  args: {
    title: 'Revenue trend',
    state: 'ready',
    children: <div className="flex h-32 items-center justify-center text-sm text-gray-400">Chart area</div>,
  },
};

export const WidgetLoading: WidgetStory = {
  name: 'Loading',
  args: { title: 'Revenue trend', state: 'loading' },
};

export const WidgetDraggable: WidgetStory = {
  name: 'Draggable (edit mode)',
  args: {
    title: 'Revenue trend',
    draggable: true,
    state: 'ready',
    children: <div className="flex h-32 items-center justify-center text-sm text-gray-400">Chart area</div>,
  },
  parameters: {
    docs: {
      description: {
        story: 'Show the drag handle when the dashboard is in edit/composition mode. Hide it in view mode.',
      },
    },
  },
};

// ── DashboardGrid ─────────────────────────────────────────────────────────────

export const Grid: StoryObj = {
  name: 'DashboardGrid — 2 columns',
  render: () => (
    <DashboardGrid columns={2}>
      <WidgetFrame title="Metric A" state="ready">
        <div className="h-24" />
      </WidgetFrame>
      <WidgetFrame title="Metric B" state="loading" />
      <WidgetFrame title="Metric C" state="empty" emptyTitle="No data" />
      <WidgetFrame title="Metric D" state="error" errorMessage="Fetch failed" />
    </DashboardGrid>
  ),
};

// ── FilterBar ─────────────────────────────────────────────────────────────────

export const FilterBarStory: StoryObj = {
  name: 'FilterBar',
  render: () => (
    <div className="w-96">
      <FilterBar placeholder="Filter nodes…" />
    </div>
  ),
};
