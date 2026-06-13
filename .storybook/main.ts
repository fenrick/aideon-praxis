import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  stories: [
    '../src/**/*.stories.@(ts|tsx)',
    '../src/**/*.mdx',
  ],

  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
    '@storybook/addon-mcp',
  ],

  framework: {
    name: '@storybook/nextjs',
    options: {},
  },

  docs: {
    autodocs: 'tag',
  },

  typescript: {
    // react-docgen-typescript gives more accurate prop tables (includes JSDoc descriptions)
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      shouldRemoveUndefinedFromOptional: true,
      propFilter: (prop) => {
        // Exclude DOM/HTML inherited props to keep prop tables focused
        if (prop.parent) {
          return !prop.parent.fileName.includes('node_modules/@types/react');
        }
        return true;
      },
    },
  },

  staticDirs: ['../public'],
};

export default config;
