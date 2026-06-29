import type { GraphViewModel } from 'praxis/praxis-api';
import type { SelectionKind } from 'praxis/types';

import type { SelectionProperties } from './stores/selection-store';

/**
 * Merge view-derived and stored selection properties; stored values win.
 * @param viewProperties - Properties derived from the current graph view.
 * @param storedProperties - Properties held in the selection store.
 */
export function mergeSelectionProperties(
  viewProperties?: SelectionProperties,
  storedProperties?: SelectionProperties,
): SelectionProperties | undefined {
  if (!viewProperties && !storedProperties) {
    return undefined;
  }
  return { ...viewProperties, ...storedProperties };
}

/**
 * Resolve selection properties from a graph view for the selected node or edge.
 * @param parameters - Resolution parameters.
 * @param parameters.selectionKind - Selection kind (node or edge).
 * @param parameters.selectionId - Selected entity id.
 * @param parameters.view - Current graph view model.
 */
export function resolveViewSelectionProperties(parameters: {
  readonly selectionKind: SelectionKind;
  readonly selectionId: string;
  readonly view?: GraphViewModel;
}): SelectionProperties | undefined {
  const { selectionKind, selectionId, view } = parameters;
  if (!view) {
    return undefined;
  }
  if (selectionKind === 'node') {
    const node = view.nodes.find((candidate) => candidate.id === selectionId);
    if (!node) {
      return undefined;
    }
    const properties = node.props ?? {};
    const name = asOptionalString(node.label) ?? asOptionalString(properties.label) ?? node.id;
    return {
      name,
      description: asOptionalString(properties.description),
      dataSource: asOptionalString(properties.dataSource),
      type: node.type,
    };
  }
  if (selectionKind === 'edge') {
    const edge = findEdgeById(view, selectionId);
    if (!edge) {
      return undefined;
    }
    const properties = edge.props ?? {};
    return {
      name: edge.label ?? asOptionalString(properties.label) ?? edge.type ?? selectionId,
      description: asOptionalString(properties.description),
      type: edge.type,
      from: edge.from,
      to: edge.to,
    };
  }
  return undefined;
}

/**
 * Find an edge in a graph view by its resolved id.
 * @param view - Graph view model.
 * @param edgeId - Resolved edge id.
 */
export function findEdgeById(view: GraphViewModel, edgeId: string) {
  for (const [index, edge] of view.edges.entries()) {
    const resolved = edge.id ?? `${edge.from}-${edge.to}-${String(index)}`;
    if (resolved === edgeId) {
      return edge;
    }
  }
}

/**
 * Coerce a value to a trimmed non-empty string, else undefined.
 * @param value - Candidate value.
 */
export function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
