import { Loader2, RefreshCcw } from 'lucide-react';

import type { ViewMetadata } from '@/praxis-api';
import { Button } from '@aideon/design-system/components/ui/button';

interface WidgetToolbarProperties {
  readonly metadata?: ViewMetadata;
  readonly fallbackTitle: string;
  readonly loading: boolean;
  readonly onRefresh: () => void;
}

export function WidgetToolbar({
  metadata,
  fallbackTitle,
  loading,
  onRefresh,
}: WidgetToolbarProperties) {
  const title = metadata?.name ?? fallbackTitle;
  const subtitle = metadata
    ? `As of ${new Date(metadata.asOf).toLocaleString()}`
    : 'Awaiting twin data';

  return (
    <div className="mb-3 flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Widget</p>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <Button variant="secondary" size="sm" disabled={loading} onClick={onRefresh}>
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCcw className="mr-2 h-4 w-4" />
        )}
        Refresh
      </Button>
    </div>
  );
}
