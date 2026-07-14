import { useTranslations } from 'next-intl';

import { Loader2, RefreshCcw } from 'design-system/icons';

import { Button } from 'design-system';
import type { ViewMetadata } from 'praxis/praxis-api';

interface WidgetToolbarProperties {
  readonly metadata?: ViewMetadata;
  readonly fallbackTitle: string;
  readonly loading: boolean;
  readonly onRefresh: () => void;
}

/**
 * Standard toolbar for widgets showing title, timestamp, and refresh.
 * @param root0 - Toolbar properties.
 * @param root0.metadata - Optional view metadata to display.
 * @param root0.fallbackTitle - Title when metadata is missing.
 * @param root0.loading - Whether a refresh is in progress.
 * @param root0.onRefresh - Refresh handler.
 * @returns Toolbar element.
 */
export function WidgetToolbar({
  metadata,
  fallbackTitle,
  loading,
  onRefresh,
}: WidgetToolbarProperties) {
  const t = useTranslations('engines.praxis.widgets.toolbar');
  const title = metadata?.name ?? fallbackTitle;
  const subtitle = metadata
    ? t('asOf', { timestamp: formatAsOf(metadata.asOf) })
    : t('awaitingTwinData');

  return (
    <div className="mb-3 flex items-center justify-between">
      <div>
        <p className="text-muted-foreground text-xs tracking-[0.35em] uppercase">{t('eyebrow')}</p>
        <p className="text-foreground text-sm font-medium">{title}</p>
        <p className="text-muted-foreground text-xs">{subtitle}</p>
      </div>
      <Button variant="secondary" size="sm" disabled={loading} onClick={onRefresh}>
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCcw className="mr-2 h-4 w-4" />
        )}
        {t('refresh')}
      </Button>
    </div>
  );
}

/**
 * Format an "as-of" identifier for display. Accepts timestamps or commit-like identifiers.
 * @param asOf - Timestamp or commit identifier.
 */
function formatAsOf(asOf: string): string {
  const parsed = new Date(asOf);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleString();
  }
  if (asOf.length > 16) {
    return `${asOf.slice(0, 8)}…`;
  }
  return asOf;
}
