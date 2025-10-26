import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  // Use relative paths so file:// loads work inside Electron without a dev server
  base: './',
  plugins: [
    svelte({
      compilerOptions: {
        // Svelte 5 runes + HMR in core
        runes: true,
        hmr: true,
      },
    }),
  ],
  root: path.resolve(__dirname, 'src/renderer'),
  publicDir: path.resolve(__dirname, 'public'),
  resolve: {
    // Ensure browser/client condition in dev so client runtime is bundled
    conditions: ['browser', 'development'],
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    sourcemap: true,
  },
});
