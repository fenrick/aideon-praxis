import { cn } from '../lib/utilities';

export type ConfidenceTier = 'high' | 'indicative' | 'low' | 'medium';

interface ConfidenceSpec {
  readonly label: string;
  readonly className: string;
  readonly ariaLabel: string;
}

const confidenceSpecs: Record<ConfidenceTier, ConfidenceSpec> = {
  high: {
    ariaLabel: 'High confidence',
    className: 'text-status-success',
    label: 'High',
  },
  indicative: {
    ariaLabel: 'Indicative — treat as directional only',
    className: 'text-muted-foreground',
    label: 'Indicative',
  },
  low: {
    ariaLabel: 'Low confidence',
    className: 'text-status-warning',
    label: 'Low',
  },
  medium: {
    ariaLabel: 'Medium confidence',
    className: 'text-foreground',
    label: 'Medium',
  },
};

export interface ConfidenceLabelProperties {
  readonly tier: ConfidenceTier;
  readonly className?: string;
}

/**
 * Ordinal confidence label — High / Medium / Low / Indicative.
 * Uses colour for salience but label text always carries the meaning (WCAG 1.4.1).
 */
export function ConfidenceLabel({ tier, className }: ConfidenceLabelProperties) {
  const spec = confidenceSpecs[tier];
  return (
    <span
      aria-label={spec.ariaLabel}
      className={cn('text-xs font-medium', spec.className, className)}
    >
      {spec.label}
    </span>
  );
}
