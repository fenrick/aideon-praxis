import { EMPTY_SELECTION, type SelectionState, type WidgetSelection } from './types';

/**
 * Remove duplicates and blank values from a list of selection identifiers.
 * @param ids raw identifiers supplied by a widget.
 * @returns unique, truthy ids in insertion order.
 */
export function dedupeIds(ids: readonly string[]): string[] {
  return [...new Set(ids.filter((value): value is string => Boolean(value.trim())))];
}

/**
 * Convert a widget selection payload into the canonical SelectionState shape.
 * @param selection optional widget-level selection.
 * @returns normalized selection with empty arrays when nothing is selected.
 */
export function fromWidgetSelection(selection?: WidgetSelection): SelectionState {
  if (!selection) {
    return EMPTY_SELECTION;
  }
  return {
    sourceWidgetId: selection.widgetId,
    nodeIds: dedupeIds(selection.nodeIds),
    edgeIds: dedupeIds(selection.edgeIds),
    cellIds: dedupeIds(selection.cellIds),
  };
}

/**
 * Determine whether a selection carries any node or edge identifiers.
 * @param selection selection to inspect.
 * @returns true when the selection is empty or undefined.
 */
export function isSelectionEmpty(selection?: SelectionState): boolean {
  if (!selection) {
    return true;
  }
  return (
    selection.nodeIds.length === 0 &&
    selection.edgeIds.length === 0 &&
    selection.cellIds.length === 0
  );
}

/**
 * Calculate node/edge counts for the current selection.
 * @param selection selection to inspect.
 * @returns object containing node and edge counts (defaults to zero).
 */
export function selectionCounts(selection?: SelectionState): {
  nodes: number;
  edges: number;
  cells: number;
} {
  const resolved = selection ?? EMPTY_SELECTION;
  return {
    nodes: resolved.nodeIds.length,
    edges: resolved.edgeIds.length,
    cells: resolved.cellIds.length,
  };
}

/**
 * Build a short human-readable summary of the current selection.
 * @param selection selection to summarise.
 * @returns sentence fragment describing counts (e.g., "2 nodes, 1 edge").
 */
export function selectionSummary(selection?: SelectionState): string {
  const { nodes, edges, cells } = selectionCounts(selection);
  if (nodes + edges + cells === 0) {
    return 'No selection';
  }
  const parts = [
    ['node', nodes],
    ['edge', edges],
    ['cell', cells],
  ] as const;
  return parts
    .filter(([, count]) => count > 0)
    .map(([label, count]) => {
      const noun = count === 1 ? label : `${label}s`;
      return `${count.toString()} ${noun}`;
    })
    .join(', ');
}
