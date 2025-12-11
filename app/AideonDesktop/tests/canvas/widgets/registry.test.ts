import { describe, expect, it } from 'vitest';

import { listWidgetRegistry, widgetDefaults } from 'canvas/widgets/registry';

describe('widget registry', () => {
  it('exposes defaults for each widget type', () => {
    const registry = listWidgetRegistry();
    expect(registry.length).toBeGreaterThanOrEqual(4);
    expect(widgetDefaults('graph')?.defaultView.kind).toBe('graph');
    expect(widgetDefaults('chart')?.defaultView.kind).toBe('chart');
  });

  it('returns undefined for unknown widgets', () => {
    expect(widgetDefaults('unknown' as any)).toBeUndefined();
  });
});
