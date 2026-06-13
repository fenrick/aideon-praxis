import type { Preview } from '@storybook/nextjs';
import { withThemeByClassName } from '@storybook/addon-themes';
import { ThemeProvider } from 'next-themes';
import React from 'react';

import '../src/styles.css';
import { ColorThemeProvider } from '../src/design-system/theme/color-theme';

/**
 * Wrap each story in the app providers required for the design system:
 * - ThemeProvider (next-themes) for light/dark mode
 * - ColorThemeProvider for the colour-theme token overrides
 */
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
      themes: {
        light: '',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
  ],

  parameters: {
    layout: 'centered',

    backgrounds: {
      disable: true, // themes addon handles backgrounds via CSS
    },

    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /date$/i,
      },
    },

    nextjs: {
      appDirectory: true,
    },
  },
};

export default preview;
