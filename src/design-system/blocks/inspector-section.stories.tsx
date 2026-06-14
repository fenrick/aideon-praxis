import type { Meta } from '@storybook/nextjs-vite';

import { ExplanationSurface } from './explanation-surface';
import { InspectorSection, InspectorSectionGroup } from './inspector-section';
import { PropertyList } from './property-list';
import { ProvenancePanel } from './provenance-panel';

const meta = {
  component: InspectorSection,
  tags: ['autodocs'],
} satisfies Meta<typeof InspectorSection>;

export default meta;

export const WithSections = {
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
            Derived from the last three months of utilisation telemetry.
          </ExplanationSurface>
        </InspectorSection>
      </InspectorSectionGroup>
    </div>
  ),
};
