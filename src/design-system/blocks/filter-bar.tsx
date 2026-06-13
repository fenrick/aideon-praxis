import type { ReactNode } from 'react';

import { cn } from '../lib/utilities';
import { Input } from '../components/ui/input';

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
        onChange={(e) => onValueChange?.(e.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
      {actionsSlot}
    </div>
  );
}
