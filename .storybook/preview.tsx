import { withThemeByClassName } from '@storybook/addon-themes';
import type { Preview } from '@storybook/nextjs-vite';
import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from 'next-themes';
import React from 'react';
import { sb } from 'storybook/test';

import enMessages from '../locales/en.json';

// The host IPC boundary is mocked in stories: components render against
// story-provided responses, never a live Tauri host.
sb.mock(import('../src/adapters/ipc.ts'), { spy: true });
sb.mock(import('../src/adapters/workspace-events.ts'), { spy: true });
sb.mock(import('@tauri-apps/api/event'), { spy: true });

import { ColorThemeProvider } from '../src/design-system/theme/color-theme';
// globals.css (design-system base) before styles.css (font-role overrides),
// matching the load order in src/app/layout.tsx. Both go through the JS
// resolver so the paths behave identically under Vite and Turbopack.
import '../src/design-system/styles/globals.css';
import '../src/styles.css';

function DesignSystemDecorator({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
        <ColorThemeProvider>
          <div className="min-h-16 p-4">{children}</div>
        </ColorThemeProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}

const preview: Preview = {
  decorators: [
    (Story) => (
      <DesignSystemDecorator>
        <Story />
      </DesignSystemDecorator>
    ),
    withThemeByClassName({
      themes: { light: '', dark: 'dark' },
      defaultTheme: 'light',
    }),
  ],

  parameters: {
    layout: 'centered',
    backgrounds: { disable: true },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /date$/i,
      },
    },
    nextjs: { appDirectory: true },
  },
};

export default preview;
