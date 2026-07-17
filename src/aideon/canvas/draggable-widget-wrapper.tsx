import type { Dispatch, ReactNode, RefObject, SetStateAction } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { cn } from 'design-system/lib/utilities';

const DEFAULT_WIDGET_WIDTH = 580;
const DEFAULT_WIDGET_HEIGHT = 500;
const MINIMUM_WIDGET_SIZE = 300;

interface Point {
  readonly x: number;
  readonly y: number;
}

interface Size {
  readonly w: number;
  readonly h: number;
}

interface InteractionState {
  readonly isDragging: boolean;
  readonly isResizing: boolean;
}

type InteractionKind = 'drag' | 'resize';

interface BeginInteractionContext {
  readonly lastPointer: RefObject<Point>;
  readonly setIsDragging: Dispatch<SetStateAction<boolean>>;
  readonly setIsResizing: Dispatch<SetStateAction<boolean>>;
}

interface PointerMoveContext {
  readonly interaction: InteractionState;
  readonly scale: number;
  readonly lastPointer: RefObject<Point>;
  readonly setPosition: Dispatch<SetStateAction<Point>>;
  readonly setSize: Dispatch<SetStateAction<Size>>;
}

interface FinishInteractionContext {
  readonly interaction: InteractionState;
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly onDragEnd: (id: string, x: number, y: number) => void;
  readonly onResizeEnd?: (id: string, width: number, height: number) => void;
  readonly setIsDragging: Dispatch<SetStateAction<boolean>>;
  readonly setIsResizing: Dispatch<SetStateAction<boolean>>;
}

/**
 * Determines whether a pointer target begins a resize or a drag interaction.
 * @param target The element that received the pointer event.
 */
function detectInteractionKind(target: HTMLElement): InteractionKind | undefined {
  if (target.closest('.resize-handle')) {
    return 'resize';
  }
  if (target.closest('.cursor-grab')) {
    return 'drag';
  }
  return undefined;
}

/**
 * Converts a pointer event into a canvas-space delta from the last reference.
 * @param event The active pointer event.
 * @param reference The previous pointer position in client space.
 * @param scale The current canvas zoom scale.
 */
function pointerDelta(event: React.PointerEvent, reference: Point, scale: number): Point {
  return {
    x: (event.clientX - reference.x) / scale,
    y: (event.clientY - reference.y) / scale,
  };
}

/**
 * Applies a delta to a position.
 * @param position The current position.
 * @param delta The movement to apply.
 */
function movePosition(position: Point, delta: Point): Point {
  return { x: position.x + delta.x, y: position.y + delta.y };
}

/**
 * Applies a delta to a size, clamping to the minimum widget size.
 * @param size The current size.
 * @param delta The size change to apply.
 */
function resizeSize(size: Size, delta: Point): Size {
  return {
    w: Math.max(MINIMUM_WIDGET_SIZE, size.w + delta.x),
    h: Math.max(MINIMUM_WIDGET_SIZE, size.h + delta.y),
  };
}

/**
 * Starts a drag or resize interaction when the pointer lands on a handle.
 * @param event The pointer-down event.
 * @param context The refs and state setters used to begin the interaction.
 */
function beginInteraction(event: React.PointerEvent, context: BeginInteractionContext): void {
  const target = event.target as HTMLElement;
  const kind = detectInteractionKind(target);
  if (kind === undefined) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  context.lastPointer.current = { x: event.clientX, y: event.clientY };
  target.setPointerCapture(event.pointerId);

  if (kind === 'resize') {
    context.setIsResizing(true);
    return;
  }
  context.setIsDragging(true);
}

/**
 * Updates the position or size while a drag or resize interaction is active.
 * @param event The pointer-move event.
 * @param context The interaction state, scale, refs, and state setters.
 */
function applyPointerMove(event: React.PointerEvent, context: PointerMoveContext): void {
  const { interaction, scale, lastPointer, setPosition, setSize } = context;
  if (!interaction.isDragging && !interaction.isResizing) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const delta = pointerDelta(event, lastPointer.current, scale);
  lastPointer.current = { x: event.clientX, y: event.clientY };

  if (interaction.isDragging) {
    setPosition((previous) => movePosition(previous, delta));
    return;
  }
  setSize((previous) => resizeSize(previous, delta));
}

/**
 * Ends the active interaction and reports the final position or size.
 * @param event The pointer-up event.
 * @param context The interaction state, identifiers, values, and callbacks.
 */
function finishInteraction(event: React.PointerEvent, context: FinishInteractionContext): void {
  const { interaction } = context;
  if (!interaction.isDragging && !interaction.isResizing) {
    return;
  }

  (event.target as HTMLElement).releasePointerCapture(event.pointerId);

  if (interaction.isDragging) {
    context.setIsDragging(false);
    context.onDragEnd(context.id, context.x, context.y);
    return;
  }
  context.setIsResizing(false);
  context.onResizeEnd?.(context.id, context.width, context.height);
}

interface UseDraggableWidgetParameters {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly onDragEnd: (id: string, x: number, y: number) => void;
  readonly onResizeEnd?: (id: string, width: number, height: number) => void;
}

interface DraggableWidgetRuntime {
  readonly isDragging: boolean;
  readonly isResizing: boolean;
  readonly size: Size;
  readonly transform: string;
  readonly handlePointerDown: (event: React.PointerEvent) => void;
  readonly handlePointerMove: (event: React.PointerEvent) => void;
  readonly handlePointerUp: (event: React.PointerEvent) => void;
}

/**
 * Owns the drag/resize state, prop synchronisation, and pointer handlers for a widget.
 * @param parameters The widget identity, geometry, scale, and completion callbacks.
 */
function useDraggableWidget(parameters: UseDraggableWidgetParameters): DraggableWidgetRuntime {
  const { id, x, y, width, height, scale, onDragEnd, onResizeEnd } = parameters;

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const [position, setPosition] = useState<Point>({ x, y });
  const [size, setSize] = useState<Size>({ w: width, h: height });

  const lastPointerReference = useRef<Point>({ x: 0, y: 0 });

  useEffect(() => {
    if (isDragging) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      setPosition({ x, y });
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [isDragging, x, y]);

  useEffect(() => {
    if (isResizing) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      setSize({ w: width, h: height });
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [height, isResizing, width]);

  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    beginInteraction(event, {
      lastPointer: lastPointerReference,
      setIsDragging,
      setIsResizing,
    });
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      applyPointerMove(event, {
        interaction: { isDragging, isResizing },
        scale,
        lastPointer: lastPointerReference,
        setPosition,
        setSize,
      });
    },
    [isDragging, isResizing, scale],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent) => {
      finishInteraction(event, {
        interaction: { isDragging, isResizing },
        id,
        x: position.x,
        y: position.y,
        width: size.w,
        height: size.h,
        onDragEnd,
        onResizeEnd,
        setIsDragging,
        setIsResizing,
      });
    },
    [id, isDragging, isResizing, position.x, position.y, size.w, size.h, onDragEnd, onResizeEnd],
  );

  const transform = useMemo(() => {
    const xValue = position.x.toString();
    const yValue = position.y.toString();
    return `translate(${xValue}px, ${yValue}px)`;
  }, [position.x, position.y]);

  return {
    isDragging,
    isResizing,
    size,
    transform,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}

interface DraggableWidgetWrapperProperties {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width?: number;
  readonly height?: number;
  readonly scale: number;
  readonly children: ReactNode;
  readonly onDragEnd: (id: string, x: number, y: number) => void;
  readonly onResizeEnd?: (id: string, width: number, height: number) => void;
}

/**
 * Positions a widget on the canvas and adds drag/resize behaviour.
 * @param root0
 * @param root0.id
 * @param root0.x
 * @param root0.y
 * @param root0.width
 * @param root0.height
 * @param root0.scale
 * @param root0.children
 * @param root0.onDragEnd
 * @param root0.onResizeEnd
 */
export function DraggableWidgetWrapper({
  id,
  x,
  y,
  width = DEFAULT_WIDGET_WIDTH,
  height = DEFAULT_WIDGET_HEIGHT,
  scale,
  children,
  onDragEnd,
  onResizeEnd,
}: DraggableWidgetWrapperProperties) {
  const {
    isDragging,
    isResizing,
    size,
    transform,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useDraggableWidget({ id, x, y, width, height, scale, onDragEnd, onResizeEnd });

  return (
    <div
      className={cn(
        'group bg-card absolute flex flex-col rounded-xl shadow-sm transition-shadow',
        isDragging ? 'z-50 cursor-grabbing shadow-xl' : 'z-10 hover:shadow-md',
        isResizing ? 'z-50 cursor-se-resize' : undefined,
      )}
      style={{
        transform,
        width: size.w,
        height: size.h,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {children}

      {/* Resize Handle */}
      <div className="resize-handle absolute right-0 bottom-0 h-6 w-6 cursor-se-resize p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100">
        <div className="border-muted-foreground/40 h-full w-full rounded-br-lg border-r-2 border-b-2" />
      </div>
    </div>
  );
}
