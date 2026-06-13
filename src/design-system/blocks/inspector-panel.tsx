import type { ReactNode } from 'react';

import { cn } from '../lib/utilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';

export interface InspectorPanelProperties {
  readonly title: string;
  readonly description?: string;
  readonly badge?: ReactNode;
  readonly footer?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * Container for the right-hand inspector pane.
 * Supplies the title, optional badge, scroll area, and footer slot.
 * Domain meaning (title text, badge label, content) is caller-supplied.
 */
export function InspectorPanel({
  title,
  description,
  badge,
  footer,
  children,
  className,
}: InspectorPanelProperties) {
  return (
    <Card
      className={cn(
        'border-border/60 bg-card/90 flex min-h-full flex-col shadow-sm',
        className,
      )}
    >
      <CardHeader className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {badge}
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>

      <ScrollArea className="relative flex-1 overflow-hidden">
        <CardContent className="space-y-4 p-4">{children}</CardContent>
      </ScrollArea>

      {footer}
    </Card>
  );
}
