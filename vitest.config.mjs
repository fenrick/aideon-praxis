import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
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
