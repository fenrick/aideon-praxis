import path from 'node:path';
import type { StorybookConfig } from '@storybook/nextjs-vite';

const srcRoot = path.resolve(import.meta.dirname, '../src');

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],

  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
    '@storybook/addon-mcp',
    '@storybook/addon-vitest',
  ],

  framework: {
    name: '@storybook/nextjs-vite',
    options: {},
  },

  docs: {
    autodocs: 'tag',
  },

  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      shouldRemoveUndefinedFromOptional: true,
      propFilter: (prop) =>
        prop.parent ? !prop.parent.fileName.includes('node_modules/@types/react') : true,
    },
  },

  staticDirs: ['../public'],

  viteFinal: async (config) => {
    config.resolve ??= {};
    const existing = Array.isArray(config.resolve.alias)
      ? Object.fromEntries(config.resolve.alias.map((a) => [a.find, a.replacement]))
      : (config.resolve.alias ?? {});

    config.resolve.alias = {
      ...existing,
      '@': srcRoot,
      'design-system/reactflow': path.join(srcRoot, 'design-system/components'),
      'design-system': path.join(srcRoot, 'design-system'),
      aideon: path.join(srcRoot, 'aideon'),
      praxis: path.join(srcRoot, 'workspaces/praxis'),
      adapters: path.join(srcRoot, 'adapters'),
      dtos: path.join(srcRoot, 'dtos'),
      lib: path.join(srcRoot, 'lib'),
    };
    return config;
  },
};

export default config;
