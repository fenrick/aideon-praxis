import { CircleDashed } from 'lucide-react';

import { cn } from '../lib/utilities';
import { getSemanticStateContract } from '../foundations/semantic-states';

export interface PartialBannerProperties {
  readonly message: string;
  readonly className?: string;
}

/**
 * Warns that part of the requested result is present and the missing part matters.
 * Used for bounded/sampled results. Pairs colour with icon + text (WCAG 1.4.1).
 */
export function PartialBanner({ message, className }: PartialBannerProperties) {
  const contract = getSemanticStateContract('partial');
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border px-3 py-2 text-sm',
        contract.surfaceClassName,
        className,
      )}
      role="status"
    >
      <CircleDashed aria-hidden className="text-status-partial mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex flex-col gap-0.5">
        <span className="text-status-partial font-medium">Partial result</span>
        <span>{message}</span>
      </div>
    </div>
  );
}
