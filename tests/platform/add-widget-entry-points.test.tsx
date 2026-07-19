import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ToolbarControlBand } from 'platform/platform-toolbar';
import type { PraxisWidgetKind } from 'praxis/types';

const controlBandBaseProperties = {
  templateName: 'Capability landscape',
  scenarios: [],
  scenariosLoading: false,
  activeScenarioId: undefined,
  onSelectScenario: vi.fn(),
  scenarioTriggerReference: vi.fn(),
  branch: undefined,
  commits: [],
  commitId: undefined,
  onSelectCommit: vi.fn(),
  layer: 'Plan' as const,
  onSelectLayer: vi.fn(),
  timeLoading: false,
};

describe('toolbar Add widget entry point', () => {
  it('calls onAddWidget when the toolbar button is activated', () => {
    const onAddWidget = vi.fn();
    render(<ToolbarControlBand {...controlBandBaseProperties} onAddWidget={onAddWidget} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add widget' }));

    expect(onAddWidget).toHaveBeenCalledTimes(1);
  });
});

const { hostPlatformState } = vi.hoisted(() => ({
  hostPlatformState: {
    widgetLibraryOpen: false,
    onToggleWidgetLibrary: vi.fn(),
    onCreateWidgetType: vi.fn(),
  },
}));

vi.mock('platform/host-platform-context', () => ({
  useHostPlatform: () => hostPlatformState,
}));

vi.mock('platform/widget-catalog', () => ({
  useWidgetCatalog: () => ({
    widgets: [] as { type: PraxisWidgetKind; label: string }[],
  }),
}));

vi.mock('platform/widget-library-dialog', () => ({
  WidgetLibraryDialog: () => <div>Widget library dialog</div>,
}));

vi.mock('aideon/canvas/topos-canvas-surface', () => ({
  ToposCanvasSurface: () => <div>Canvas</div>,
}));

describe('on-canvas Add widget entry point', () => {
  it('opens the widget library from the on-canvas + affordance', async () => {
    const { ModellingStudioSurface } = await import('platform/surfaces/modelling-studio-surface');
    render(<ModellingStudioSurface />);

    fireEvent.click(screen.getByRole('button', { name: 'Add widget' }));

    expect(hostPlatformState.onToggleWidgetLibrary).toHaveBeenCalledWith(true);
  });
});
