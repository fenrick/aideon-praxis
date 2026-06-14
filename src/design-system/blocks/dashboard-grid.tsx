import type { ReactNode } from 'react';

import { cn } from '../lib/utilities';

export interface DashboardGridProperties {
  readonly children: ReactNode;
  readonly columns?: 1 | 2 | 3 | 4;
  readonly className?: string;
}

/**
 * Responsive grid container for WidgetFrame tiles.
 * Defaults to 2 columns; caller specifies layout through the `columns` prop.
 * @param root0
 * @param root0.children
 * @param root0.columns
 * @param root0.className
 */
export function DashboardGrid({ children, columns = 2, className }: DashboardGridProperties) {
  return (
    <div
      className={cn(
        'grid gap-4',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        className,
      )}
    >
      {children}
    </div>
  );
}
