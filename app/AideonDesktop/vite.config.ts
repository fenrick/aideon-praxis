import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: [
      { find: '@', replacement: resolve(__dirname, './src') },
      { find: 'canvas', replacement: resolve(__dirname, './src/canvas') },
      { find: 'design-system', replacement: resolve(__dirname, './src/design-system') },
      {
        find: 'design-system/reactflow',
        replacement: resolve(__dirname, './src/design-system/components'),
      },
      { find: 'adapters', replacement: resolve(__dirname, './src/adapters') },
      { find: 'dtos', replacement: resolve(__dirname, './src/dtos') },
    ],
  },
  server: { host: '127.0.0.1', port: 1420, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
});
