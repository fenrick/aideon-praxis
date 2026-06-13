import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

const srcRoot = path.resolve(import.meta.dirname, 'src');

const alias = [
  { find: '@', replacement: srcRoot },
  { find: 'aideon', replacement: path.join(srcRoot, 'aideon') },
  { find: 'praxis', replacement: path.join(srcRoot, 'workspaces/praxis') },
  {
    find: 'design-system/reactflow',
    replacement: path.join(srcRoot, 'design-system/components'),
  },
  { find: 'design-system', replacement: path.join(srcRoot, 'design-system') },
  { find: 'adapters', replacement: path.join(srcRoot, 'adapters') },
  { find: 'dtos', replacement: path.join(srcRoot, 'dtos') },
  { find: 'lib', replacement: path.join(srcRoot, 'lib') },
];

export default defineConfig({
  resolve: { alias },
  plugins: [
    storybookTest({
      configDir: path.resolve(import.meta.dirname, '.storybook'),
    }),
  ],
  test: {
    name: 'storybook',
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
    setupFiles: ['.storybook/vitest.setup.ts'],
  },
});
