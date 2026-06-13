import type { ReactNode } from 'react';

import { GripHorizontal } from 'lucide-react';

import { cn } from '../lib/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import type { ArtefactFrameState } from './artefact-frame';
import { ArtefactFrame } from './artefact-frame';

export interface WidgetFrameProperties {
  readonly title: string;
  readonly state?: ArtefactFrameState;
  readonly statusSlot?: ReactNode;
  readonly actionsSlot?: ReactNode;
  readonly draggable?: boolean;
  readonly children?: ReactNode;
  readonly className?: string;
  readonly errorMessage?: string;
  readonly emptyTitle?: string;
  readonly onRetry?: () => void;
}

/**
 * Dashboard widget frame with header (title, status, actions), drag handle,
 * and built-in loading/empty/error variants via ArtefactFrame.
 */
export function WidgetFrame({
  title,
  state = 'ready',
  statusSlot,
  actionsSlot,
  draggable = false,
  children,
  className,
  errorMessage,
  emptyTitle,
  onRetry,
}: WidgetFrameProperties) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 px-4 py-3">
        {draggable && (
          <GripHorizontal
            aria-hidden
            className="text-muted-foreground h-4 w-4 shrink-0 cursor-grab"
          />
        )}
        <CardTitle className="flex-1 truncate text-sm font-medium">{title}</CardTitle>
        {statusSlot}
        {actionsSlot}
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ArtefactFrame
          emptyTitle={emptyTitle}
          errorMessage={errorMessage}
          onRetry={onRetry}
          state={state}
        >
          {children}
        </ArtefactFrame>
      </CardContent>
    </Card>
  );
}
