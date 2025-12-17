import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';

import { BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle } from './base-node';

export interface PraxisNodeData extends Record<string, unknown> {
  label?: string;
  typeLabel?: string;
  meta?: string;
}

export type PraxisNodeType = Node<PraxisNodeData, 'praxis-node'>;

export function PraxisNode({ data, selected }: NodeProps<PraxisNodeType>) {
  return (
    <BaseNode className={selected ? 'ring-2 ring-primary/40' : undefined}>
      <BaseNodeHeader>
        <BaseNodeHeaderTitle>{data?.label ?? 'Node'}</BaseNodeHeaderTitle>
        {data?.typeLabel ? (
          <span className="text-xs text-muted-foreground" data-slot="praxis-node-type">
            {data.typeLabel}
          </span>
        ) : null}
      </BaseNodeHeader>
      <BaseNodeContent>
        {data?.meta ? (
          <p className="text-xs text-muted-foreground" data-slot="praxis-node-meta">
            {data.meta}
          </p>
        ) : null}
      </BaseNodeContent>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
}
