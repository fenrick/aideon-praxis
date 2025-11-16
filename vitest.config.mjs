import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // Stubs to keep tests offline and avoid Vite resolution failures
      '@fluentui/web-components': path.resolve(
        __dirname,
        'app/PraxisDesktop/tests/stubs/fluentui.web-components.ts',
      ),
      '@aideon/PraxisDesignSystem': path.resolve(__dirname, 'app/PraxisDesignSystem/src'),
      '@iconify/svelte': path.resolve(__dirname, 'app/PraxisDesktop/tests/stubs/iconify.svelte'),
      '@tauri-apps/api/core': path.resolve(
        __dirname,
        'app/PraxisDesktop/tests/stubs/tauri-api-core.ts',
      ),
      '@tauri-apps/plugin-log': path.resolve(
        __dirname,
        'app/PraxisDesktop/tests/stubs/tauri-plugin-log.ts',
      ),
      'elkjs/lib/elk.bundled.js': path.resolve(
        __dirname,
        'app/PraxisDesktop/tests/stubs/elk.bundled.ts',
      ),
      $lib: path.resolve(__dirname, 'app/PraxisDesktop/src/lib'),
      '@': path.resolve(__dirname, 'app/PraxisCanvas/src'),
      '@aideon/PraxisAdapters': path.resolve(__dirname, 'app/PraxisAdapters/src'),
      '@aideon/design-system/ui': path.resolve(__dirname, 'app/AideonDesignSystem/dist/ui'),
      '@aideon/design-system/components/ui': path.resolve(
        __dirname,
        'app/AideonDesignSystem/dist/ui',
      ),
      '@aideon/design-system/blocks': path.resolve(__dirname, 'app/AideonDesignSystem/dist/blocks'),
      '@aideon/design-system/reactflow': path.resolve(
        __dirname,
        'app/AideonDesignSystem/dist/reactflow',
      ),
      '@aideon/design-system/lib/utils': path.resolve(
        __dirname,
        'app/AideonDesignSystem/dist/lib/cn.js',
      ),
      '@aideon/design-system/lib': path.resolve(__dirname, 'app/AideonDesignSystem/dist/lib'),
      '@aideon/design-system/styles': path.resolve(__dirname, 'app/AideonDesignSystem/src/styles'),
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
    setupFiles: ['app/PraxisDesktop/tests/setup.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov', 'html'],
      reportOnFailure: true,
      include: [
        'app/PraxisCanvas/src/**/*.{ts,tsx}',
        'app/PraxisDesktop/src/lib/**/*.{ts,tsx}',
        'app/PraxisAdapters/src/**/*.{ts,tsx}',
        'app/PraxisDtos/src/**/*.{ts,tsx}',
      ],
      exclude: [
        '**/*.d.ts',
        '**/*.test.*',
        'app/**/dist/**',
        'scripts/**',
        'app/PraxisDesktop/src/version.ts',
        'app/PraxisDesktop/src/routes/**',
      ],
    },
  },
});
