import { useTranslations } from 'next-intl';

import { Card, CardContent, EmptyState } from 'design-system';

/**
 * Build a placeholder surface component for a goal destination that is not yet
 * implemented. The returned component renders a centred card announcing that the
 * surface is coming soon, using the given translation key for its name.
 * @param titleKey - Translation key for the surface name (e.g. `surfaces.review`).
 */
export function createPlaceholderSurface(titleKey: string) {
  /** The "coming soon" card for this surface. */
  function PlaceholderSurface() {
    const t = useTranslations();
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <EmptyState title={t(titleKey)} description={t('surfaces.comingSoon')} />
          </CardContent>
        </Card>
      </div>
    );
  }
  return PlaceholderSurface;
}
