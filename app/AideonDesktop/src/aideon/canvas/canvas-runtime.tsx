import { Button } from 'design-system/components/ui/button';
import { cn } from 'design-system/lib/utilities';
import { Maximize, MousePointer2, ZoomIn, ZoomOut } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { DraggableWidgetWrapper } from './draggable-widget-wrapper';
import { useInfiniteCanvas } from './hooks/use-infinite-canvas';
import { calculateInitialLayout } from './layout-engine';
import type { CanvasWidgetLayout } from './types';
import { WidgetFrame } from './widget-frame';

interface WidgetPosition {
  x: number;
  y: number;
}

interface WidgetSize {
  w: number;
  h: number;
}

interface AideonCanvasRuntimeProperties<TWidget extends CanvasWidgetLayout> {
  readonly widgets: TWidget[];
  readonly renderWidget: (widget: TWidget) => React.ReactNode;
  readonly className?: string;
  readonly showPageBreaks?: boolean;
}

const STORAGE_LAYOUT_KEY = 'praxis-canvas-layout';
const STORAGE_SIZES_KEY = 'praxis-canvas-sizes';

/**
 * Reads a JSON value from localStorage.
 * @param key
 */
function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Narrowing helper for plain object records.
 * @param value
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Runtime validator for position records loaded from storage.
 * @param value
 */
function isWidgetPosition(value: unknown): value is WidgetPosition {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.x === 'number' && typeof value.y === 'number';
}

/**
 * Runtime validator for size records loaded from storage.
 * @param value
 */
function isWidgetSize(value: unknown): value is WidgetSize {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.w === 'number' && typeof value.h === 'number';
}

/**
 * Parses a JSON value into a widget id -> position record.
 * @param value
 */
function parseWidgetPositionRecord(value: unknown): Record<string, WidgetPosition> {
  if (!isRecord(value)) {
    return {};
  }

  const positions = new Map<string, WidgetPosition>();
  for (const [id, position] of Object.entries(value)) {
    if (isWidgetPosition(position)) {
      positions.set(id, { x: position.x, y: position.y });
    }
  }

  return Object.fromEntries(positions) as Record<string, WidgetPosition>;
}

/**
 * Parses a JSON value into a widget id -> size record.
 * @param value
 */
function parseWidgetSizeRecord(value: unknown): Record<string, WidgetSize> {
  if (!isRecord(value)) {
    return {};
  }

  const sizes = new Map<string, WidgetSize>();
  for (const [id, size] of Object.entries(value)) {
    if (isWidgetSize(size)) {
      sizes.set(id, { w: size.w, h: size.h });
    }
  }

  return Object.fromEntries(sizes) as Record<string, WidgetSize>;
}

/**
 * Writes a JSON value to localStorage.
 * @param key
 * @param value
 */
function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore (storage unavailable)
  }
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
  const existing = { ...parseWidgetPositionRecord(readJson(STORAGE_LAYOUT_KEY)), ...previous };
  const missing = widgets.filter((widget) => existing[widget.id] === undefined);
  if (missing.length === 0) {
    return existing;
  }
  return { ...existing, ...calculateInitialLayout(missing) };
}

/**
 * Merges sizes from storage into the current widget size state.
 * @param previous
 */
function syncWidgetSizes(previous: Record<string, WidgetSize>): Record<string, WidgetSize> {
  return { ...parseWidgetSizeRecord(readJson(STORAGE_SIZES_KEY)), ...previous };
}

/**
 * Lay out and render multiple canvas widgets on an infinite surface.
 * @param root0
 * @param root0.widgets
 * @param root0.renderWidget
 * @param root0.className
 * @param root0.showPageBreaks
 * @returns Canvas runtime surface.
 */
function AideonCanvasRuntimeImpl<TWidget extends CanvasWidgetLayout>({
  widgets,
  renderWidget,
  className,
  showPageBreaks,
}: AideonCanvasRuntimeProperties<TWidget>) {
  const { viewport, setViewport, containerReference, events } = useInfiniteCanvas({
    minScale: 0.1,
    maxScale: 3,
    initialScale: 0.8,
  });

  const [widgetPositions, setWidgetPositions] = useState<Record<string, WidgetPosition>>(() =>
    parseWidgetPositionRecord(readJson(STORAGE_LAYOUT_KEY)),
  );
  const [widgetSizes, setWidgetSizes] = useState<Record<string, WidgetSize>>(() =>
    parseWidgetSizeRecord(readJson(STORAGE_SIZES_KEY)),
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setWidgetPositions((previous) => syncWidgetPositions(previous, widgets));
      setWidgetSizes(syncWidgetSizes);
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [widgets]);

  useEffect(() => {
    writeJson(STORAGE_LAYOUT_KEY, widgetPositions);
  }, [widgetPositions]);

  useEffect(() => {
    writeJson(STORAGE_SIZES_KEY, widgetSizes);
  }, [widgetSizes]);

  const handleDragEnd = useCallback((id: string, x: number, y: number) => {
    setWidgetPositions((previous) => ({ ...previous, [id]: { x, y } }));
  }, []);

  const handleResizeEnd = useCallback((id: string, w: number, h: number) => {
    setWidgetSizes((previous) => ({ ...previous, [id]: { w, h } }));
  }, []);

  const viewportTransform = useMemo(() => {
    const x = viewport.x.toString();
    const y = viewport.y.toString();
    const scale = viewport.scale.toString();
    return `translate(${x}px, ${y}px) scale(${scale})`;
  }, [viewport.scale, viewport.x, viewport.y]);

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

  return (
    <div
      ref={containerReference}
      className={cn(
        'relative h-full w-full overflow-hidden bg-background bg-dot-pattern cursor-grab active:cursor-grabbing group/canvas',
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
        {showPageBreaks ? (
          <div
            className="pointer-events-none absolute -top-[10000px] -left-[10000px] w-[20000px] h-[20000px] z-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
              // Approx A4 @ 96 DPI.
              backgroundSize: '794px 1123px',
              color: 'var(--border)',
            }}
          />
        ) : undefined}

        {/* Widgets */}
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
              scale={viewport.scale}
              onDragEnd={handleDragEnd}
              onResizeEnd={handleResizeEnd}
            >
              <WidgetFrame title={widget.title ?? widget.id}>{renderWidget(widget)}</WidgetFrame>
            </DraggableWidgetWrapper>
          );
        })}
      </div>

      {/* Floating Canvas Controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 rounded-lg border border-border/50 bg-background/80 p-1.5 shadow-lg backdrop-blur-md transition-opacity hover:opacity-100 opacity-60">
        <Button variant="ghost" size="icon-sm" onClick={handleZoomIn} title="Zoom In">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="text-center text-[10px] font-mono text-muted-foreground select-none">
          {Math.round(viewport.scale * 100)}%
        </div>
        <Button variant="ghost" size="icon-sm" onClick={handleZoomOut} title="Zoom Out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <div className="h-px bg-border/50 my-0.5" />
        <Button variant="ghost" size="icon-sm" onClick={handleResetView} title="Reset View">
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      {/* Hint */}
      <div className="absolute bottom-6 left-6 pointer-events-none opacity-0 group-hover/canvas:opacity-40 transition-opacity">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-background/50 px-2 py-1 rounded-md backdrop-blur-sm">
          <MousePointer2 className="h-3 w-3" />
          <span>Middle Click or Shift+Drag to Pan · Scroll to Zoom</span>
        </div>
      </div>
    </div>
  );
}

export const AideonCanvasRuntime = memo(AideonCanvasRuntimeImpl) as typeof AideonCanvasRuntimeImpl;
