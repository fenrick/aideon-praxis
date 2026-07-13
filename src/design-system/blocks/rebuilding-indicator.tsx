import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { getSemanticStateContract } from '../foundations/semantic-states';
import { cn } from '../lib/utilities';

export interface RebuildingIndicatorProperties {
  readonly label?: string;
  readonly className?: string;
}

/**
 * Indicates in-progress indexing or rebuild.
 * The spinning icon is a visual cue; the text label ensures colour-independence (WCAG 1.4.1).
 * Under reduced-motion the spin animation is suppressed via the motion token.
 * @param root0
 * @param root0.label
 * @param root0.className
 */
export function RebuildingIndicator({ label, className }: RebuildingIndicatorProperties) {
  const contract = getSemanticStateContract('info');
  const t = useTranslations('designSystem.rebuildingIndicator');
  const resolvedLabel = label ?? t('label');
  return (
    <output
      aria-label={resolvedLabel}
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
        contract.badgeClassName,
        className,
      )}
    >
      <RefreshCw aria-hidden className="h-3 w-3 shrink-0 motion-safe:animate-spin" />
      <span>{resolvedLabel}</span>
    </output>
  );
}
