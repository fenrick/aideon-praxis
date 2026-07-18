import { Button } from 'design-system';
import { Maximize, MousePointer2, ZoomIn, ZoomOut } from 'design-system/icons';
import { cn } from 'design-system/lib/utilities';
import { isBrowserRuntime } from 'lib/runtime';
import { useTranslations } from 'next-intl';
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { DraggableWidgetWrapper } from './draggable-widget-wrapper';
import { useInfiniteCanvas } from './hooks/use-infinite-canvas';
import { calculateInitialLayout } from './layout-engine';
import type { CanvasWidgetLayout } from './types';
import { WidgetFrame } from './widget-frame';

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetSize {
  w: number;
  h: number;
}

export interface CanvasRuntimeLayoutSnapshot {
  readonly positions: Record<string, WidgetPosition>;
  readonly sizes: Record<string, WidgetSize>;
}

export interface CanvasRuntimeLayoutPersistence<TWidget extends CanvasWidgetLayout> {
  readonly load: (widgets: readonly TWidget[]) => Promise<CanvasRuntimeLayoutSnapshot | undefined>;
  readonly save: (
    widgets: readonly TWidget[],
    snapshot: CanvasRuntimeLayoutSnapshot,
  ) => Promise<void>;
}

interface AideonCanvasRuntimeProperties<TWidget extends CanvasWidgetLayout> {
  readonly widgets: TWidget[];
  readonly renderWidget: (widget: TWidget) => React.ReactNode;
  readonly className?: string;
  readonly showPageBreaks?: boolean;
  readonly layoutKey?: string;
  readonly layoutPersistence?: CanvasRuntimeLayoutPersistence<TWidget>;
}

/**
 * Returns default widget dimensions based on layout size.
 * @param widget
 */
function getWidgetDefaultSize(widget: CanvasWidgetLayout): WidgetSize {
  const isHalf = widget.size === 'half';
  return { w: isHalf ? 650 : 1300, h: isHalf ? 550 : 850 };
}

/**
 * Ensures widget positions exist for the current widget set.
 * @param previous
 * @param widgets
 */
function syncWidgetPositions(
  previous: Record<string, WidgetPosition>,
  widgets: CanvasWidgetLayout[],
): Record<string, WidgetPosition> {
  const existing = { ...previous };
  const missing = widgets.filter((widget) => existing[widget.id] === undefined);
  if (missing.length === 0) {
    return existing;
  }
  return { ...existing, ...calculateInitialLayout(missing) };
}

/**
 * Merges sizes from storage into the current widget size state.
 * @param previous
 * @param widgets
 */
function syncWidgetSizes(
  previous: Record<string, WidgetSize>,
  widgets: CanvasWidgetLayout[],
): Record<string, WidgetSize> {
  let didChange = false;
  const next: Record<string, WidgetSize> = { ...previous };

  for (const widget of widgets) {
    if (next[widget.id] === undefined) {
      didChange = true;
      next[widget.id] = getWidgetDefaultSize(widget);
    }
  }

  return didChange ? next : previous;
}

/**
 * Schedule a frame update in the browser, with a setTimeout fallback for non-browser environments.
 * @param callback
 */
function scheduleFrame(callback: () => void) {
  if (!isBrowserRuntime() || typeof globalThis.requestAnimationFrame !== 'function') {
    const timeout = setTimeout(callback, 0);
    return () => {
      clearTimeout(timeout);
    };
  }
  const frame = globalThis.requestAnimationFrame(callback);
  return () => {
    globalThis.cancelAnimationFrame(frame);
  };
}

interface CanvasLayoutState {
  readonly widgetPositions: Record<string, WidgetPosition>;
  readonly widgetSizes: Record<string, WidgetSize>;
  readonly handleDragEnd: (id: string, x: number, y: number) => void;
  readonly handleResizeEnd: (id: string, w: number, h: number) => void;
}

interface CanvasLayoutStore {
  readonly positionsReference: RefObject<Record<string, WidgetPosition>>;
  readonly sizesReference: RefObject<Record<string, WidgetSize>>;
  readonly cancelledReference: RefObject<boolean>;
  readonly setPositions: Dispatch<SetStateAction<Record<string, WidgetPosition>>>;
  readonly setSizes: Dispatch<SetStateAction<Record<string, WidgetSize>>>;
  readonly setHydrated: Dispatch<SetStateAction<boolean>>;
}

/**
 * Load a persisted layout snapshot and apply it to the canvas stores, marking
 * hydration complete unless the effect was cancelled while loading.
 * @param widgets - Widgets to load a snapshot for.
 * @param layoutPersistence - Adapter used to load the snapshot.
 * @param store - Mutable layout stores and state setters.
 */
async function hydratePersistedLayout<TWidget extends CanvasWidgetLayout>(
  widgets: TWidget[],
  layoutPersistence: CanvasRuntimeLayoutPersistence<TWidget>,
  store: CanvasLayoutStore,
): Promise<void> {
  try {
    const snapshot = await layoutPersistence.load(widgets);
    if (store.cancelledReference.current) {
      return;
    }
    const positions = snapshot?.positions ?? {};
    const sizes = snapshot?.sizes ?? {};
    store.positionsReference.current = positions;
    store.sizesReference.current = sizes;
    store.setPositions(positions);
    store.setSizes(sizes);
  } catch {
    // ignore (layout persistence unavailable)
  } finally {
    if (!store.cancelledReference.current) {
      store.setHydrated(true);
    }
  }
}

/**
 * Ensure positions and sizes exist for every widget, applying and persisting
 * any additions produced for newly added widgets.
 * @param widgets - Widgets to synchronise against the current stores.
 * @param store - Mutable layout stores and state setters.
 * @param persistSnapshot - Persists the resulting layout when it changes.
 */
function synchroniseWidgetLayout(
  widgets: CanvasWidgetLayout[],
  store: CanvasLayoutStore,
  persistSnapshot: (
    positions: Record<string, WidgetPosition>,
    sizes: Record<string, WidgetSize>,
  ) => void,
): void {
  const currentPositions = store.positionsReference.current;
  const currentSizes = store.sizesReference.current;
  const nextPositions = syncWidgetPositions(currentPositions, widgets);
  const nextSizes = syncWidgetSizes(currentSizes, widgets);

  const positionsChanged = nextPositions !== currentPositions;
  const sizesChanged = nextSizes !== currentSizes;

  if (positionsChanged) {
    store.positionsReference.current = nextPositions;
    store.setPositions(nextPositions);
  }
  if (sizesChanged) {
    store.sizesReference.current = nextSizes;
    store.setSizes(nextSizes);
  }
  if (positionsChanged || sizesChanged) {
    persistSnapshot(nextPositions, nextSizes);
  }
}

/**
 * Manage widget position and size state for the canvas, including hydration
 * from persistence, synchronisation of new widgets, and persistence of edits.
 * @param widgets - Widgets currently rendered on the canvas.
 * @param layoutKey - Stable key identifying the persisted layout, if any.
 * @param layoutPersistence - Optional load/save adapter for the layout.
 * @returns Widget layout state plus drag and resize handlers.
 */
function useCanvasLayout<TWidget extends CanvasWidgetLayout>(
  widgets: TWidget[],
  layoutKey: string | undefined,
  layoutPersistence: CanvasRuntimeLayoutPersistence<TWidget> | undefined,
): CanvasLayoutState {
  const [widgetPositions, setWidgetPositions] = useState<Record<string, WidgetPosition>>({});
  const [widgetSizes, setWidgetSizes] = useState<Record<string, WidgetSize>>({});
  const [layoutHydrated, setLayoutHydrated] = useState(() => !layoutPersistence || !layoutKey);

  const widgetPositionsReference = useRef(widgetPositions);
  const widgetSizesReference = useRef(widgetSizes);
  const layoutLoadCancelledReference = useRef(false);

  const storeReference = useRef<CanvasLayoutStore>({
    positionsReference: widgetPositionsReference,
    sizesReference: widgetSizesReference,
    cancelledReference: layoutLoadCancelledReference,
    setPositions: setWidgetPositions,
    setSizes: setWidgetSizes,
    setHydrated: setLayoutHydrated,
  });

  useEffect(() => {
    widgetPositionsReference.current = widgetPositions;
  }, [widgetPositions]);

  useEffect(() => {
    widgetSizesReference.current = widgetSizes;
  }, [widgetSizes]);

  const persistSnapshot = useCallback(
    (positions: Record<string, WidgetPosition>, sizes: Record<string, WidgetSize>) => {
      if (!layoutHydrated) {
        return;
      }
      if (!layoutPersistence || !layoutKey) {
        return;
      }
      void layoutPersistence.save(widgets, { positions, sizes });
    },
    [layoutHydrated, layoutKey, layoutPersistence, widgets],
  );

  useEffect(() => {
    if (!layoutPersistence || !layoutKey) {
      setLayoutHydrated(true);
      return;
    }
    layoutLoadCancelledReference.current = false;
    setLayoutHydrated(false);
    void hydratePersistedLayout(widgets, layoutPersistence, storeReference.current);

    return () => {
      layoutLoadCancelledReference.current = true;
    };
  }, [layoutKey, layoutPersistence, widgets]);

  useEffect(() => {
    if (!layoutHydrated) {
      return;
    }
    const cancelFrame = scheduleFrame(() => {
      synchroniseWidgetLayout(widgets, storeReference.current, persistSnapshot);
    });

    return () => {
      cancelFrame();
    };
  }, [layoutHydrated, persistSnapshot, widgets]);

  const handleDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      setWidgetPositions((previous) => {
        const next = { ...previous, [id]: { x, y } };
        widgetPositionsReference.current = next;
        persistSnapshot(next, widgetSizesReference.current);
        return next;
      });
    },
    [persistSnapshot],
  );

  const handleResizeEnd = useCallback(
    (id: string, w: number, h: number) => {
      setWidgetSizes((previous) => {
        const next = { ...previous, [id]: { w, h } };
        widgetSizesReference.current = next;
        persistSnapshot(widgetPositionsReference.current, next);
        return next;
      });
    },
    [persistSnapshot],
  );

  return { widgetPositions, widgetSizes, handleDragEnd, handleResizeEnd };
}

/**
 * Provide memoised zoom-in, zoom-out, and reset-view handlers bound to a
 * viewport setter from the infinite-canvas hook.
 * @param setViewport - Viewport state setter.
 * @returns Zoom control click handlers.
 */
function useCanvasZoomControls(setViewport: ReturnType<typeof useInfiniteCanvas>['setViewport']) {
  const handleZoomIn = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      setViewport((previous) => ({
        ...previous,
        scale: Math.min(previous.scale + 0.1, 3),
      }));
    },
    [setViewport],
  );

  const handleZoomOut = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      setViewport((previous) => ({
        ...previous,
        scale: Math.max(previous.scale - 0.1, 0.1),
      }));
    },
    [setViewport],
  );

  const handleResetView = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      setViewport({ x: 0, y: 0, scale: 0.8 });
    },
    [setViewport],
  );

  return { handleZoomIn, handleZoomOut, handleResetView };
}

/**
 * Faint A4 page-break grid overlaid on the canvas surface.
 */
function CanvasPageBreaks() {
  return (
    <div
      className="pointer-events-none absolute -top-[10000px] -left-[10000px] z-0 h-[20000px] w-[20000px] opacity-20"
      style={{
        backgroundImage:
          'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
        // Approx A4 @ 96 DPI.
        backgroundSize: '794px 1123px',
        color: 'var(--border)',
      }}
    />
  );
}

interface CanvasWidgetLayerProperties<TWidget extends CanvasWidgetLayout> {
  readonly widgets: TWidget[];
  readonly widgetPositions: Record<string, WidgetPosition>;
  readonly widgetSizes: Record<string, WidgetSize>;
  readonly scale: number;
  readonly renderWidget: (widget: TWidget) => React.ReactNode;
  readonly onDragEnd: (id: string, x: number, y: number) => void;
  readonly onResizeEnd: (id: string, w: number, h: number) => void;
}

/**
 * Render every widget as a draggable, resizable frame at its current layout.
 * @param root0
 * @param root0.widgets
 * @param root0.widgetPositions
 * @param root0.widgetSizes
 * @param root0.scale
 * @param root0.renderWidget
 * @param root0.onDragEnd
 * @param root0.onResizeEnd
 * @returns Widget layer element.
 */
function CanvasWidgetLayer<TWidget extends CanvasWidgetLayout>({
  widgets,
  widgetPositions,
  widgetSizes,
  scale,
  renderWidget,
  onDragEnd,
  onResizeEnd,
}: CanvasWidgetLayerProperties<TWidget>) {
  return (
    <>
      {widgets.map((widget) => {
        const position = widgetPositions[widget.id] ?? { x: 0, y: 0 };
        const size = widgetSizes[widget.id] ?? getWidgetDefaultSize(widget);

        return (
          <DraggableWidgetWrapper
            key={widget.id}
            id={widget.id}
            x={position.x}
            y={position.y}
            width={size.w}
            height={size.h}
            scale={scale}
            onDragEnd={onDragEnd}
            onResizeEnd={onResizeEnd}
          >
            <WidgetFrame title={widget.title ?? widget.id}>{renderWidget(widget)}</WidgetFrame>
          </DraggableWidgetWrapper>
        );
      })}
    </>
  );
}

interface CanvasZoomControlsProperties {
  readonly scale: number;
  readonly onZoomIn: (event: React.MouseEvent) => void;
  readonly onZoomOut: (event: React.MouseEvent) => void;
  readonly onResetView: (event: React.MouseEvent) => void;
}

/**
 * Floating zoom-in, zoom-out, and reset-view controls with the current scale.
 * @param root0
 * @param root0.scale
 * @param root0.onZoomIn
 * @param root0.onZoomOut
 * @param root0.onResetView
 * @returns Floating zoom controls element.
 */
function CanvasZoomControls({
  scale,
  onZoomIn,
  onZoomOut,
  onResetView,
}: CanvasZoomControlsProperties) {
  const t = useTranslations('shell.canvasRuntime');
  return (
    <div className="border-border/50 bg-background/80 absolute right-6 bottom-6 flex flex-col gap-2 rounded-lg border p-1.5 opacity-60 shadow-lg backdrop-blur-md transition-opacity hover:opacity-100">
      <Button variant="ghost" size="icon-sm" onClick={onZoomIn} title={t('zoomIn')}>
        <ZoomIn className="h-4 w-4" />
      </Button>
      <div className="text-muted-foreground text-center font-mono text-[10px] select-none">
        {Math.round(scale * 100)}%
      </div>
      <Button variant="ghost" size="icon-sm" onClick={onZoomOut} title={t('zoomOut')}>
        <ZoomOut className="h-4 w-4" />
      </Button>
      <div className="bg-border/50 my-0.5 h-px" />
      <Button variant="ghost" size="icon-sm" onClick={onResetView} title={t('resetView')}>
        <Maximize className="h-4 w-4" />
      </Button>
    </div>
  );
}

/**
 * Pan hint that fades in when the canvas surface is hovered.
 */
function CanvasPanHint() {
  const t = useTranslations('shell.canvasRuntime');
  return (
    <div className="pointer-events-none absolute bottom-6 left-6 opacity-0 transition-opacity group-hover/canvas:opacity-40">
      <div className="text-muted-foreground bg-background/50 flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium backdrop-blur-sm">
        <MousePointer2 className="h-3 w-3" />
        <span>{t('panHint')}</span>
      </div>
    </div>
  );
}

/**
 * Lay out and render multiple canvas widgets on an infinite surface.
 * @param root0
 * @param root0.widgets
 * @param root0.renderWidget
 * @param root0.className
 * @param root0.showPageBreaks
 * @param root0.layoutKey
 * @param root0.layoutPersistence
 * @returns Canvas runtime surface.
 */
function AideonCanvasRuntimeImpl<TWidget extends CanvasWidgetLayout>({
  widgets,
  renderWidget,
  className,
  showPageBreaks,
  layoutKey,
  layoutPersistence,
}: AideonCanvasRuntimeProperties<TWidget>) {
  const { viewport, setViewport, containerReference, events } = useInfiniteCanvas({
    minScale: 0.1,
    maxScale: 3,
    initialScale: 0.8,
  });

  const { widgetPositions, widgetSizes, handleDragEnd, handleResizeEnd } = useCanvasLayout(
    widgets,
    layoutKey,
    layoutPersistence,
  );

  const viewportTransform = useMemo(() => {
    const x = viewport.x.toString();
    const y = viewport.y.toString();
    const scale = viewport.scale.toString();
    return `translate(${x}px, ${y}px) scale(${scale})`;
  }, [viewport.scale, viewport.x, viewport.y]);

  const { handleZoomIn, handleZoomOut, handleResetView } = useCanvasZoomControls(setViewport);

  return (
    <div
      ref={containerReference}
      className={cn(
        'bg-background bg-dot-pattern group/canvas relative h-full w-full cursor-grab overflow-hidden active:cursor-grabbing',
        className,
      )}
      {...events}
    >
      {/* Viewport Container */}
      <div
        style={{
          transform: viewportTransform,
          transformOrigin: '0 0',
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {/* Page Breaks Overlay */}
        {showPageBreaks ? <CanvasPageBreaks /> : undefined}

        {/* Widgets */}
        <CanvasWidgetLayer
          widgets={widgets}
          widgetPositions={widgetPositions}
          widgetSizes={widgetSizes}
          scale={viewport.scale}
          renderWidget={renderWidget}
          onDragEnd={handleDragEnd}
          onResizeEnd={handleResizeEnd}
        />
      </div>

      {/* Floating Canvas Controls */}
      <CanvasZoomControls
        scale={viewport.scale}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
      />

      {/* Hint */}
      <CanvasPanHint />
    </div>
  );
}

export const AideonCanvasRuntime = memo(AideonCanvasRuntimeImpl) as typeof AideonCanvasRuntimeImpl;
