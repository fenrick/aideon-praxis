import type { Edge, Node } from '@xyflow/react';

import type { GraphEdgeView, GraphNodeView, GraphViewModel } from '@/praxis-api';

export function buildFlowNodes(view: GraphViewModel): Node[] {
  return view.nodes.map((node) => toFlowNode(node));
}

export function buildFlowEdges(view: GraphViewModel): Edge[] {
  return view.edges.map((edge, index) => toFlowEdge(edge, index));
}

export function toFlowNode(node: GraphNodeView): Node {
  return {
    id: node.id,
    type: 'default',
    data: {
      label: node.label,
      type: node.type,
    },
    position: {
      x: node.position?.x ?? 0,
      y: node.position?.y ?? 0,
    },
  };
}

export function toFlowEdge(edge: GraphEdgeView, index: number): Edge {
  return {
    id: edge.id ?? `${edge.from}-${edge.to}-${String(index)}`,
    source: edge.from,
    target: edge.to,
    label: edge.label,
    animated: edge.type === 'depends_on',
  };
}
