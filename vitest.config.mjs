import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      // Stubs to keep tests offline and avoid Vite resolution failures
      '@fluentui/web-components': path.resolve(
        __dirname,
        'app/desktop/tests/stubs/fluentui.web-components.ts',
      ),
      '@tauri-apps/api/core': path.resolve(
        __dirname,
        'app/desktop/tests/stubs/tauri-api-core.ts',
      ),
      '@tauri-apps/plugin-log': path.resolve(
        __dirname,
        'app/desktop/tests/stubs/tauri-plugin-log.ts',
      ),
    },
  },
  plugins: [
    svelte({
      compilerOptions: {
        runes: true,
        hmr: false,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['app/desktop/tests/setup.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov', 'html'],
      reportOnFailure: true,
      include: ['app/desktop/src/lib/**/*.{ts,tsx}', 'app/adapters/src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.d.ts',
        '**/*.test.*',
        'app/**/dist/**',
        'scripts/**',
        'app/desktop/src/version.ts',
        'app/desktop/src/routes/**',
      ],
    },
  },
});
