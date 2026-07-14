import type { MouseEvent as ReactMouseEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useEdgesState,
  useNodesState,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeChange,
  type NodeTypes,
} from '@xyflow/react';
import { toErrorMessage } from 'praxis/lib/errors';
import { cn } from 'praxis/lib/utilities';
import {
  getGraphLayout,
  getGraphView,
  saveGraphLayout,
  type GraphViewModel,
} from 'praxis/praxis-api';

import { Button, ToggleGroup, ToggleGroupItem } from 'design-system';
import { NodeSearchDialog } from 'design-system/reactflow/node-search';
import { PraxisNode } from 'design-system/reactflow/praxis-node';
import { TimelineEdge, type TimelineEdgeData } from 'design-system/reactflow/timeline-edge';
import type { GraphLayoutNode } from 'dtos';
import type {
  GraphLayoutContext,
  PraxisGraphWidgetConfig as GraphWidgetConfig,
  SelectionState,
  WidgetSelection,
} from 'praxis/types';
import type { GraphNodeData } from './graph-node-data';
import { areStringSetsEqual, selectionFromEvent } from './graph-selection';
import { buildFlowEdges, buildFlowNodes } from './graph-transform';
import { WidgetToolbar } from './widget-toolbar';

interface GraphWidgetProperties {
  readonly widget: GraphWidgetConfig;
  readonly reloadVersion: number;
  readonly selection?: SelectionState;
  readonly graphLayoutContext?: GraphLayoutContext;
  readonly onSelectionChange?: (selection: WidgetSelection) => void;
  readonly onViewChange?: (view: GraphViewModel) => void;
  readonly onError?: (message: string) => void;
  readonly onRequestMetaModelFocus?: (types: string[]) => void;
}

/**
 *
 * @param root0
 * @param root0.widget
 * @param root0.reloadVersion
 * @param root0.selection
 * @param root0.graphLayoutContext
 * @param root0.onSelectionChange
 * @param root0.onViewChange
 * @param root0.onError
 * @param root0.onRequestMetaModelFocus
 */
export function GraphWidget({
  widget,
  reloadVersion,
  selection,
  graphLayoutContext,
  onSelectionChange,
  onViewChange,
  onError,
  onRequestMetaModelFocus,
}: GraphWidgetProperties) {
  const t = useTranslations('engines.praxis.widgets.graphWidget');
  const [nodes, setNodes] = useNodesState<Node<GraphNodeData>>([]);
  const [edges, setEdges, handleEdgesChange] = useEdgesState<Edge<TimelineEdgeData>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [metadata, setMetadata] = useState<GraphViewModel['metadata'] | undefined>();
  const [background, setBackground] = useState<BackgroundKind>('dots');
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [layoutHydrated, setLayoutHydrated] = useState(true);
  const viewReference = useRef<GraphViewModel | undefined>(undefined);
  // Hold the callback props in refs so loadView/attachInspectHandlers don't
  // depend on them — the parent passes new inline closures every render, which
  // would otherwise recreate loadView and refire its effect in a loop. Synced
  // in an effect (not during render) per the repo's react-hooks/refs rule.
  const onViewChangeReference = useRef(onViewChange);
  const onErrorReference = useRef(onError);
  const onRequestMetaModelFocusReference = useRef(onRequestMetaModelFocus);
  useEffect(() => {
    onViewChangeReference.current = onViewChange;
    onErrorReference.current = onError;
    onRequestMetaModelFocusReference.current = onRequestMetaModelFocus;
  });

  const definition = useMemo(() => widget.view, [widget.view]);

  const persistLayout = useCallback(
    (nextNodes: Node<GraphNodeData>[], options?: { force?: boolean }) => {
      if (!layoutHydrated && !options?.force) {
        return;
      }
      if (!graphLayoutContext) {
        return;
      }
      void saveGraphLayout({
        docId: graphLayoutContext.docId,
        widgetId: widget.id,
        asOf: graphLayoutContext.asOf,
        scenario: graphLayoutContext.scenario,
        layer: graphLayoutContext.layer,
        nodes: nextNodes.map((node) => ({
          id: node.id,
          x: node.position.x,
          y: node.position.y,
        })),
      });
    },
    [graphLayoutContext, layoutHydrated, widget.id],
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const shouldPersist = changes.some(
        (change) => change.type === 'position' && change.dragging === false,
      );
      setNodes((current) => {
        const next = applyNodeChanges(changes, current) as Node<GraphNodeData>[];
        if (shouldPersist) {
          persistLayout(next);
        }
        return next;
      });
    },
    [persistLayout, setNodes],
  );

  const attachInspectHandlers = useCallback((flowNodes: Node<GraphNodeData>[]) => {
    if (!onRequestMetaModelFocusReference.current) {
      return flowNodes;
    }
    return flowNodes.map((node) => {
      const types = (node.data.entityTypes ?? []).filter((value: string) => {
        return isNonEmptyString(value);
      });
      if (types.length === 0) {
        return node;
      }
      return {
        ...node,
        data: {
          ...node.data,
          onInspect: () => {
            onRequestMetaModelFocusReference.current?.(types);
          },
        },
      };
    });
  }, []);

  const loadView = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    setLayoutHydrated(!graphLayoutContext);
    try {
      const view = await getGraphView(definition);
      viewReference.current = view;
      setMetadata(view.metadata);
      const flowNodes = attachInspectHandlers(buildFlowNodes(view));
      if (graphLayoutContext) {
        const layout = await getGraphLayout({
          docId: graphLayoutContext.docId,
          widgetId: widget.id,
          asOf: graphLayoutContext.asOf,
          scenario: graphLayoutContext.scenario,
          layer: graphLayoutContext.layer,
        });
        setNodes(mergeLayoutPositions(flowNodes, layout?.nodes ?? []));
      } else {
        setNodes(flowNodes);
      }
      setEdges(buildFlowEdges(view));
      onViewChangeReference.current?.(view);
    } catch (unknownError) {
      const message = toErrorMessage(unknownError);
      setError(message);
      onErrorReference.current?.(message);
    } finally {
      setLayoutHydrated(true);
      setLoading(false);
    }
  }, [attachInspectHandlers, definition, graphLayoutContext, setEdges, setNodes, widget.id]);

  useEffect(() => {
    loadView().catch((_ignoredError: unknown) => {
      return;
    });
  }, [loadView, reloadVersion]);

  useEffect(() => {
    setNodes((current) => attachInspectHandlers(current));
  }, [attachInspectHandlers, setNodes]);

  useEffect(() => {
    const selectedNodeIdSet = new Set(selection?.nodeIds);
    const selectedEdgeIdSet = new Set(selection?.edgeIds);
    setNodes((current) => applySelectedFlags(current, selectedNodeIdSet));
    setEdges((current) => applySelectedFlags(current, selectedEdgeIdSet));
  }, [selection, setEdges, setNodes]);

  const handleSelection = useCallback(
    (nextSelection: { nodes?: Node[]; edges?: Edge[] }) => {
      const snapshot = selectionFromEvent(nextSelection);
      if (selectionMatchesSnapshot(selection, snapshot)) {
        return;
      }

      onSelectionChange?.({
        widgetId: widget.id,
        nodeIds: [...snapshot.nodeIds],
        edgeIds: [...snapshot.edgeIds],
        cellIds: [...snapshot.cellIds],
      });
    },
    [onSelectionChange, selection, widget.id],
  );

  const handleAutoLayout = useCallback(() => {
    const view = viewReference.current;
    if (!view) {
      return;
    }
    const flowNodes = attachInspectHandlers(buildFlowNodes(view));
    setNodes(flowNodes);
    setEdges(buildFlowEdges(view));
    persistLayout(flowNodes, { force: true });
  }, [attachInspectHandlers, persistLayout, setEdges, setNodes]);

  const [nodeSearchOpen, setNodeSearchOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | undefined>();
  const nodeTypes = useMemo<NodeTypes>(
    () => ({ 'praxis-node': PraxisNode as NodeTypes['praxis-node'] }),
    [],
  );
  const edgeTypes = useMemo<EdgeTypes>(
    () => ({ timeline: TimelineEdge as EdgeTypes['timeline'] }),
    [],
  );

  const handleNodeContextMenu = useCallback(
    (event: ReactMouseEvent, node: Node<GraphNodeData>) => {
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
      setContextMenu(undefined);
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
        onRefresh={() => {
          loadView().catch((_ignoredError: unknown) => {
            return;
          });
        }}
      />
      <div className="border-border/60 bg-muted/20 h-full min-h-[360px] w-full rounded-2xl border">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            fitView
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onSelectionChange={handleSelection}
            onNodeContextMenu={handleNodeContextMenu}
            onPaneClick={() => {
              setContextMenu(undefined);
            }}
            onPaneContextMenu={() => {
              setContextMenu(undefined);
            }}
          >
            <Background
              color="hsl(var(--muted-foreground))"
              variant={resolveBackgroundVariant(background)}
              gap={16}
              size={1}
            />
            {showControls ? <Controls position="bottom-right" /> : undefined}
            {showMiniMap ? (
              <MiniMap
                position="top-right"
                nodeColor={() => 'hsl(var(--primary) / 0.85)'}
                maskColor="hsl(var(--background) / 0.85)"
                className="border-border/60 bg-background/80 rounded-xl border shadow-sm"
              />
            ) : undefined}
            <Panel
              position="top-left"
              className="border-border/60 bg-background/90 text-muted-foreground rounded-2xl border p-3 text-xs shadow"
            >
              <div className="flex flex-wrap items-center gap-2">
                <ToggleGroup
                  type="single"
                  value={background}
                  onValueChange={(value) => {
                    if (isBackgroundKind(value)) {
                      setBackground(value);
                    }
                  }}
                  className="gap-1"
                >
                  <ToggleGroupItem
                    value="dots"
                    aria-label={t('backgroundDotsAria')}
                    className="h-7 px-2"
                  >
                    {t('backgroundDots')}
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="lines"
                    aria-label={t('backgroundLinesAria')}
                    className="h-7 px-2"
                  >
                    {t('backgroundLines')}
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="cross"
                    aria-label={t('backgroundCrossAria')}
                    className="h-7 px-2"
                  >
                    {t('backgroundCross')}
                  </ToggleGroupItem>
                </ToggleGroup>
                <Button
                  variant={showMiniMap ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    setShowMiniMap((previous) => !previous);
                  }}
                >
                  {t('miniMap')}
                </Button>
                <Button
                  variant={showControls ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    setShowControls((previous) => !previous);
                  }}
                >
                  {t('controls')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleAutoLayout}
                >
                  {t('autoLayout')}
                </Button>
              </div>
              <p className="text-muted-foreground/90 mt-2 text-[11px]">{t('metaActionsHint')}</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 px-0 text-xs"
                onClick={() => {
                  setNodeSearchOpen(true);
                }}
              >
                {t('openNodeSearch')}
              </Button>
            </Panel>
          </ReactFlow>
        </ReactFlowProvider>
        {loading ? <GraphWidgetOverlay message={t('loadingGraph')} /> : undefined}
        {error ? (
          <GraphWidgetOverlay isError message={error} errorBadgeLabel={t('errorBadge')} />
        ) : undefined}
        {contextMenu ? (
          <GraphContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            label={t('viewMetaModelEntry')}
            onFocus={() => {
              onRequestMetaModelFocus?.(contextMenu.types);
              setContextMenu(undefined);
            }}
          />
        ) : undefined}
      </div>
      <NodeSearchDialog
        open={nodeSearchOpen}
        onOpenChange={setNodeSearchOpen}
        onSelectNode={(node: Node) => {
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

/**
 *
 * @param node
 */
function resolveNodeType(node: Node<GraphNodeData>): string {
  const typeValue = node.data.typeLabel;
  if (typeof typeValue === 'string' && typeValue.trim()) {
    return typeValue;
  }
  const fallback = (node.data.entityTypes ?? []).find((value: string) => isNonEmptyString(value));
  return fallback ?? 'Entity';
}

interface GraphWidgetOverlayProperties {
  readonly message: string;
  readonly isError?: boolean;
  readonly errorBadgeLabel?: string;
}

type BackgroundKind = 'dots' | 'lines' | 'cross';

/**
 * Narrow a raw toggle-group value to a supported background kind.
 * @param value - Raw toggle-group value.
 * @returns True when the value is a known background kind.
 */
function isBackgroundKind(value: string): value is BackgroundKind {
  return value === 'dots' || value === 'lines' || value === 'cross';
}

/**
 * Reconcile the `selected` flag on flow nodes or edges against an id set,
 * preserving referential identity when nothing changed.
 * @param items - Current flow nodes or edges.
 * @param selectedIds - Ids that should be marked selected.
 * @returns The reconciled array, or the original reference when unchanged.
 */
function applySelectedFlags<T extends { id: string; selected?: boolean }>(
  items: T[],
  selectedIds: Set<string>,
): T[] {
  let didChange = false;
  const next: T[] = [];
  for (const item of items) {
    const isSelected = selectedIds.has(item.id);
    if (item.selected === isSelected) {
      next.push(item);
    } else {
      didChange = true;
      next.push({ ...item, selected: isSelected });
    }
  }
  return didChange ? next : items;
}

/**
 * Overlay persisted layout coordinates onto freshly built flow nodes.
 * @param flowNodes - Nodes produced from the current view.
 * @param layoutNodes - Persisted positions keyed by node id.
 * @returns Flow nodes with saved positions applied where available.
 */
function mergeLayoutPositions(
  flowNodes: Node<GraphNodeData>[],
  layoutNodes: readonly GraphLayoutNode[],
): Node<GraphNodeData>[] {
  const positions = new Map(layoutNodes.map((node) => [node.id, node]));
  return flowNodes.map((node) => {
    const position = positions.get(node.id);
    if (!position) {
      return node;
    }
    return { ...node, position: { x: position.x, y: position.y } };
  });
}

/**
 * Whether the current selection already equals the snapshot from a flow event.
 * @param selection - Current selection state, if any.
 * @param snapshot - Selection derived from the latest flow event.
 * @returns True when node, edge, and cell id sets all match.
 */
function selectionMatchesSnapshot(
  selection: SelectionState | undefined,
  snapshot: ReturnType<typeof selectionFromEvent>,
): boolean {
  return (
    selection !== undefined &&
    areStringSetsEqual(selection.nodeIds, snapshot.nodeIds) &&
    areStringSetsEqual(selection.edgeIds, snapshot.edgeIds) &&
    areStringSetsEqual(selection.cellIds, snapshot.cellIds)
  );
}

/**
 * Map a background selection to the XYFlow variant enum.
 * @param background - Selected background type.
 * @returns Background variant.
 */
function resolveBackgroundVariant(background: BackgroundKind): BackgroundVariant {
  switch (background) {
    case 'dots': {
      return BackgroundVariant.Dots;
    }
    case 'lines': {
      return BackgroundVariant.Lines;
    }
    case 'cross': {
      return BackgroundVariant.Cross;
    }
  }
}

/**
 *
 * @param root0
 * @param root0.message
 * @param root0.isError
 * @param root0.errorBadgeLabel
 */
function GraphWidgetOverlay({ message, isError, errorBadgeLabel }: GraphWidgetOverlayProperties) {
  return (
    <div
      className={cn(
        'absolute inset-0 flex items-center justify-center rounded-2xl text-sm backdrop-blur',
        isError ? 'bg-destructive/10 text-destructive' : 'bg-background/70 text-muted-foreground',
      )}
    >
      {isError ? <AlertBadge label={errorBadgeLabel ?? 'Error'} /> : undefined}
      {message}
    </div>
  );
}

/**
 *
 * @param root0
 * @param root0.label
 */
function AlertBadge({ label }: { readonly label: string }) {
  return (
    <span className="text-destructive mr-2 text-xs font-semibold tracking-wide uppercase">
      {label}
    </span>
  );
}

/**
 *
 * @param root0
 * @param root0.x
 * @param root0.y
 * @param root0.label
 * @param root0.onFocus
 */
function GraphContextMenu({
  x,
  y,
  label,
  onFocus,
}: {
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly onFocus: () => void;
}) {
  return (
    <div
      className="border-border/70 bg-popover fixed z-50 min-w-[160px] rounded-lg border text-sm shadow-xl"
      style={{ top: y, left: x }}
    >
      <button
        type="button"
        className="hover:bg-muted block w-full px-4 py-2 text-left"
        onClick={onFocus}
      >
        {label}
      </button>
    </div>
  );
}

/**
 *
 * @param value
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
