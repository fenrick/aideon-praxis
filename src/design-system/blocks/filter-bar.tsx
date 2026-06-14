import type { ReactNode } from 'react';

import { Input } from '../components/ui/input';
import { cn } from '../lib/utilities';

export interface FilterBarProperties {
  readonly placeholder?: string;
  readonly value?: string;
  readonly onValueChange?: (value: string) => void;
  readonly actionsSlot?: ReactNode;
  readonly className?: string;
}

/**
 * Filter bar composing a search input with optional action slots.
 * Used above DataTable and catalogue blocks. Domain labels supplied by caller.
 * @param root0
 * @param root0.placeholder
 * @param root0.value
 * @param root0.onValueChange
 * @param root0.actionsSlot
 * @param root0.className
 */
export function FilterBar({
  placeholder = 'Filter…',
  value,
  onValueChange,
  actionsSlot,
  className,
}: FilterBarProperties) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Input
        className="flex-1"
        onChange={(event) => onValueChange?.(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
      {actionsSlot}
    </div>
  );
}
