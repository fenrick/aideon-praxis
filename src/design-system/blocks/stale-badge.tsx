import { Clock } from 'lucide-react';

import { cn } from '../lib/utilities';
import { StatusBadge } from './status-badge';

export interface StaleBadgeProperties {
  readonly timestamp?: string;
  readonly className?: string;
}

/**
 * Indicates data is still useful context but should not be treated as fresh truth.
 * Pairs colour with Clock icon + label (WCAG 1.4.1).
 * @param root0
 * @param root0.timestamp
 * @param root0.className
 */
export function StaleBadge({ timestamp, className }: StaleBadgeProperties) {
  return (
    <StatusBadge className={cn(className)} icon={Clock} label="Stale" tone="stale">
      {timestamp && <span className="opacity-70">{timestamp}</span>}
    </StatusBadge>
  );
}
