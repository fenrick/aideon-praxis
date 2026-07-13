import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { getSemanticStateContract } from '../foundations/semantic-states';
import { cn } from '../lib/utilities';

export interface WarningBannerProperties {
  readonly message: string;
  readonly detail?: string;
  readonly className?: string;
}

/**
 * Advisory non-error state — surface is still usable but interpretation or next action changed.
 * Pairs colour with icon + text label (WCAG 1.4.1).
 * @param root0
 * @param root0.message
 * @param root0.detail
 * @param root0.className
 */
export function WarningBanner({ message, detail, className }: WarningBannerProperties) {
  const contract = getSemanticStateContract('warning');
  const t = useTranslations('designSystem.warningBanner');
  return (
    <output
      className={cn(
        'flex items-start gap-2 rounded-md border px-3 py-2 text-sm',
        contract.surfaceClassName,
        className,
      )}
    >
      <AlertTriangle aria-hidden className="text-status-warning mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex flex-col gap-0.5">
        <span className="text-status-warning font-medium">{t('label')}</span>
        <span>{message}</span>
        {detail && <span className="text-muted-foreground text-xs">{detail}</span>}
      </div>
    </output>
  );
}
