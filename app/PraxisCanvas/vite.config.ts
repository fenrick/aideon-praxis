import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: [
      { find: '@', replacement: resolve(__dirname, 'src') },
      { find: '@aideon/PraxisAdapters', replacement: resolve(__dirname, '../PraxisAdapters/src') },
      {
        find: '@aideon/design-system/ui',
        replacement: resolve(__dirname, '../AideonDesignSystem/dist/ui'),
      },
      {
        find: '@aideon/design-system/components/ui',
        replacement: resolve(__dirname, '../AideonDesignSystem/dist/ui'),
      },
      {
        find: '@aideon/design-system/blocks',
        replacement: resolve(__dirname, '../AideonDesignSystem/dist/blocks'),
      },
      {
        find: '@aideon/design-system/reactflow',
        replacement: resolve(__dirname, '../AideonDesignSystem/dist/reactflow'),
      },
      {
        find: '@aideon/design-system/lib/utils',
        replacement: resolve(__dirname, '../AideonDesignSystem/dist/lib/cn.js'),
      },
      {
        find: '@aideon/design-system/lib',
        replacement: resolve(__dirname, '../AideonDesignSystem/dist/lib'),
      },
      {
        find: '@aideon/design-system/styles',
        replacement: resolve(__dirname, '../AideonDesignSystem/src/styles'),
      },
    ],
  },
  server: {
    port: 1420,
    strictPort: true,
    host: '127.0.0.1',
  },
  preview: {
    port: 4173,
    strictPort: true,
    host: '127.0.0.1',
  },
});
