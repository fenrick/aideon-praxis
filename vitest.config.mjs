import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // Stubs to keep tests offline and avoid Vite resolution failures
      '@fluentui/web-components': path.resolve(
        __dirname,
        'app/praxis-desktop/tests/stubs/fluentui.web-components.ts',
      ),
      '@tauri-apps/api/core': path.resolve(
        __dirname,
        'app/praxis-desktop/tests/stubs/tauri-api-core.ts',
      ),
      '@tauri-apps/plugin-log': path.resolve(
        __dirname,
        'app/praxis-desktop/tests/stubs/tauri-plugin-log.ts',
      ),
      $lib: path.resolve(__dirname, 'app/praxis-desktop/src/lib'),
      '@aideon/praxis-adapters': path.resolve(__dirname, 'app/praxis-adapters/src'),
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
    setupFiles: ['app/praxis-desktop/tests/setup.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov', 'html'],
      reportOnFailure: true,
      include: [
        'app/praxis-desktop/src/lib/**/*.{ts,tsx}',
        'app/praxis-adapters/src/**/*.{ts,tsx}',
        'app/praxis-dtos/src/**/*.{ts,tsx}',
      ],
      exclude: [
        '**/*.d.ts',
        '**/*.test.*',
        'app/**/dist/**',
        'scripts/**',
        'app/praxis-desktop/src/version.ts',
        'app/praxis-desktop/src/routes/**',
      ],
    },
  },
});
