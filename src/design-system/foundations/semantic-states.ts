export const semanticStateKeys = [
  'info',
  'warning',
  'partial',
  'stale',
  'error',
  'success',
] as const;

export type SemanticStateTone = (typeof semanticStateKeys)[number];

interface SemanticStateContract {
  badgeClassName: string;
  description: string;
  label: string;
  surfaceClassName: string;
}

export const semanticStateContracts: Record<SemanticStateTone, SemanticStateContract> = {
  error: {
    badgeClassName: 'border-status-error/20 bg-status-error-soft text-status-error',
    description: 'Do not hide a broken result. Make the failure explicit and actionable.',
    label: 'Error',
    surfaceClassName: 'border-status-error/22 bg-status-error-soft',
  },
  info: {
    badgeClassName: 'border-status-info/20 bg-status-info-soft text-status-info',
    description: 'Use for accepted, loading, and in-progress work that is valid but unsettled.',
    label: 'Info',
    surfaceClassName: 'border-status-info/20 bg-status-info-soft',
  },
  partial: {
    badgeClassName: 'border-status-partial/20 bg-status-partial-soft text-status-partial',
    description: 'Use when part of the requested result is present and the missing part matters.',
    label: 'Partial',
    surfaceClassName: 'border-status-partial/20 bg-status-partial-soft',
  },
  stale: {
    badgeClassName: 'border-status-stale/20 bg-status-stale-soft text-status-stale',
    description:
      'Use when the result is still useful context but should not be treated as fresh truth.',
    label: 'Stale',
    surfaceClassName: 'border-status-stale/18 bg-status-stale-soft',
  },
  success: {
    badgeClassName: 'border-status-success/20 bg-status-success-soft text-status-success',
    description: 'Use for settled work that is safe to promote or hand off.',
    label: 'Success',
    surfaceClassName: 'border-status-success/20 bg-status-success-soft',
  },
  warning: {
    badgeClassName: 'border-status-warning/20 bg-status-warning-soft text-status-warning',
    description: 'Use when the surface is still usable but interpretation or next action changed.',
    label: 'Warning',
    surfaceClassName: 'border-status-warning/20 bg-status-warning-soft',
  },
};

/**
 *
 * @param value
 */
export function isSemanticStateTone(value: string): value is SemanticStateTone {
  return semanticStateKeys.includes(value as SemanticStateTone);
}

/**
 *
 * @param tone
 */
export function getSemanticStateContract(tone: SemanticStateTone) {
  return semanticStateContracts[tone];
}

/**
 *
 * @param value
 */
export function resolveSemanticStateContract(value: string) {
  return isSemanticStateTone(value) ? semanticStateContracts[value] : undefined;
}
