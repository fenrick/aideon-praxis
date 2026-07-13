import type { ReactNode } from 'react';

import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getSemanticStateContract } from '../foundations/semantic-states';
import { cn } from '../lib/utilities';

export interface ErrorFrameProperties {
  readonly message: string;
  readonly detail?: string;
  readonly onRetry?: () => void;
  readonly className?: string;
  readonly children?: ReactNode;
}

/**
 * Wraps a failed surface with an explicit error treatment.
 * Never hides the failure — surfaces message and optional retry action.
 * Colour is paired with icon + text label (WCAG 1.4.1).
 * @param root0
 * @param root0.message
 * @param root0.detail
 * @param root0.onRetry
 * @param root0.className
 * @param root0.children
 */
export function ErrorFrame({
  message,
  detail,
  onRetry,
  className,
  children,
}: ErrorFrameProperties) {
  const contract = getSemanticStateContract('error');
  const t = useTranslations('designSystem.errorFrame');
  return (
    <div
      className={cn(
        'flex flex-col items-start gap-3 rounded-lg border p-4',
        contract.surfaceClassName,
        className,
      )}
      role="alert"
    >
      <div className="flex items-start gap-2">
        <AlertCircle aria-hidden className="text-status-error mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex flex-col gap-0.5">
          <span className="text-status-error text-sm font-medium">{t('label')}</span>
          <span className="text-sm">{message}</span>
          {detail && <span className="text-muted-foreground text-xs">{detail}</span>}
        </div>
      </div>
      {children}
      {onRetry && (
        <button
          className="text-status-error text-xs underline underline-offset-2 hover:no-underline"
          onClick={onRetry}
          type="button"
        >
          {t('retry')}
        </button>
      )}
    </div>
  );
}
