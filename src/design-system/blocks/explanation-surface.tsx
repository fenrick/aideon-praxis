import type { ReactNode } from 'react';

import { cn } from '../lib/utilities';

export interface ExplanationSurfaceProperties {
  readonly heading?: string;
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * Explanation/rationale surface shown inside an inspector pane.
 * Renders as a subdued inset block — visually distinct from editable fields.
 * The caller supplies all domain meaning through heading and children.
 * @param root0
 * @param root0.heading
 * @param root0.children
 * @param root0.className
 */
export function ExplanationSurface({ heading, children, className }: ExplanationSurfaceProperties) {
  return (
    <div
      className={cn(
        'border-border/60 bg-muted/20 rounded-xl border px-3 py-2.5 text-sm',
        className,
      )}
    >
      {heading && (
        <p className="text-muted-foreground mb-1 text-xs font-medium tracking-widest uppercase">
          {heading}
        </p>
      )}
      <div className="text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}
