import { Handle, Position, type NodeProps } from '@xyflow/react';

import { BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle } from './base-node';

export interface PraxisNodeData {
  label?: string;
  typeLabel?: string;
  meta?: string;
}

export function PraxisNode({ data, selected }: NodeProps<PraxisNodeData>) {
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
