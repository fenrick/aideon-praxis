import { EMPTY_SELECTION, type SelectionState, type WidgetSelection } from './types';

export function dedupeIds(ids: readonly string[]): string[] {
  return [...new Set(ids.filter((value): value is string => Boolean(value.trim())))];
}

export function fromWidgetSelection(selection?: WidgetSelection): SelectionState {
  if (!selection) {
    return EMPTY_SELECTION;
  }
  return {
    sourceWidgetId: selection.widgetId,
    nodeIds: dedupeIds(selection.nodeIds),
    edgeIds: dedupeIds(selection.edgeIds),
  };
}

export function isSelectionEmpty(selection?: SelectionState): boolean {
  if (!selection) {
    return true;
  }
  return selection.nodeIds.length === 0 && selection.edgeIds.length === 0;
}

export function selectionCounts(selection?: SelectionState): { nodes: number; edges: number } {
  return {
    nodes: selection?.nodeIds.length ?? 0,
    edges: selection?.edgeIds.length ?? 0,
  };
}

export function selectionSummary(selection?: SelectionState): string {
  if (isSelectionEmpty(selection)) {
    return 'No selection';
  }
  const { nodes, edges } = selectionCounts(selection);
  const parts: string[] = [];
  if (nodes > 0) {
    parts.push(`${nodes.toString()} ${nodes === 1 ? 'node' : 'nodes'}`);
  }
  if (edges > 0) {
    parts.push(`${edges.toString()} ${edges === 1 ? 'edge' : 'edges'}`);
  }
  return parts.join(', ');
}
