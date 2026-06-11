'use client';

import { ThemeProvider } from 'next-themes';

import { Toaster } from '../src/design-system/components/ui/sonner';
import { TooltipProvider } from '../src/design-system/components/ui/tooltip';
import { ColorThemeProvider } from '../src/design-system/theme/color-theme';
import { ErrorBoundary } from '../src/error-boundary';

/**
 * Compose theme, tooltip, error boundary, and toaster providers for the UI shell.
 * @param root0 - Provider props.
 * @param root0.children - Child nodes.
 */
export function AppProviders({ children }: { readonly children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ColorThemeProvider>
        <TooltipProvider>
          <ErrorBoundary>
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
