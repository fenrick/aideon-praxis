import type { ReactNode } from 'react';

import { cn } from '../lib/utilities';
import type { ProvenanceClassification } from './provenance-badge';
import { ProvenanceBadge } from './provenance-badge';

export interface ProvenancePanelProperties {
  readonly classification: ProvenanceClassification;
  readonly source?: string;
  readonly detail?: ReactNode;
  readonly className?: string;
}

/**
 * Inspector panel section showing content classification (Asserted/Inferred/Generated)
 * alongside optional source and explanatory detail.
 * Used wherever the origin of a value matters to the reader.
 */
export function ProvenancePanel({
  classification,
  source,
  detail,
  className,
}: ProvenancePanelProperties) {
  return (
    <div
      className={cn('border-border/60 bg-muted/10 flex flex-col gap-2 rounded-xl border p-3', className)}
    >
      <div className="flex items-center gap-2">
        <ProvenanceBadge classification={classification} />
        {source && (
          <span className="text-muted-foreground truncate text-xs">{source}</span>
        )}
      </div>
      {detail && (
        <div className="text-muted-foreground text-xs leading-relaxed">{detail}</div>
      )}
    </div>
  );
}
