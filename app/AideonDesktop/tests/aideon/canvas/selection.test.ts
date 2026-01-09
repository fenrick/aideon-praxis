import { describe, expect, it } from 'vitest';

import {
  dedupeIds,
  fromWidgetSelection,
  isSelectionEmpty,
  selectionSummary,
} from 'aideon/canvas/selection';
import { EMPTY_SELECTION } from 'aideon/canvas/types';

describe('canvas selection helpers', () => {
  it('deduplicates and strips empty identifiers', () => {
    expect(dedupeIds(['id-a', 'id-a', '   ', 'id-b'])).toEqual(['id-a', 'id-b']);
  });

  it('builds consistent selection state from widget events', () => {
    const state = fromWidgetSelection({
      widgetId: 'graph',
      nodeIds: ['x', 'x'],
      edgeIds: [],
      cellIds: [],
    });
    expect(state).toEqual({
      sourceWidgetId: 'graph',
      nodeIds: ['x'],
      edgeIds: [],
      cellIds: [],
    });
  });

  it('detects empty selections', () => {
    expect(isSelectionEmpty()).toBe(true);
    expect(isSelectionEmpty(EMPTY_SELECTION)).toBe(true);
  });

  it('summarises node and edge counts', () => {
    const summary = selectionSummary({
      sourceWidgetId: 'graph',
      nodeIds: ['a', 'b'],
      edgeIds: ['e'],
      cellIds: [],
    });
    expect(summary).toBe('2 nodes, 1 edge');
    expect(selectionSummary()).toBe('No selection');
  });

  it('summarises cell selections', () => {
    expect(
      selectionSummary({
        sourceWidgetId: 'matrix',
        nodeIds: [],
        edgeIds: [],
        cellIds: ['row-1::col-1'],
      }),
    ).toBe('1 cell');
  });
});
