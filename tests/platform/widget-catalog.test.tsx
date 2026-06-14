import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { EMPTY_SELECTION } from 'aideon/canvas/types';
import { LicensingProvider } from 'platform/licensing';
import { useWidgetCatalog } from 'platform/widget-catalog';

const renderContext = {
  reloadVersion: 0,
  selection: EMPTY_SELECTION,
  onSelection: vi.fn(),
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <LicensingProvider>{children}</LicensingProvider>
);

describe('widget catalog', () => {
  it('lists the licensed praxis widgets', () => {
    const { result } = renderHook(() => useWidgetCatalog(), { wrapper });

    const types = result.current.widgets.map((widget) => widget.type);
    expect(types).toEqual(expect.arrayContaining(['graph', 'catalogue', 'matrix', 'chart']));
    expect(result.current.widgets.every((widget) => widget.engineId === 'praxis')).toBe(true);
  });

  it('contributes nothing when the engine is unlicensed', () => {
    const unlicensed = ({ children }: { children: ReactNode }) => (
      <LicensingProvider licensed={{ praxis: false }}>{children}</LicensingProvider>
    );
    const { result } = renderHook(() => useWidgetCatalog(), { wrapper: unlicensed });
    expect(result.current.widgets).toHaveLength(0);
  });

  it('creates and dispatches widgets by type', () => {
    const { result } = renderHook(() => useWidgetCatalog(), { wrapper });

    const widget = result.current.createWidget('graph');
    if (!widget) {
      throw new Error('expected a widget');
    }
    expect((widget as { kind?: string }).kind).toBe('graph');

    expect(result.current.renderWidget(widget, renderContext)).toBeTruthy();
    expect(result.current.renderWidget({ id: 'unknown' }, renderContext)).toBeUndefined();
  });
});
