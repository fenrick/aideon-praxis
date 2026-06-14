import type { LucideIcon } from 'lucide-react';
import { CircleDot, Pencil, Sparkles } from 'lucide-react';

import { cn } from '../lib/utilities';

export type ProvenanceClassification = 'asserted' | 'generated' | 'inferred';

interface ProvenanceSpec {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly className: string;
}

const provenanceSpecs = new Map<ProvenanceClassification, ProvenanceSpec>([
  [
    'asserted',
    {
      className:
        'border-provenance-asserted/20 bg-provenance-asserted-soft text-provenance-asserted',
      icon: Pencil,
      label: 'Asserted',
    },
  ],
  [
    'generated',
    {
      className:
        'border-provenance-generated/20 bg-provenance-generated-soft text-provenance-generated',
      icon: Sparkles,
      label: 'Generated',
    },
  ],
  [
    'inferred',
    {
      className:
        'border-provenance-inferred/20 bg-provenance-inferred-soft text-provenance-inferred',
      icon: CircleDot,
      label: 'Inferred',
    },
  ],
]);

export interface ProvenanceBadgeProperties {
  readonly classification: ProvenanceClassification;
  readonly className?: string;
}

/**
 * Classifies content as Asserted (human-authored), Inferred (system-derived),
 * or Generated (AI-produced). Colour is always paired with a distinct icon + label
 * so classification is never conveyed by colour alone (WCAG 1.4.1).
 * @param root0
 * @param root0.classification
 * @param root0.className
 */
export function ProvenanceBadge({ classification, className }: ProvenanceBadgeProperties) {
  const spec = provenanceSpecs.get(classification);
  const Icon = spec?.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        spec?.className,
        className,
      )}
    >
      {Icon ? <Icon aria-hidden className="h-3 w-3 shrink-0" /> : undefined}
      <span>{spec?.label}</span>
    </span>
  );
}
