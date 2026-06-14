import { withThemeByClassName } from '@storybook/addon-themes';
import type { Preview } from '@storybook/nextjs-vite';
import { ThemeProvider } from 'next-themes';
import React from 'react';

import { ColorThemeProvider } from '../src/design-system/theme/color-theme';
import '../src/styles.css';

function DesignSystemDecorator({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      <ColorThemeProvider>
        <div className="min-h-16 p-4">{children}</div>
      </ColorThemeProvider>
    </ThemeProvider>
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
