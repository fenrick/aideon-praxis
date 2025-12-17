import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
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
      { find: 'react', replacement: resolve(__dirname, 'node_modules/react') },
      { find: 'react-dom', replacement: resolve(__dirname, 'node_modules/react-dom') },
    ],
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true,
    allowedHosts: true,
  },
  preview: { host: '0.0.0.0', port: 5000, strictPort: true },
});
