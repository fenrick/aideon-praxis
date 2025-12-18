import { memo } from 'react';

import { cn } from 'design-system/lib/utilities';

import type { CanvasWidgetLayout } from './types';

interface AideonCanvasRuntimeProperties<TWidget extends CanvasWidgetLayout> {
  readonly widgets: TWidget[];
  readonly renderWidget: (widget: TWidget) => React.ReactNode;
  readonly className?: string;
}

/**
 * Lay out and render multiple canvas widgets inside a responsive grid.
 * @param root0
 * @param root0.widgets
 * @param root0.renderWidget
 * @param root0.className
 * @returns Canvas runtime surface.
 */
function AideonCanvasRuntimeImpl<TWidget extends CanvasWidgetLayout>({
  widgets,
  renderWidget,
  className,
}: AideonCanvasRuntimeProperties<TWidget>) {
  return (
    <div
      className={cn(
        'relative h-full w-full overflow-hidden rounded-2xl border border-border/60 bg-card',
        className,
      )}
    >
      <div className="grid h-full grid-cols-1 gap-4 p-4 lg:grid-cols-2">
        {widgets.map((widget) => (
          <div
            key={widget.id}
            className={cn(
              widgetColumnClass(widget),
              widgetMinHeightClass(widget),
              'flex min-h-0 flex-col',
            )}
          >
            {renderWidget(widget)}
          </div>
        ))}
      </div>
    </div>
  );
}

export const AideonCanvasRuntime = memo(AideonCanvasRuntimeImpl) as typeof AideonCanvasRuntimeImpl;

/**
 *
 * @param widget
 */
function widgetColumnClass(widget: CanvasWidgetLayout): string {
  if (widget.size === 'half') {
    return 'col-span-1';
  }
  return 'col-span-1 lg:col-span-2';
}

/**
 * Provide a minimum height per widget so the canvas remains usable when the viewport is tall.
 * @param widget
 */
function widgetMinHeightClass(widget: CanvasWidgetLayout): string {
  if (widget.size === 'half') {
    return 'min-h-[420px]';
  }
  return 'min-h-[560px]';
}
