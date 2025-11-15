import type { MouseEvent as ReactMouseEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { toErrorMessage } from '@/lib/errors';
import { getGraphView, type GraphViewModel } from '@/praxis-api';
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { NodeSearchDialog } from '@/components/node-search';
import { Button } from '@/components/ui/button';
import type { GraphWidgetConfig, SelectionState, WidgetSelection } from '../types';
import { buildFlowEdges, buildFlowNodes } from './graph-transform';
import { WidgetToolbar } from './widget-toolbar';

interface GraphWidgetProperties {
  readonly widget: GraphWidgetConfig;
  readonly reloadVersion: number;
  readonly selection?: SelectionState;
  readonly onSelectionChange?: (selection: WidgetSelection) => void;
  readonly onViewChange?: (view: GraphViewModel) => void;
  readonly onError?: (message: string) => void;
  readonly onRequestMetaModelFocus?: (types: string[]) => void;
}

export function GraphWidget({
  widget,
  reloadVersion,
  selection,
  onSelectionChange,
  onViewChange,
  onError,
  onRequestMetaModelFocus,
}: GraphWidgetProperties) {
  const [nodes, setNodes, handleNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, handleEdgesChange] = useEdgesState([] as Edge[]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [metadata, setMetadata] = useState<GraphViewModel['metadata'] | undefined>();

  const definition = useMemo(() => {
    return {
      ...widget.view,
      asOf: new Date().toISOString(),
    };
  }, [widget.view, reloadVersion]);

  const loadView = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const view = await getGraphView(definition);
      setMetadata(view.metadata);
      setNodes(buildFlowNodes(view));
      setEdges(buildFlowEdges(view));
      onViewChange?.(view);
    } catch (unknownError) {
      const message = toErrorMessage(unknownError);
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [definition, onError, onViewChange, setEdges, setNodes]);

  useEffect(() => {
    void loadView();
  }, [loadView]);

  useEffect(() => {
    if (!selection) {
      setNodes((current) => current.map((node) => ({ ...node, selected: false })));
      setEdges((current) => current.map((edge) => ({ ...edge, selected: false })));
      return;
    }
    setNodes((current) =>
      current.map((node) => ({ ...node, selected: selection.nodeIds.includes(node.id) })),
    );
    setEdges((current) =>
      current.map((edge) => {
        const edgeId = edge.id;
        const isSelected = selection.edgeIds.includes(edgeId);
        return { ...edge, selected: isSelected };
      }),
    );
  }, [selection, setEdges, setNodes]);

  const handleSelection = useCallback(
    (nextSelection: { nodes?: Node[]; edges?: Edge[] }) => {
      onSelectionChange?.({
        widgetId: widget.id,
        nodeIds: (nextSelection.nodes ?? []).map((node) => node.id),
        edgeIds: (nextSelection.edges ?? []).map((edge) => edge.id),
      });
    },
    [onSelectionChange, widget.id],
  );

  const [nodeSearchOpen, setNodeSearchOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const handleNodeContextMenu = useCallback(
    (event: ReactMouseEvent, node: Node) => {
      event.preventDefault();
      const selectedNodes = nodes.filter((entry) => entry.selected);
      if (selectedNodes.length === 0 || !node.selected) {
        return;
      }
      const types = [...new Set(selectedNodes.map((entry) => resolveNodeType(entry)))];
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        types: types.length > 0 ? types : ['Entity'],
      });
    },
    [nodes],
  );

  useEffect(() => {
    if (!contextMenu) {
      return;
    }
    const dismiss = () => {
      setContextMenu(null);
    };
    document.addEventListener('click', dismiss);
    document.addEventListener('contextmenu', dismiss);
    return () => {
      document.removeEventListener('click', dismiss);
      document.removeEventListener('contextmenu', dismiss);
    };
  }, [contextMenu]);

  return (
    <div className="relative h-full w-full">
      <WidgetToolbar
        metadata={metadata}
        fallbackTitle={widget.title}
        loading={loading}
        onRefresh={() => void loadView()}
      />
      <div className="flex justify-end py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setNodeSearchOpen(true);
          }}
        >
          Search nodes
        </Button>
      </div>
      <div className="h-[320px] w-full rounded-2xl border border-border/60 bg-muted/20">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            fitView
            onSelectionChange={handleSelection}
            onNodeContextMenu={handleNodeContextMenu}
            onPaneClick={() => {
              setContextMenu(null);
            }}
            onPaneContextMenu={() => {
              setContextMenu(null);
            }}
          >
            <Background
              color="hsl(var(--muted-foreground))"
              variant={BackgroundVariant.Dots}
              gap={16}
              size={1}
            />
            <Controls position="bottom-right" />
          </ReactFlow>
        </ReactFlowProvider>
        {loading ? <GraphWidgetOverlay message="Loading graph" /> : null}
        {error ? <GraphWidgetOverlay isError message={error} /> : null}
        {contextMenu ? (
          <GraphContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onFocus={() => {
              onRequestMetaModelFocus?.(contextMenu.types);
              setContextMenu(null);
            }}
          />
        ) : null}
      </div>
      <NodeSearchDialog
        open={nodeSearchOpen}
        onOpenChange={setNodeSearchOpen}
        onSelectNode={(node) => {
          handleSelection({ nodes: [node], edges: [] });
          setNodeSearchOpen(false);
        }}
      />
    </div>
  );
}

interface ContextMenuState {
  readonly x: number;
  readonly y: number;
  readonly types: string[];
}

function resolveNodeType(node: Node): string {
  const typeValue = (node.data as { type?: string } | undefined)?.type;
  if (typeof typeValue === 'string' && typeValue.trim()) {
    return typeValue;
  }
  return 'Entity';
}

interface GraphWidgetOverlayProperties {
  readonly message: string;
  readonly isError?: boolean;
}

function GraphWidgetOverlay({ message, isError }: GraphWidgetOverlayProperties) {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center rounded-2xl text-sm ${
        isError ? 'bg-red-100/80 text-red-800' : 'bg-background/80 text-muted-foreground'
      }`}
    >
      {isError ? <AlertBadge /> : null}
      {message}
    </div>
  );
}

function AlertBadge() {
  return (
    <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-red-700">Error</span>
  );
}

function GraphContextMenu({
  x,
  y,
  onFocus,
}: {
  readonly x: number;
  readonly y: number;
  readonly onFocus: () => void;
}) {
  return (
    <div
      className="fixed z-50 min-w-[160px] rounded-lg border border-border/70 bg-popover text-sm shadow-xl"
      style={{ top: y, left: x }}
    >
      <button
        type="button"
        className="block w-full px-4 py-2 text-left hover:bg-muted"
        onClick={onFocus}
      >
        View meta-model entry
      </button>
    </div>
  );
}
