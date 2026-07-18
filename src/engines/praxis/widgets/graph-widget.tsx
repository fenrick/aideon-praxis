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

type FlowNode = Node<GraphNodeData>;
type FlowEdge = Edge<TimelineEdgeData>;
type NodesStateSetter = ReturnType<typeof useNodesState<FlowNode>>[1];
type EdgesStateSetter = ReturnType<typeof useEdgesState<FlowEdge>>[1];

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
 * Invoke an optional callback with a single argument when it is present.
 * @param callback - Callback to invoke, if defined.
 * @param value - Value passed to the callback.
 */
function invokeCallback<Value>(callback: ((value: Value) => void) | undefined, value: Value): void {
  callback?.(value);
}

/**
 * Whether persisting the layout should be skipped for the current change.
 * @param layoutHydrated - True once persisted positions have been applied.
 * @param options - Persist options, where `force` bypasses the hydration gate.
 * @returns True when the layout must not be persisted yet.
 */
function shouldSkipLayoutPersist(
  layoutHydrated: boolean,
  options: { force?: boolean } | undefined,
): boolean {
  return !layoutHydrated && !options?.force;
}

/**
 * Whether any change represents a committed (finished) node drag.
 * @param changes - Flow node changes from the latest interaction.
 * @returns True when at least one change is a settled position change.
 */
function hasCommittedPositionChange(changes: NodeChange[]): boolean {
  return changes.some((change) => change.type === 'position' && change.dragging === false);
}

/**
 * Collect the non-empty entity types declared on a flow node.
 * @param node - Flow node to inspect.
 * @returns The node's meaningful entity type labels.
 */
function collectEntityTypes(node: FlowNode): string[] {
  return (node.data.entityTypes ?? []).filter((value: string) => isNonEmptyString(value));
}

/**
 * Attach an inspect handler to a node when it carries entity types.
 * @param node - Flow node to augment.
 * @param onInspect - Callback invoked with the node's entity types.
 * @returns The node with an inspect handler, or the original when it has none.
 */
function attachInspectHandler(node: FlowNode, onInspect: (types: string[]) => void): FlowNode {
  const types = collectEntityTypes(node);
  if (types.length === 0) {
    return node;
  }
  return {
    ...node,
    data: {
      ...node.data,
      onInspect: () => {
        onInspect(types);
      },
    },
  };
}

/**
 * Resolve node positions, overlaying persisted layout coordinates when a
 * layout context is available.
 * @param flowNodes - Nodes produced from the current view.
 * @param graphLayoutContext - Active layout context, if any.
 * @param widgetId - Identifier of the owning widget.
 * @returns Flow nodes with persisted positions applied where available.
 */
async function resolveLayoutNodes(
  flowNodes: FlowNode[],
  graphLayoutContext: GraphLayoutContext | undefined,
  widgetId: string,
): Promise<FlowNode[]> {
  if (!graphLayoutContext) {
    return flowNodes;
  }
  const layout = await getGraphLayout({
    docId: graphLayoutContext.docId,
    widgetId,
  });
  return mergeLayoutPositions(flowNodes, layout?.nodes ?? []);
}

/**
 * Hold the latest callback props in refs so view-loading logic stays stable.
 *
 * The parent passes new inline closures every render, which would otherwise
 * recreate loadView and refire its effect in a loop. Synced in an effect (not
 * during render) per the repo's react-hooks/refs rule.
 * @param parameters - Current callback props to mirror into refs.
 * @param parameters.onViewChange - Latest view-change callback.
 * @param parameters.onError - Latest error callback.
 * @param parameters.onRequestMetaModelFocus - Latest meta-model focus callback.
 * @param parameters.graphLayoutContext - Active layout context, if any.
 * @param parameters.definition - Graph view definition to load.
 * @param parameters.widgetId - Identifier of the owning widget.
 * @param parameters.reloadVersion - Monotonic counter that forces a reload.
 * @returns View state, derived nodes/edges, and their action handlers.
 */
function useGraphViewModel(parameters: {
  readonly definition: GraphWidgetConfig['view'];
  readonly graphLayoutContext: GraphLayoutContext | undefined;
  readonly widgetId: string;
  readonly reloadVersion: number;
  readonly onViewChange: GraphWidgetProperties['onViewChange'];
  readonly onError: GraphWidgetProperties['onError'];
  readonly onRequestMetaModelFocus: GraphWidgetProperties['onRequestMetaModelFocus'];
}) {
  const {
    definition,
    graphLayoutContext,
    widgetId,
    reloadVersion,
    onViewChange,
    onError,
    onRequestMetaModelFocus,
  } = parameters;

  const onViewChangeReference = useRef(onViewChange);
  const onErrorReference = useRef(onError);
  const onRequestMetaModelFocusReference = useRef(onRequestMetaModelFocus);
  useEffect(() => {
    onViewChangeReference.current = onViewChange;
    onErrorReference.current = onError;
    onRequestMetaModelFocusReference.current = onRequestMetaModelFocus;
  });

  const [nodes, setNodes] = useNodesState<FlowNode>([]);
  const [edges, setEdges, handleEdgesChange] = useEdgesState<FlowEdge>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [metadata, setMetadata] = useState<GraphViewModel['metadata'] | undefined>();
  const [layoutHydrated, setLayoutHydrated] = useState(true);
  const viewReference = useRef<GraphViewModel | undefined>(undefined);

  const persistLayout = useCallback(
    (nextNodes: FlowNode[], options?: { force?: boolean }) => {
      if (shouldSkipLayoutPersist(layoutHydrated, options)) {
        return;
      }
      if (!graphLayoutContext) {
        return;
      }
      void saveGraphLayout({
        docId: graphLayoutContext.docId,
        widgetId,
        nodes: nextNodes.map((node) => ({
          id: node.id,
          x: node.position.x,
          y: node.position.y,
        })),
      });
    },
    [graphLayoutContext, layoutHydrated, widgetId],
  );

  const attachInspectHandlers = useCallback((flowNodes: FlowNode[]) => {
    if (!onRequestMetaModelFocusReference.current) {
      return flowNodes;
    }
    return flowNodes.map((node) =>
      attachInspectHandler(node, (types) => {
        invokeCallback(onRequestMetaModelFocusReference.current, types);
      }),
    );
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
      setNodes(await resolveLayoutNodes(flowNodes, graphLayoutContext, widgetId));
      setEdges(buildFlowEdges(view));
      invokeCallback(onViewChangeReference.current, view);
    } catch (unknownError) {
      const message = toErrorMessage(unknownError);
      setError(message);
      invokeCallback(onErrorReference.current, message);
    } finally {
      setLayoutHydrated(true);
      setLoading(false);
    }
  }, [attachInspectHandlers, definition, graphLayoutContext, setEdges, setNodes, widgetId]);

  useEffect(() => {
    loadView().catch((_ignoredError: unknown) => {
      return;
    });
  }, [loadView, reloadVersion]);

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

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    persistLayout,
    attachInspectHandlers,
    handleEdgesChange,
    handleAutoLayout,
    loading,
    error,
    metadata,
    loadView,
  };
}

/**
 * Re-apply inspect handlers to the current nodes whenever the attach
 * function changes.
 * @param setNodes - Setter for flow nodes.
 * @param attachInspectHandlers - Function that augments nodes with handlers.
 */
function useReattachInspectHandlers(
  setNodes: NodesStateSetter,
  attachInspectHandlers: (flowNodes: FlowNode[]) => FlowNode[],
): void {
  useEffect(() => {
    setNodes((current) => attachInspectHandlers(current));
  }, [attachInspectHandlers, setNodes]);
}

/**
 * Build the React Flow node-change handler, persisting settled drags.
 * @param setNodes - Setter for flow nodes.
 * @param persistLayout - Persists node positions after a committed drag.
 * @returns A React Flow `onNodesChange` handler.
 */
function useNodesChangeHandler(
  setNodes: NodesStateSetter,
  persistLayout: (nextNodes: FlowNode[], options?: { force?: boolean }) => void,
) {
  return useCallback(
    (changes: NodeChange[]) => {
      const shouldPersist = hasCommittedPositionChange(changes);
      setNodes((current) => {
        const next = applyNodeChanges(changes, current) as FlowNode[];
        if (shouldPersist) {
          persistLayout(next);
        }
        return next;
      });
    },
    [persistLayout, setNodes],
  );
}

/**
 * Manage the selected background variant, narrowing raw toggle values.
 * @returns The current background kind and its change handler.
 */
function useBackgroundSelection(): readonly [BackgroundKind, (value: string) => void] {
  const [background, setBackground] = useState<BackgroundKind>('dots');
  const handleBackgroundChange = useCallback((value: string) => {
    if (isBackgroundKind(value)) {
      setBackground(value);
    }
  }, []);
  return [background, handleBackgroundChange];
}

/**
 * Manage the canvas chrome: background, mini-map, controls, node search, and
 * the memoized node/edge type registries.
 * @returns Chrome state and its toggle handlers.
 */
function useGraphChrome() {
  const [background, handleBackgroundChange] = useBackgroundSelection();
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [nodeSearchOpen, setNodeSearchOpen] = useState(false);

  const nodeTypes = useMemo<NodeTypes>(
    () => ({ 'praxis-node': PraxisNode as NodeTypes['praxis-node'] }),
    [],
  );
  const edgeTypes = useMemo<EdgeTypes>(
    () => ({ timeline: TimelineEdge as EdgeTypes['timeline'] }),
    [],
  );

  const toggleMiniMap = useCallback(() => {
    setShowMiniMap((previous) => !previous);
  }, []);
  const toggleControls = useCallback(() => {
    setShowControls((previous) => !previous);
  }, []);
  const openNodeSearch = useCallback(() => {
    setNodeSearchOpen(true);
  }, []);

  return {
    background,
    handleBackgroundChange,
    showMiniMap,
    showControls,
    nodeSearchOpen,
    setNodeSearchOpen,
    nodeTypes,
    edgeTypes,
    toggleMiniMap,
    toggleControls,
    openNodeSearch,
  };
}

/**
 * Keep flow node/edge `selected` flags in sync with the external selection.
 * @param selection - Current selection state, if any.
 * @param setNodes - Setter for flow nodes.
 * @param setEdges - Setter for flow edges.
 */
function useSelectionSync(
  selection: SelectionState | undefined,
  setNodes: NodesStateSetter,
  setEdges: EdgesStateSetter,
): void {
  useEffect(() => {
    const selectedNodeIdSet = new Set(selection?.nodeIds);
    const selectedEdgeIdSet = new Set(selection?.edgeIds);
    setNodes((current) => applySelectedFlags(current, selectedNodeIdSet));
    setEdges((current) => applySelectedFlags(current, selectedEdgeIdSet));
  }, [selection, setEdges, setNodes]);
}

/**
 * Build the React Flow selection handler that propagates changes upward.
 * @param selection - Current selection state, if any.
 * @param onSelectionChange - Callback to notify parents of new selections.
 * @param widgetId - Identifier of the owning widget.
 * @returns A React Flow `onSelectionChange` handler.
 */
function useSelectionHandler(
  selection: SelectionState | undefined,
  onSelectionChange: GraphWidgetProperties['onSelectionChange'],
  widgetId: string,
) {
  return useCallback(
    (nextSelection: { nodes?: Node[]; edges?: Edge[] }) => {
      const snapshot = selectionFromEvent(nextSelection);
      if (selectionMatchesSnapshot(selection, snapshot)) {
        return;
      }

      invokeCallback(onSelectionChange, {
        widgetId,
        nodeIds: [...snapshot.nodeIds],
        edgeIds: [...snapshot.edgeIds],
        cellIds: [...snapshot.cellIds],
      });
    },
    [onSelectionChange, selection, widgetId],
  );
}

/**
 * Manage the node context menu state, opening, dismissal, and focus action.
 * @param nodes - Current flow nodes used to resolve the menu payload.
 * @param onRequestMetaModelFocus - Callback invoked when focusing the menu.
 * @returns Context menu state and its open/dismiss/focus handlers.
 */
function useNodeContextMenu(
  nodes: FlowNode[],
  onRequestMetaModelFocus: GraphWidgetProperties['onRequestMetaModelFocus'],
) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | undefined>();

  const handleNodeContextMenu = useCallback(
    (event: ReactMouseEvent, node: FlowNode) => {
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

  const dismissContextMenu = useCallback(() => {
    setContextMenu(undefined);
  }, []);

  const focusContextMenu = useCallback(() => {
    if (!contextMenu) {
      return;
    }
    invokeCallback(onRequestMetaModelFocus, contextMenu.types);
    setContextMenu(undefined);
  }, [contextMenu, onRequestMetaModelFocus]);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }
    document.addEventListener('click', dismissContextMenu);
    document.addEventListener('contextmenu', dismissContextMenu);
    return () => {
      document.removeEventListener('click', dismissContextMenu);
      document.removeEventListener('contextmenu', dismissContextMenu);
    };
  }, [contextMenu, dismissContextMenu]);

  return { contextMenu, handleNodeContextMenu, dismissContextMenu, focusContextMenu };
}

/**
 * Build a refresh handler that reloads the current graph view, swallowing any
 * rejection from the fire-and-forget reload.
 * @param loadView - Reloads the graph view.
 * @returns A stable refresh handler.
 */
function useRefreshHandler(loadView: () => Promise<void>) {
  return useCallback(() => {
    loadView().catch((_ignoredError: unknown) => {
      return;
    });
  }, [loadView]);
}

/**
 * Build the node-search selection handler that selects the chosen node and
 * closes the search dialog.
 * @param handleSelection - Propagates the new selection upward.
 * @param setNodeSearchOpen - Toggles the node-search dialog.
 * @returns A stable handler for a node picked in the search dialog.
 */
function useNodeSelectedHandler(
  handleSelection: (nextSelection: { nodes?: Node[]; edges?: Edge[] }) => void,
  setNodeSearchOpen: (open: boolean) => void,
) {
  return useCallback(
    (node: Node) => {
      handleSelection({ nodes: [node], edges: [] });
      setNodeSearchOpen(false);
    },
    [handleSelection, setNodeSearchOpen],
  );
}

type GraphChrome = ReturnType<typeof useGraphChrome>;
type GraphTranslator = ReturnType<typeof useTranslations<'engines.praxis.widgets.graphWidget'>>;

/**
 * Render the React Flow canvas decorations: background grid plus the optional
 * controls and mini-map overlays.
 * @param properties - Component properties.
 * @param properties.chrome - Canvas chrome state from `useGraphChrome`.
 */
function GraphCanvasDecorations({ chrome }: { readonly chrome: GraphChrome }) {
  const { background, showControls, showMiniMap } = chrome;
  return (
    <>
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
    </>
  );
}

/**
 * Render the top-left control panel: background selector, mini-map/controls
 * toggles, auto-layout, and the node-search launcher.
 * @param properties - Component properties.
 * @param properties.t - Scoped translator for the graph widget.
 * @param properties.chrome - Canvas chrome state from `useGraphChrome`.
 * @param properties.onAutoLayout - Handler that re-applies the automatic layout.
 */
function GraphControlsPanel({
  t,
  chrome,
  onAutoLayout,
}: {
  readonly t: GraphTranslator;
  readonly chrome: GraphChrome;
  readonly onAutoLayout: () => void;
}) {
  const {
    background,
    handleBackgroundChange,
    showMiniMap,
    showControls,
    toggleMiniMap,
    toggleControls,
    openNodeSearch,
  } = chrome;
  return (
    <Panel
      position="top-left"
      className="border-border/60 bg-background/90 text-muted-foreground rounded-2xl border p-3 text-xs shadow"
    >
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          value={background}
          onValueChange={handleBackgroundChange}
          className="gap-1"
        >
          <ToggleGroupItem value="dots" aria-label={t('backgroundDotsAria')} className="h-7 px-2">
            {t('backgroundDots')}
          </ToggleGroupItem>
          <ToggleGroupItem value="lines" aria-label={t('backgroundLinesAria')} className="h-7 px-2">
            {t('backgroundLines')}
          </ToggleGroupItem>
          <ToggleGroupItem value="cross" aria-label={t('backgroundCrossAria')} className="h-7 px-2">
            {t('backgroundCross')}
          </ToggleGroupItem>
        </ToggleGroup>
        <Button
          variant={showMiniMap ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={toggleMiniMap}
        >
          {t('miniMap')}
        </Button>
        <Button
          variant={showControls ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={toggleControls}
        >
          {t('controls')}
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onAutoLayout}>
          {t('autoLayout')}
        </Button>
      </div>
      <p className="text-muted-foreground/90 mt-2 text-[11px]">{t('metaActionsHint')}</p>
      <Button variant="ghost" size="sm" className="mt-1 px-0 text-xs" onClick={openNodeSearch}>
        {t('openNodeSearch')}
      </Button>
    </Panel>
  );
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
  const definition = useMemo(() => widget.view, [widget.view]);
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    persistLayout,
    attachInspectHandlers,
    handleEdgesChange,
    handleAutoLayout,
    loading,
    error,
    metadata,
    loadView,
  } = useGraphViewModel({
    definition,
    graphLayoutContext,
    widgetId: widget.id,
    reloadVersion,
    onViewChange,
    onError,
    onRequestMetaModelFocus,
  });

  const chrome = useGraphChrome();
  const { nodeSearchOpen, setNodeSearchOpen, nodeTypes, edgeTypes } = chrome;

  const handleNodesChange = useNodesChangeHandler(setNodes, persistLayout);
  useReattachInspectHandlers(setNodes, attachInspectHandlers);
  useSelectionSync(selection, setNodes, setEdges);
  const handleSelection = useSelectionHandler(selection, onSelectionChange, widget.id);
  const { contextMenu, handleNodeContextMenu, dismissContextMenu, focusContextMenu } =
    useNodeContextMenu(nodes, onRequestMetaModelFocus);

  const handleRefresh = useRefreshHandler(loadView);
  const handleNodeSelected = useNodeSelectedHandler(handleSelection, setNodeSearchOpen);

  return (
    <div className="relative h-full w-full">
      <WidgetToolbar
        metadata={metadata}
        fallbackTitle={widget.title}
        loading={loading}
        onRefresh={handleRefresh}
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
            onPaneClick={dismissContextMenu}
            onPaneContextMenu={dismissContextMenu}
          >
            <GraphCanvasDecorations chrome={chrome} />
            <GraphControlsPanel t={t} chrome={chrome} onAutoLayout={handleAutoLayout} />
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
            onFocus={focusContextMenu}
          />
        ) : undefined}
      </div>
      <NodeSearchDialog
        open={nodeSearchOpen}
        onOpenChange={setNodeSearchOpen}
        onSelectNode={handleNodeSelected}
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
