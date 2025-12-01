import type { ReactNode } from 'react';

interface NodeSelect {
  readonly id: string;
  readonly position: { x: number; y: number };
  readonly data: Record<string, unknown>;
}

interface NodeSearchDialogProperties {
  readonly children?: ReactNode;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onSelectNode?: (node: NodeSelect) => void;
}

export function NodeSearchDialog({
  children,
  open,
  onOpenChange,
  onSelectNode,
}: NodeSearchDialogProperties) {
  return (
    <div data-testid="node-search-dialog" data-open={open ? 'true' : 'false'}>
      {children}
      <button
        type="button"
        data-testid="node-search-select"
        onClick={() => onSelectNode?.({ id: 'mock-node', position: { x: 0, y: 0 }, data: {} })}
      >
        select
      </button>
      <button type="button" data-testid="node-search-toggle" onClick={() => onOpenChange?.(!open)}>
        toggle
      </button>
    </div>
  );
}
