import { act, renderHook } from '@testing-library/react';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { EMPTY_SELECTION } from 'aideon/canvas/types';
import {
  SelectionProvider,
  deriveSelectionKind,
  primarySelectionId,
  useSelectionStore,
} from 'praxis/stores/selection-store';
import type { SelectionKind } from 'praxis/types';

describe('selection-store extra coverage', () => {
  it('SelectionKind is exactly the selection-model spec set', () => {
    expectTypeOf<SelectionKind>().toEqualTypeOf<'node' | 'edge' | 'cell' | 'artefact' | 'none'>();
    // @ts-expect-error 'widget' is not a SelectionKind — it was renamed to 'artefact'.
    expectTypeOf<'widget'>().toExtend<SelectionKind>();
  });

  it('throws outside provider', () => {
    expect(() => renderHook(() => useSelectionStore())).toThrow(/SelectionProvider/);
  });

  it('updates and resets properties, dedupes widget selections', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SelectionProvider>{children}</SelectionProvider>
    );
    const { result } = renderHook(() => useSelectionStore(), { wrapper });

    act(() => {
      result.current.setFromWidget({
        widgetId: 'w1',
        nodeIds: ['n1', 'n1'],
        edgeIds: ['e1'],
        cellIds: [],
      });
    });
    expect(result.current.state.selection.nodeIds).toEqual(['n1']);
    expect(result.current.state.selection.edgeIds).toEqual(['e1']);

    act(() => {
      result.current.updateProperties('n1', { name: 'Node 1', description: 'desc' });
      result.current.resetProperties('n1');
    });
    expect(result.current.state.properties.n1).toBeUndefined();

    act(() => {
      result.current.clear();
    });
    expect(result.current.state.selection).toEqual(EMPTY_SELECTION);
  });

  it('derives selection kind and primary id', () => {
    const cellId = ['c1', 'c2'].join('::');
    expect(
      deriveSelectionKind({
        nodeIds: ['a'],
        edgeIds: [],
        cellIds: [],
        sourceWidgetId: undefined,
      }),
    ).toBe('node');
    expect(
      deriveSelectionKind({
        nodeIds: [],
        edgeIds: ['b'],
        cellIds: [],
        sourceWidgetId: undefined,
      }),
    ).toBe('edge');
    expect(
      deriveSelectionKind({
        nodeIds: [],
        edgeIds: [],
        cellIds: [],
        sourceWidgetId: 'widget-1',
      }),
    ).toBe('artefact');
    expect(
      deriveSelectionKind({
        nodeIds: [],
        edgeIds: [],
        cellIds: [cellId],
        sourceWidgetId: undefined,
      }),
    ).toBe('cell');
    expect(deriveSelectionKind(EMPTY_SELECTION)).toBe('none');

    expect(
      primarySelectionId({ nodeIds: ['a'], edgeIds: [], cellIds: [], sourceWidgetId: undefined }),
    ).toBe('a');
    expect(
      primarySelectionId({ nodeIds: [], edgeIds: ['b'], cellIds: [], sourceWidgetId: undefined }),
    ).toBe('b');
    expect(
      primarySelectionId({
        nodeIds: [],
        edgeIds: [],
        cellIds: [cellId],
        sourceWidgetId: undefined,
      }),
    ).toBe(cellId);
    expect(
      primarySelectionId({ nodeIds: [], edgeIds: [], cellIds: [], sourceWidgetId: 'widget-1' }),
    ).toBe('widget-1');
  });
});
