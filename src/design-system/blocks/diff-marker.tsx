import { cn } from '../lib/utilities';

export type DiffOperation = 'added' | 'changed' | 'removed' | 'unchanged';

interface DiffSpec {
  readonly label: string;
  readonly className: string;
  readonly barClassName: string;
}

const diffSpecs: Record<DiffOperation, DiffSpec> = {
  added: {
    barClassName: 'bg-status-success',
    className: 'text-status-success',
    label: 'Added',
  },
  changed: {
    barClassName: 'bg-status-warning',
    className: 'text-status-warning',
    label: 'Changed',
  },
  removed: {
    barClassName: 'bg-status-error',
    className: 'text-status-error',
    label: 'Removed',
  },
  unchanged: {
    barClassName: 'bg-border',
    className: 'text-muted-foreground',
    label: 'Unchanged',
  },
};

export interface DiffMarkerProperties {
  readonly operation: DiffOperation;
  readonly showLabel?: boolean;
  readonly className?: string;
}

/**
 * Visual diff marker for inspector panes showing delta between two states.
 * The coloured bar is always accompanied by a text label (WCAG 1.4.1).
 */
export function DiffMarker({
  operation,
  showLabel = true,
  className,
}: DiffMarkerProperties) {
  const spec = diffSpecs[operation];
  return (
    <span
      aria-label={spec.label}
      className={cn('inline-flex items-center gap-1.5', spec.className, className)}
    >
      <span
        aria-hidden
        className={cn('inline-block h-3.5 w-1 shrink-0 rounded-full', spec.barClassName)}
      />
      {showLabel && <span className="text-xs font-medium">{spec.label}</span>}
    </span>
  );
}
