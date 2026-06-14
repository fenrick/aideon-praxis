import type { ReactNode } from 'react';

import { cn } from '../lib/utilities';

export interface PropertyItem {
  readonly key: string;
  readonly label: string;
  readonly value: ReactNode;
  readonly badge?: ReactNode;
}

export interface PropertyListProperties {
  readonly items: readonly PropertyItem[];
  readonly className?: string;
}

export interface PropertyRowProperties {
  readonly label: string;
  readonly children: ReactNode;
  readonly badge?: ReactNode;
  readonly className?: string;
}

/**
 * Renders a single key-value row for use in an inspector pane.
 * @param root0
 * @param root0.label
 * @param root0.children
 * @param root0.badge
 * @param root0.className
 */
export function PropertyRow({ label, children, badge, className }: PropertyRowProperties) {
  return (
    <div className={cn('grid grid-cols-[1fr_auto] items-start gap-x-3 gap-y-0.5', className)}>
      <span className="text-muted-foreground col-start-1 truncate text-xs">{label}</span>
      {badge && <span className="col-start-2 row-span-2 self-center">{badge}</span>}
      <div className="col-start-1 text-sm">{children}</div>
    </div>
  );
}

/**
 * Renders a list of labelled key-value pairs in the inspector.
 * Each item's value may be any ReactNode — plain text, badges, or formatted output.
 * @param root0
 * @param root0.items
 * @param root0.className
 */
export function PropertyList({ items, className }: PropertyListProperties) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {items.map((item) => (
        <PropertyRow badge={item.badge} key={item.key} label={item.label}>
          {item.value}
        </PropertyRow>
      ))}
    </div>
  );
}
