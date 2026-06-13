import type { Meta, StoryObj } from '@storybook/nextjs';
import { fn } from '@storybook/test';

import { ConfidenceLabel } from './confidence-label';
import { EmptyState } from './empty-state';
import { PartialBanner } from './partial-banner';
import { RebuildingIndicator } from './rebuilding-indicator';
import { StaleBadge } from './stale-badge';
import { WarningBanner } from './warning-banner';

// ── StaleBadge ────────────────────────────────────────────────────────────────

const staleMeta: Meta<typeof StaleBadge> = {
  title: 'Design System/Blocks/StaleBadge',
  component: StaleBadge,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Indicates data is still useful context but should not be treated as fresh truth. Driven by `ProjectionFreshnessStatus: stale` from the host (ADR-0026). The Clock icon + "Stale" label ensures colour-independence.',
      },
    },
  },
};

export { staleMeta as default };
type StaleBadgeStory = StoryObj<typeof StaleBadge>;

export const Default: StaleBadgeStory = { args: {} };

export const WithTimestamp: StaleBadgeStory = {
  args: { timestamp: '3h ago' },
  parameters: {
    docs: {
      description: {
        story: 'Pass a human-readable timestamp from the freshness metadata to show when the data was last fresh.',
      },
    },
  },
};

// ── PartialBanner ─────────────────────────────────────────────────────────────

const partialMeta: Meta<typeof PartialBanner> = {
  title: 'Design System/Blocks/PartialBanner',
  component: PartialBanner,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Warns that part of the requested result is present and the missing part matters. Use when a fanout, depth, size, or time limit caps the result — never silently truncate.',
      },
    },
  },
};

type PartialStory = StoryObj<typeof PartialBanner>;

export const PartialDefault: PartialStory = {
  name: 'Default',
  args: { message: 'Showing 50 of 1,240 nodes. Apply a scope filter to narrow results.' },
};

// ── WarningBanner ─────────────────────────────────────────────────────────────

const warningMeta: Meta<typeof WarningBanner> = {
  title: 'Design System/Blocks/WarningBanner',
  component: WarningBanner,
  tags: ['autodocs'],
};

type WarningStory = StoryObj<typeof WarningBanner>;

export const WarningDefault: WarningStory = {
  name: 'Default',
  args: { message: 'Scenario diverges from mainline after 2026-Q3.' },
};

export const WarningWithDetail: WarningStory = {
  name: 'With detail',
  args: {
    message: 'Plan values are overriding actuals.',
    detail: 'Switch the layer selector to Actual to see confirmed data.',
  },
};

// ── RebuildingIndicator ───────────────────────────────────────────────────────

const rebuildingMeta: Meta<typeof RebuildingIndicator> = {
  title: 'Design System/Blocks/RebuildingIndicator',
  component: RebuildingIndicator,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Shown when a derived result is being recomputed (indexing, projection rebuild). The spinning icon is suppressed under prefers-reduced-motion; the text label always conveys the state.',
      },
    },
  },
};

type RebuildingStory = StoryObj<typeof RebuildingIndicator>;

export const RebuildingDefault: RebuildingStory = { name: 'Default', args: {} };
export const CustomLabel: RebuildingStory = {
  name: 'Custom label',
  args: { label: 'Indexing graph…' },
};

// ── ConfidenceLabel ───────────────────────────────────────────────────────────

const confidenceMeta: Meta<typeof ConfidenceLabel> = {
  title: 'Design System/Blocks/ConfidenceLabel',
  component: ConfidenceLabel,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Ordinal confidence label for model output or computed values. Uses colour for salience but the text always carries the meaning. "Indicative" signals the value is directional only and should not be relied on for decisions.',
      },
    },
  },
};

type ConfidenceStory = StoryObj<typeof ConfidenceLabel>;

export const High: ConfidenceStory = { args: { tier: 'high' } };
export const Medium: ConfidenceStory = { args: { tier: 'medium' } };
export const Low: ConfidenceStory = { args: { tier: 'low' } };
export const Indicative: ConfidenceStory = { args: { tier: 'indicative' } };

// ── EmptyState ────────────────────────────────────────────────────────────────

const emptyMeta: Meta<typeof EmptyState> = {
  title: 'Design System/Blocks/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Empty state block for surfaces with no content. Domain meaning (title, description, action) is always caller-supplied — this block carries no domain semantics.',
      },
    },
  },
};

type EmptyStory = StoryObj<typeof EmptyState>;

export const EmptyDefault: EmptyStory = {
  name: 'Default',
  args: { title: 'No workspaces yet' },
};

export const EmptyWithDescription: EmptyStory = {
  name: 'With description',
  args: {
    title: 'No results',
    description: 'Try adjusting the scope filter or as-of date.',
  },
};

export const EmptyWithAction: EmptyStory = {
  name: 'With action',
  args: {
    title: 'No nodes match',
    description: 'Broaden the query or remove a filter.',
    action: (
      <button
        className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm"
        type="button"
      >
        Clear filters
      </button>
    ),
  },
};
