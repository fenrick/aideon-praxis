import { AlertTriangle } from 'lucide-react';

import { cn } from '../lib/utilities';
import { getSemanticStateContract } from '../foundations/semantic-states';

export interface WarningBannerProperties {
  readonly message: string;
  readonly detail?: string;
  readonly className?: string;
}

/**
 * Advisory non-error state — surface is still usable but interpretation or next action changed.
 * Pairs colour with icon + text label (WCAG 1.4.1).
 */
export function WarningBanner({ message, detail, className }: WarningBannerProperties) {
  const contract = getSemanticStateContract('warning');
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border px-3 py-2 text-sm',
        contract.surfaceClassName,
        className,
      )}
      role="status"
    >
      <AlertTriangle aria-hidden className="text-status-warning mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex flex-col gap-0.5">
        <span className="text-status-warning font-medium">Warning</span>
        <span>{message}</span>
        {detail && <span className="text-muted-foreground text-xs">{detail}</span>}
      </div>
    </div>
  );
}
