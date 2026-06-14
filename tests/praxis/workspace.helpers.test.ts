import { describe, expect, it } from 'vitest';

import type { WidgetRegistryEntry } from 'praxis/widgets/registry';
import { __test__ } from 'praxis/layout-helpers';

/**
 *
 * @param kind
 */
function makeEntry(kind: string): WidgetRegistryEntry {
  return {
    type: 'graph',
    label: 'Widget',
    description: 'desc',
    icon: 'icon',
    defaultSize: 'full',
    defaultView: {
      id: 'view-1',
      name: 'View',
      kind,
      filters: {},
    },
  } as unknown as WidgetRegistryEntry;
}

describe('praxis workspace helpers', () => {
  it('creates template widgets for known view kinds', () => {
    const graph = __test__.createLayoutWidget(makeEntry('graph'), 'w1');
    expect(graph.kind).toBe('graph');

    const chart = __test__.createLayoutWidget(makeEntry('chart'), 'w2');
    expect(chart.kind).toBe('chart');

    const catalogue = __test__.createLayoutWidget(makeEntry('catalogue'), 'w3');
    expect(catalogue.kind).toBe('catalogue');

    const matrix = __test__.createLayoutWidget(makeEntry('matrix'), 'w4');
    expect(matrix.kind).toBe('matrix');
  });

  it('defaults unknown view kinds to chart widgets', () => {
    const widget = __test__.createLayoutWidget(makeEntry('unknown'), 'w5');
    expect(widget.kind).toBe('chart');
  });
});
