import { useTranslations } from 'next-intl';

import { useHostPlatform } from 'platform/host-platform-context';

import type { AideonCommandItem } from './command-palette';

/**
 * The canonical Add-widget command-palette entry (issue #440's third entry
 * point), calling the same `onToggleWidgetLibrary` reference the toolbar
 * button and on-canvas `+` affordance call.
 * @returns The command-palette item for Add widget.
 */
export function useAddWidgetCommand(): AideonCommandItem {
  const { onToggleWidgetLibrary } = useHostPlatform();
  const t = useTranslations('platform.toolbar');
  return {
    id: 'add-widget',
    label: t('addWidget'),
    group: 'Workspace',
    onSelect: () => {
      onToggleWidgetLibrary(true);
    },
  };
}
