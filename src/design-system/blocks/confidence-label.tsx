import { useTranslations } from 'next-intl';

import { cn } from '../lib/utilities';

export type ConfidenceTier = 'high' | 'indicative' | 'low' | 'medium';

interface ConfidenceSpec {
  readonly labelKey: string;
  readonly className: string;
  readonly ariaLabelKey: string;
}

const confidenceSpecs = new Map<ConfidenceTier, ConfidenceSpec>([
  ['high', { ariaLabelKey: 'highAria', className: 'text-status-success', labelKey: 'high' }],
  [
    'indicative',
    {
      ariaLabelKey: 'indicativeAria',
      className: 'text-muted-foreground',
      labelKey: 'indicative',
    },
  ],
  ['low', { ariaLabelKey: 'lowAria', className: 'text-status-warning', labelKey: 'low' }],
  ['medium', { ariaLabelKey: 'mediumAria', className: 'text-foreground', labelKey: 'medium' }],
]);

export interface ConfidenceLabelProperties {
  readonly tier: ConfidenceTier;
  readonly className?: string;
}

/**
 * Ordinal confidence label — High / Medium / Low / Indicative.
 * Uses colour for salience but label text always carries the meaning (WCAG 1.4.1).
 * @param root0
 * @param root0.tier
 * @param root0.className
 */
export function ConfidenceLabel({ tier, className }: ConfidenceLabelProperties) {
  const spec = confidenceSpecs.get(tier);
  const t = useTranslations('designSystem.confidenceLabel');
  return (
    <span
      aria-label={spec ? t(spec.ariaLabelKey) : undefined}
      className={cn('text-xs font-medium', spec?.className, className)}
    >
      {spec ? t(spec.labelKey) : undefined}
    </span>
  );
}
