import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  resolve: {
    alias: {
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
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: [],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov', 'html'],
      reportOnFailure: true,
      include: [
        'app/PraxisCanvas/src/**/*.{ts,tsx}',
        'app/PraxisAdapters/src/**/*.{ts,tsx}',
        'app/PraxisDtos/src/**/*.{ts,tsx}',
      ],
      exclude: [
        '**/*.d.ts',
        '**/*.test.*',
        'app/**/dist/**',
        'scripts/**'
      ],
    },
  },
});
