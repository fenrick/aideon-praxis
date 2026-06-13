import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../lib/utilities';

export interface EmptyStateProperties {
  readonly title: string;
  readonly description?: string;
  readonly icon?: LucideIcon;
  readonly action?: ReactNode;
  readonly className?: string;
}

/**
 * Empty state shown when a surface has no content to display.
 * Domain meaning (title/description/action) is always supplied by the caller.
 */
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProperties) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-12 text-center',
        className,
      )}
    >
      <Icon aria-hidden className="text-muted-foreground h-10 w-10" />
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">{title}</span>
        {description && (
          <span className="text-muted-foreground max-w-xs text-xs">{description}</span>
        )}
      </div>
      {action}
    </div>
  );
}
