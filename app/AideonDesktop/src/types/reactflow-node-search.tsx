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

/**
 * Minimal node search dialog stub for tests.
 * @param root0 - Dialog properties.
 * @param root0.children - Optional content to render.
 * @param root0.open - Whether the dialog is open.
 * @param root0.onOpenChange - Handler for open state changes.
 * @param root0.onSelectNode - Handler when a node is selected.
 * @returns Dialog component stub.
 */
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
