import type { Meta, StoryObj } from '@storybook/nextjs';
import { fn } from '@storybook/test';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ConfidenceLabel } from './confidence-label';
import { DiffMarker } from './diff-marker';
import { ExplanationSurface } from './explanation-surface';
import { InspectorPanel } from './inspector-panel';
import { InspectorSection, InspectorSectionGroup } from './inspector-section';
import { PropertyList, PropertyRow } from './property-list';
import { ProvenanceBadge } from './provenance-badge';
import { ProvenancePanel } from './provenance-panel';

// ── InspectorPanel ────────────────────────────────────────────────────────────

const inspectorMeta: Meta<typeof InspectorPanel> = {
  title: 'Design System/Blocks/InspectorPanel',
  component: InspectorPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Container for the right-hand inspector pane. Supplies title, optional badge, scrollable body, and footer slot. Domain meaning (what the title says, what the badge labels, what the content shows) is caller-supplied.',
      },
    },
  },
};

export { inspectorMeta as default };
type InspectorStory = StoryObj<typeof InspectorPanel>;

export const Default: InspectorStory = {
  args: {
    title: 'Properties',
    description: 'Select an item to inspect its properties.',
    children: <p className="text-muted-foreground text-sm">Nothing selected.</p>,
  },
};

export const WithBadge: InspectorStory = {
  args: {
    title: 'Properties',
    badge: <Badge variant="secondary" className="text-[0.6rem] uppercase tracking-widest">Node</Badge>,
    description: 'Edit node fields.',
    children: (
      <PropertyList
        items={[
          { key: 'name', label: 'Name', value: 'Capability A' },
          { key: 'type', label: 'Type', value: 'Capability' },
          { key: 'status', label: 'Status', value: 'Active' },
        ]}
      />
    ),
  },
};

export const WithFooter: InspectorStory = {
  args: {
    title: 'Properties',
    description: 'Edit and save node fields.',
    footer: (
      <div className="flex gap-2 border-t p-4">
        <Button size="sm">Save changes</Button>
        <Button size="sm" variant="outline">Reset</Button>
      </div>
    ),
    children: (
      <PropertyList
        items={[
          { key: 'name', label: 'Name', value: 'Capability A' },
        ]}
      />
    ),
  },
};

// ── InspectorSection ──────────────────────────────────────────────────────────

const sectionMeta: Meta = {
  title: 'Design System/Blocks/InspectorSection',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Collapsible section group for inspector panes. Use InspectorSectionGroup as the container and InspectorSection for each collapsible region.',
      },
    },
  },
};

type SectionStory = StoryObj;

export const SectionDefault: SectionStory = {
  name: 'With sections',
  render: () => (
    <div className="w-72">
      <InspectorSectionGroup defaultValue="details">
        <InspectorSection label="Details" value="details">
          <PropertyList
            items={[
              { key: 'name', label: 'Name', value: 'Server A' },
              { key: 'type', label: 'Type', value: 'Infrastructure' },
            ]}
          />
        </InspectorSection>
        <InspectorSection label="Provenance" value="provenance">
          <ProvenancePanel classification="inferred" source="Twin engine v2.1" />
        </InspectorSection>
        <InspectorSection label="Explanation" value="explanation">
          <ExplanationSurface heading="Why this value">
            Derived from the last three months of utilisation telemetry. Confidence: high.
          </ExplanationSurface>
        </InspectorSection>
      </InspectorSectionGroup>
    </div>
  ),
};

// ── PropertyList ──────────────────────────────────────────────────────────────

export const PropertyListDefault: StoryObj = {
  name: 'PropertyList',
  render: () => (
    <div className="w-64">
      <PropertyList
        items={[
          {
            key: 'name',
            label: 'Name',
            value: 'Capability A',
            badge: <ProvenanceBadge classification="asserted" />,
          },
          {
            key: 'confidence',
            label: 'Confidence',
            value: <ConfidenceLabel tier="high" />,
          },
          { key: 'owner', label: 'Owner', value: 'Platform team' },
        ]}
      />
    </div>
  ),
};

// ── DiffMarker ────────────────────────────────────────────────────────────────

export const DiffMarkers: StoryObj = {
  name: 'DiffMarker — all operations',
  render: () => (
    <div className="flex flex-col gap-2">
      {(['added', 'changed', 'removed', 'unchanged'] as const).map((op) => (
        <div className="flex items-center gap-4" key={op}>
          <DiffMarker operation={op} />
          <span className="text-muted-foreground text-xs">
            {op === 'added' && 'New node in the target plateau'}
            {op === 'changed' && 'Property value differs between plateaus'}
            {op === 'removed' && 'Node absent in the target plateau'}
            {op === 'unchanged' && 'Identical in both plateaus'}
          </span>
        </div>
      ))}
    </div>
  ),
};
