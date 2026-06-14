import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import type { SemanticStateTone } from '../foundations/semantic-states';
import { getSemanticStateContract } from '../foundations/semantic-states';
import { cn } from '../lib/utilities';

export interface StatusBadgeProperties {
  readonly tone: SemanticStateTone;
  readonly label: string;
  readonly icon?: LucideIcon;
  readonly className?: string;
  readonly children?: ReactNode;
}

/**
 * Generic status badge backed by the semantic-state contract.
 * Colour is always paired with an icon + label (WCAG 1.4.1).
 * @param root0
 * @param root0.tone
 * @param root0.label
 * @param root0.icon
 * @param root0.className
 * @param root0.children
 */
export function StatusBadge({
  tone,
  label,
  icon: Icon,
  className,
  children,
}: StatusBadgeProperties) {
  const contract = getSemanticStateContract(tone);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        contract.badgeClassName,
        className,
      )}
    >
      {Icon && <Icon aria-hidden className="h-3 w-3 shrink-0" />}
      <span>{label}</span>
      {children}
    </span>
  );
}
