import { RefreshCw } from 'lucide-react';

import { cn } from '../lib/utilities';
import { getSemanticStateContract } from '../foundations/semantic-states';

export interface RebuildingIndicatorProperties {
  readonly label?: string;
  readonly className?: string;
}

/**
 * Indicates in-progress indexing or rebuild.
 * The spinning icon is a visual cue; the text label ensures colour-independence (WCAG 1.4.1).
 * Under reduced-motion the spin animation is suppressed via the motion token.
 */
export function RebuildingIndicator({
  label = 'Rebuilding…',
  className,
}: RebuildingIndicatorProperties) {
  const contract = getSemanticStateContract('info');
  return (
    <div
      aria-label={label}
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
        contract.badgeClassName,
        className,
      )}
      role="status"
    >
      <RefreshCw
        aria-hidden
        className="h-3 w-3 shrink-0 motion-safe:animate-spin"
      />
      <span>{label}</span>
    </div>
  );
}
