import { memo } from 'react';

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';

import { cn } from '../lib/cn';
import { Button } from '../ui/button';
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeFooter,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from './base-node';
import { NodeTooltip, NodeTooltipContent, NodeTooltipTrigger } from './node-tooltip';

export type PraxisNodeStatus = 'active' | 'warning' | 'error';

export interface PraxisNodeData extends Record<string, unknown> {
  readonly label: string;
  readonly typeLabel?: string;
  readonly status?: PraxisNodeStatus;
  readonly meta?: string;
  readonly onInspect?: () => void;
  readonly entityTypes?: string[];
}

export type PraxisNodeType = Node<PraxisNodeData>;

export const PraxisNode = memo(function PraxisNode({ data, id }: NodeProps<PraxisNodeType>) {
  const nodeData = data;
  const status = resolveStatus(nodeData.status);

  return (
    <NodeTooltip>
      <NodeTooltipTrigger>
        <BaseNode className="min-w-[200px] rounded-2xl border-border bg-card shadow-sm transition focus-visible:ring-primary">
          <BaseNodeHeader>
            <div className="flex flex-1 flex-col">
              <BaseNodeHeaderTitle className="leading-tight">{nodeData.label}</BaseNodeHeaderTitle>
              {nodeData.typeLabel ? (
                <span className="text-xs text-muted-foreground">{nodeData.typeLabel}</span>
              ) : null}
            </div>
            <StatusBadge status={status} />
          </BaseNodeHeader>
          <BaseNodeContent>
            {nodeData.meta ? (
              <p className="text-xs text-muted-foreground">{nodeData.meta}</p>
            ) : (
              <p className="text-xs text-muted-foreground">No metadata attached.</p>
            )}
          </BaseNodeContent>
          <BaseNodeFooter className="items-start gap-1 text-[0.65rem] text-muted-foreground">
            <span className="font-semibold uppercase tracking-wide">#{id}</span>
            <span className="text-muted-foreground/80">
              Click or right-click nodes for block actions.
            </span>
          </BaseNodeFooter>
          <Handle
            type="target"
            position={Position.Top}
            className="h-2 w-2 rounded-full bg-primary"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            className="h-2 w-2 rounded-full bg-primary"
          />
        </BaseNode>
      </NodeTooltipTrigger>
      <NodeTooltipContent position={Position.Right} className="rounded-lg border bg-popover px-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Node</p>
            <p className="text-sm font-semibold">{nodeData.label}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (typeof nodeData.onInspect === 'function') {
                nodeData.onInspect();
              }
            }}
          >
            Inspect
          </Button>
        </div>
      </NodeTooltipContent>
    </NodeTooltip>
  );
});

function resolveStatus(candidate?: PraxisNodeStatus): PraxisNodeStatus {
  if (candidate === 'warning' || candidate === 'error') {
    return candidate;
  }
  return 'active';
}

function StatusBadge({ status }: { readonly status: PraxisNodeStatus }) {
  const label = getStatusLabel(status);
  return (
    <span
      className={cn(
        'rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide',
        getStatusBadgeClasses(status),
      )}
    >
      {label}
    </span>
  );
}

function getStatusLabel(status: PraxisNodeStatus): string {
  switch (status) {
    case 'warning': {
      return 'Warning';
    }
    case 'error': {
      return 'Error';
    }
    default: {
      return 'Active';
    }
  }
}

function getStatusBadgeClasses(status: PraxisNodeStatus): string {
  switch (status) {
    case 'warning': {
      return 'border-amber-200 bg-amber-100 text-amber-900';
    }
    case 'error': {
      return 'border-red-200 bg-red-100 text-red-900';
    }
    default: {
      return 'border-emerald-200 bg-emerald-100 text-emerald-900';
    }
  }
}
