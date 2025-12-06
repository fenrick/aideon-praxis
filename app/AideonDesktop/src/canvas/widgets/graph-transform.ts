import type { Edge, Node } from '@xyflow/react';

import type { GraphEdgeView, GraphNodeView, GraphViewModel } from 'canvas/praxis-api';
import type { TimelineEdgeData } from 'design-system/components/timeline-edge';
import type { GraphNodeData } from './graph-node-data';

/**
 *
 * @param view
 */
export function buildFlowNodes(view: GraphViewModel): Node<GraphNodeData>[] {
  return view.nodes.map((node) => toFlowNode(node));
}

/**
 *
 * @param view
 */
export function buildFlowEdges(view: GraphViewModel): Edge<TimelineEdgeData>[] {
  return view.edges.map((edge, index) => toFlowEdge(edge, index));
}

/**
 *
 * @param node
 */
export function toFlowNode(node: GraphNodeView): Node<GraphNodeData> {
  return {
    id: node.id,
    type: 'praxis-node',
    data: {
      label: node.label,
      typeLabel: node.type,
      status: node.type === 'Capability' ? 'active' : 'warning',
      meta: resolveDescription(node),
      entityTypes: resolveEntityTypes(node),
    },
    position: {
      x: node.position?.x ?? 0,
      y: node.position?.y ?? 0,
    },
  };
}

/**
 *
 * @param edge
 * @param index
 */
export function toFlowEdge(edge: GraphEdgeView, index: number): Edge<TimelineEdgeData> {
  return {
    id: edge.id ?? `${edge.from}-${edge.to}-${String(index)}`,
    source: edge.from,
    target: edge.to,
    label: edge.label,
    type: 'timeline',
    data: {
      label: edge.label,
    },
    animated: edge.type === 'depends_on',
  };
}

/**
 *
 * @param node
 */
function resolveDescription(node: GraphNodeView): string | undefined {
  const metadata = (node as { metadata?: { description?: string } }).metadata;
  const description = metadata?.description;
  return typeof description === 'string' ? description : undefined;
}

/**
 *
 * @param node
 */
function resolveEntityTypes(node: GraphNodeView): string[] {
  const typeValue = node.type;
  if (typeof typeValue === 'string' && typeValue.trim()) {
    return [typeValue];
  }
  return ['Entity'];
}
