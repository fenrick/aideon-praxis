'use client';

import { useTranslations } from 'next-intl';
import { ThemeProvider } from 'next-themes';

import { Toaster, TooltipProvider } from 'design-system';
import { ColorThemeProvider } from 'design-system/theme/color-theme';
import { ErrorBoundary } from 'error-boundary';

/**
 * Compose theme, tooltip, error boundary, and toaster providers for the UI shell.
 * @param root0 - Provider props.
 * @param root0.children - Child nodes.
 */
export function AppProviders({ children }: { readonly children: React.ReactNode }) {
  const t = useTranslations('app.errorBoundary');

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ColorThemeProvider>
        <TooltipProvider>
          <ErrorBoundary
            labels={{
              title: t('title'),
              description: t('description'),
              renderError: t('renderError'),
              devDetails: t('devDetails'),
              fatalError: t('fatalError'),
              reload: t('reload'),
              copyDetails: t('copyDetails'),
            }}
          >
            <>
              {children}
              <Toaster />
            </>
          </ErrorBoundary>
        </TooltipProvider>
      </ColorThemeProvider>
    </ThemeProvider>
  );
}
