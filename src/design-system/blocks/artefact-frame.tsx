import type { ReactNode } from 'react';

import { Skeleton } from '../components/ui/skeleton';
import { cn } from '../lib/utilities';
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
 * @param root0
 * @param root0.state
 * @param root0.loadingRows
 * @param root0.emptyTitle
 * @param root0.emptyDescription
 * @param root0.errorMessage
 * @param root0.onRetry
 * @param root0.children
 * @param root0.className
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
        {Array.from({ length: loadingRows }, (_, index) => (
          <Skeleton className="h-8 w-full" key={index} />
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
