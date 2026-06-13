import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DiffMarker } from 'design-system/blocks/diff-marker';
import { ExplanationSurface } from 'design-system/blocks/explanation-surface';
import { InspectorPanel } from 'design-system/blocks/inspector-panel';
import {
  InspectorSection,
  InspectorSectionGroup,
} from 'design-system/blocks/inspector-section';
import { PropertyList, PropertyRow } from 'design-system/blocks/property-list';
import { ProvenancePanel } from 'design-system/blocks/provenance-panel';

afterEach(() => {
  cleanup();
});

describe('InspectorPanel', () => {
  it('renders title and children', () => {
    render(<InspectorPanel title="Properties">content here</InspectorPanel>);
    expect(screen.getByText('Properties')).toBeInTheDocument();
    expect(screen.getByText('content here')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <InspectorPanel description="Select an item" title="Properties">
        body
      </InspectorPanel>,
    );
    expect(screen.getByText('Select an item')).toBeInTheDocument();
  });

  it('renders badge slot', () => {
    render(
      <InspectorPanel badge={<span>Node</span>} title="Properties">
        body
      </InspectorPanel>,
    );
    expect(screen.getByText('Node')).toBeInTheDocument();
  });

  it('renders footer slot', () => {
    render(
      <InspectorPanel footer={<button type="button">Save</button>} title="Properties">
        body
      </InspectorPanel>,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});

describe('InspectorSection', () => {
  it('renders label', () => {
    render(
      <InspectorSectionGroup>
        <InspectorSection label="Details" value="details">
          content
        </InspectorSection>
      </InspectorSectionGroup>,
    );
    expect(screen.getByText('Details')).toBeInTheDocument();
  });
});

describe('PropertyRow', () => {
  it('renders label and value', () => {
    render(<PropertyRow label="Status">active</PropertyRow>);
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });
});

describe('PropertyList', () => {
  it('renders all items', () => {
    render(
      <PropertyList
        items={[
          { key: 'name', label: 'Name', value: 'Alice' },
          { key: 'type', label: 'Type', value: 'Person' },
        ]}
      />,
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Person')).toBeInTheDocument();
  });
});

describe('ExplanationSurface', () => {
  it('renders children', () => {
    render(<ExplanationSurface>Why this matters</ExplanationSurface>);
    expect(screen.getByText('Why this matters')).toBeInTheDocument();
  });

  it('renders heading when provided', () => {
    render(<ExplanationSurface heading="Rationale">Because of X</ExplanationSurface>);
    expect(screen.getByText('Rationale')).toBeInTheDocument();
  });
});

describe('ProvenancePanel', () => {
  it('renders provenance badge', () => {
    render(<ProvenancePanel classification="inferred" />);
    expect(screen.getByText('Inferred')).toBeInTheDocument();
  });

  it('renders source when provided', () => {
    render(<ProvenancePanel classification="asserted" source="Manual entry" />);
    expect(screen.getByText('Manual entry')).toBeInTheDocument();
  });
});

describe('DiffMarker', () => {
  it('renders Added label', () => {
    render(<DiffMarker operation="added" />);
    expect(screen.getByText('Added')).toBeInTheDocument();
  });

  it('renders all operations without crashing', () => {
    const ops = ['added', 'changed', 'removed', 'unchanged'] as const;
    for (const op of ops) {
      const { unmount } = render(<DiffMarker operation={op} />);
      unmount();
    }
  });

  it('hides label when showLabel=false, exposes via aria-label', () => {
    render(<DiffMarker operation="removed" showLabel={false} />);
    expect(screen.queryByText('Removed')).toBeNull();
    expect(screen.getByLabelText('Removed')).toBeInTheDocument();
  });
});
