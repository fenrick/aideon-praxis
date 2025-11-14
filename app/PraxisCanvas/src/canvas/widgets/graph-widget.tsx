import { useCallback, useEffect, useMemo, useState } from 'react';

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
import { Loader2, RefreshCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { toErrorMessage } from '@/lib/errors';
import { getGraphView, type GraphViewModel } from '@/praxis-api';

import type { GraphWidgetConfig, WidgetSelection } from '../types';
import { buildFlowEdges, buildFlowNodes } from './graph-transform';

interface GraphWidgetProperties {
  readonly widget: GraphWidgetConfig;
  readonly reloadVersion: number;
  readonly onSelectionChange?: (selection: WidgetSelection) => void;
  readonly onViewChange?: (view: GraphViewModel) => void;
  readonly onError?: (message: string) => void;
}

export function GraphWidget({
  widget,
  reloadVersion,
  onSelectionChange,
  onViewChange,
  onError,
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

  const handleSelection = useCallback(
    (selection: { nodes?: Node[]; edges?: Edge[] }) => {
      onSelectionChange?.({
        widgetId: widget.id,
        nodeIds: (selection.nodes ?? []).map((node) => node.id),
        edgeIds: (selection.edges ?? []).map((edge) => edge.id),
      });
    },
    [onSelectionChange, widget.id],
  );

  return (
    <div className="relative h-full w-full">
      <GraphWidgetToolbar metadata={metadata} loading={loading} onRefresh={() => void loadView()} />
      <div className="h-[320px] w-full rounded-2xl border border-border/60 bg-muted/20">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            fitView
            onSelectionChange={handleSelection}
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
      </div>
    </div>
  );
}

interface GraphWidgetToolbarProperties {
  readonly metadata?: GraphViewModel['metadata'];
  readonly loading: boolean;
  readonly onRefresh: () => void;
}

function GraphWidgetToolbar({ metadata, loading, onRefresh }: GraphWidgetToolbarProperties) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Widget</p>
        <p className="text-sm font-medium text-foreground">{metadata?.name ?? 'Twin overview'}</p>
        <p className="text-xs text-muted-foreground">
          {metadata ? `As of ${new Date(metadata.asOf).toLocaleString()}` : 'Awaiting twin data'}
        </p>
      </div>
      <Button variant="secondary" size="sm" disabled={loading} onClick={onRefresh}>
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCcw className="mr-2 h-4 w-4" />
        )}
        Refresh
      </Button>
    </div>
  );
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
