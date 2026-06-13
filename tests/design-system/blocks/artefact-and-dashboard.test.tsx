import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArtefactFrame } from 'design-system/blocks/artefact-frame';
import { DashboardGrid } from 'design-system/blocks/dashboard-grid';
import { FilterBar } from 'design-system/blocks/filter-bar';
import { WidgetFrame } from 'design-system/blocks/widget-frame';

afterEach(() => {
  cleanup();
});

describe('ArtefactFrame', () => {
  it('renders children in ready state', () => {
    render(<ArtefactFrame state="ready">Content here</ArtefactFrame>);
    expect(screen.getByText('Content here')).toBeInTheDocument();
  });

  it('renders skeleton rows in loading state', () => {
    render(<ArtefactFrame loadingRows={3} state="loading" />);
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('renders error message in error state', () => {
    render(<ArtefactFrame errorMessage="Failed to load data" state="error" />);
    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('calls onRetry in error state', () => {
    const onRetry = vi.fn();
    render(<ArtefactFrame onRetry={onRetry} state="error" />);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('renders empty state with title', () => {
    render(<ArtefactFrame emptyTitle="No records found" state="empty" />);
    expect(screen.getByText('No records found')).toBeInTheDocument();
  });

  it('defaults to ready state', () => {
    render(<ArtefactFrame>Default content</ArtefactFrame>);
    expect(screen.getByText('Default content')).toBeInTheDocument();
  });
});

describe('WidgetFrame', () => {
  it('renders title', () => {
    render(<WidgetFrame title="Revenue trend">chart</WidgetFrame>);
    expect(screen.getByText('Revenue trend')).toBeInTheDocument();
  });

  it('renders status slot', () => {
    render(<WidgetFrame statusSlot={<span>Updated</span>} title="Metric" />);
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<WidgetFrame state="loading" title="Chart" />);
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(<WidgetFrame errorMessage="Chart failed" state="error" title="Chart" />);
    expect(screen.getByText('Chart failed')).toBeInTheDocument();
  });
});

describe('DashboardGrid', () => {
  it('renders children', () => {
    render(
      <DashboardGrid>
        <div>widget 1</div>
        <div>widget 2</div>
      </DashboardGrid>,
    );
    expect(screen.getByText('widget 1')).toBeInTheDocument();
    expect(screen.getByText('widget 2')).toBeInTheDocument();
  });
});

describe('FilterBar', () => {
  it('renders placeholder', () => {
    render(<FilterBar placeholder="Search items…" />);
    expect(screen.getByPlaceholderText('Search items…')).toBeInTheDocument();
  });

  it('calls onValueChange when input changes', () => {
    const onChange = vi.fn();
    render(<FilterBar onValueChange={onChange} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalledWith('hello');
  });

  it('renders actions slot', () => {
    render(
      <FilterBar actionsSlot={<button type="button">Add filter</button>} />,
    );
    expect(screen.getByRole('button', { name: 'Add filter' })).toBeInTheDocument();
  });
});
