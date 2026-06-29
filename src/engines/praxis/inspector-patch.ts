import { applyOperations, type OperationBatchResult } from 'praxis/praxis-api';
import type { SelectionKind } from 'praxis/types';

import type { SelectionProperties } from './stores/selection-store';

/**
 * Build node properties from inspector patch data.
 * @param patch - Inspector patch fields.
 */
export function buildNodeProperties(
  patch: Record<string, string | undefined>,
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    properties.name = patch.name;
  }
  if (patch.dataSource !== undefined) {
    properties.dataSource = patch.dataSource;
  }
  if (patch.description !== undefined) {
    properties.description = patch.description;
  }
  return properties;
}

/**
 * Build edge properties plus endpoints from inspector patch data.
 * @param patch - Inspector patch fields.
 * @param selection - Current selection properties.
 */
export function buildEdgeUpdate(
  patch: Record<string, string | undefined>,
  selection?: SelectionProperties,
): { props: Record<string, unknown>; from: string; to: string } | undefined {
  const from = selection?.from;
  const to = selection?.to;
  if (!from || !to) {
    return undefined;
  }
  const properties: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    properties.label = patch.name;
  }
  if (patch.description !== undefined) {
    properties.description = patch.description;
  }
  return { props: properties, from, to };
}

/**
 * Apply an inspector patch as an accepted operation batch for the active branch.
 * @param parameters - Patch parameters.
 * @param parameters.kind - Selection kind (node or edge).
 * @param parameters.id - Selected entity id.
 * @param parameters.patch - Inspector patch fields.
 * @param parameters.selectedProperties - Current selection properties.
 * @param parameters.branch - Active branch the operation targets.
 */
export async function applyInspectorPatch(parameters: {
  readonly kind: SelectionKind;
  readonly id: string;
  readonly patch: Record<string, string | undefined>;
  readonly selectedProperties?: SelectionProperties;
  readonly branch?: string;
}): Promise<OperationBatchResult | undefined> {
  const { kind, id, patch, selectedProperties, branch } = parameters;
  if (kind === 'node') {
    return applyOperations(
      [
        {
          kind: 'updateNode',
          node: { id, props: buildNodeProperties(patch) },
        },
      ],
      { branch },
    );
  }
  if (kind === 'edge') {
    const update = buildEdgeUpdate(patch, selectedProperties);
    if (!update) {
      throw new Error('Edge endpoints unavailable for update.');
    }
    return applyOperations(
      [
        {
          kind: 'updateEdge',
          edge: {
            id,
            from: update.from,
            to: update.to,
            props: update.props,
          },
        },
      ],
      { branch },
    );
  }
  return undefined;
}
