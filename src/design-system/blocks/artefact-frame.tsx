import type { ReactNode } from 'react';

import { cn } from '../lib/utilities';
import { Skeleton } from '../components/ui/skeleton';
import { EmptyState } from './empty-state';
import { ErrorFrame } from './error-frame';

export type ArtefactFrameState = 'empty' | 'error' | 'loading' | 'ready';

export interface ArtefactFrameProperties {
  readonly state?: ArtefactFrameState;
  readonly loadingRows?: number;
  readonly emptyTitle?: string;
  readonly emptyDescription?: string;
  readonly errorMessage?: string;
  readonly onRetry?: () => void;
  readonly children?: ReactNode;
  readonly className?: string;
}

/**
 * Base frame for all artefact forms (view, catalogue, matrix, map, report, page).
 * Provides loading/empty/error shells; ready state renders children.
 * Domain content is always caller-supplied through slots.
 */
export function ArtefactFrame({
  state = 'ready',
  loadingRows = 4,
  emptyTitle = 'No content',
  emptyDescription,
  errorMessage = 'Failed to load',
  onRetry,
  children,
  className,
}: ArtefactFrameProperties) {
  if (state === 'loading') {
    return (
      <div
        aria-busy="true"
        aria-label="Loading"
        className={cn('flex flex-col gap-2 p-4', className)}
      >
        {Array.from({ length: loadingRows }, (_, i) => (
          <Skeleton className="h-8 w-full" key={i} />
        ))}
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={cn('p-4', className)}>
        <ErrorFrame message={errorMessage} onRetry={onRetry} />
      </div>
    );
  }

  if (state === 'empty') {
    return (
      <div className={cn('p-4', className)}>
        <EmptyState description={emptyDescription} title={emptyTitle} />
      </div>
    );
  }

  return <div className={cn(className)}>{children}</div>;
}
