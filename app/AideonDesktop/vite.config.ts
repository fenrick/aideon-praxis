import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'node:path';

export default defineConfig({
  plugins: [tailwindcss(), react(), tsconfigPaths()],
  resolve: {
    alias: [
      {
        find: '@aideon/design-system/styles/globals.css',
        replacement: path.resolve(__dirname, '../AideonDesignSystem/src/styles/globals.css'),
      },
      {
        find: '@/lib/utils',
        replacement: path.resolve(__dirname, '../AideonDesignSystem/src/lib/utils.ts'),
      },
      {
        find: /^@\/components\/ui\/(.*)$/,
        replacement: path.resolve(__dirname, '../AideonDesignSystem/src/components/ui/$1'),
      },
    ],
  },
  server: {
    host: '127.0.0.1',
    port: 1420,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
});
