import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

function designSystemAliasPlugin() {
  const dsRoot = path.resolve(__dirname, 'app/AideonDesignSystem/src');
  const exts = ['.tsx', '.ts', '.js', '.jsx'];

  return {
    name: 'aideon-design-system-alias',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || !importer.includes('AideonDesignSystem/src')) {
        return null;
      }
      if (!source.startsWith('@/')) {
        return null;
      }
      const rel = source.slice(2);
      for (const ext of exts) {
        const candidate = path.resolve(dsRoot, `${rel}${ext}`);
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
      const indexTsx = path.resolve(dsRoot, rel, 'index.tsx');
      if (fs.existsSync(indexTsx)) {
        return indexTsx;
      }
      const indexTs = path.resolve(dsRoot, rel, 'index.ts');
      if (fs.existsSync(indexTs)) {
        return indexTs;
      }
      return null;
    },
  };
}

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@\/components\/ui\/(.*)$/,
        replacement: path.resolve(__dirname, 'app/AideonDesignSystem/src/components/ui/$1'),
      },
      {
        find: '@/lib/errors',
        replacement: path.resolve(__dirname, 'app/PraxisCanvas/src/lib/errors.ts'),
      },
      {
        find: '@/lib/meta-model',
        replacement: path.resolve(__dirname, 'app/PraxisCanvas/src/lib/meta-model.ts'),
      },
      {
        find: '@/lib/utilities',
        replacement: path.resolve(__dirname, 'app/PraxisCanvas/src/lib/utilities.ts'),
      },
      {
        find: '@/lib/search',
        replacement: path.resolve(__dirname, 'app/PraxisCanvas/src/lib/search/index.ts'),
      },
      {
        find: /^@\/lib\/(.*)$/,
        replacement: path.resolve(__dirname, 'app/AideonDesignSystem/src/lib/$1'),
      },
      {
        find: /^@\/components\/(.*)$/,
        replacement: path.resolve(__dirname, 'app/PraxisCanvas/src/components/$1'),
      },
      { find: '@', replacement: path.resolve(__dirname, 'app/PraxisCanvas/src') },
      {
        find: '@aideon/PraxisAdapters',
        replacement: path.resolve(__dirname, 'app/PraxisAdapters/src'),
      },
      {
        find: '@aideon/design-system/ui',
        replacement: path.resolve(__dirname, 'app/AideonDesignSystem/src/ui'),
      },
      {
        find: '@aideon/design-system/components/ui',
        replacement: path.resolve(__dirname, 'app/AideonDesignSystem/src/components/ui'),
      },
      {
        find: '@aideon/design-system/blocks',
        replacement: path.resolve(__dirname, 'app/AideonDesignSystem/src/blocks'),
      },
      {
        find: '@aideon/design-system/reactflow/node-search',
        replacement: path.resolve(
          __dirname,
          'app/PraxisCanvas/tests/stubs/reactflow-node-search.tsx',
        ),
      },
      {
        find: '@aideon/design-system/reactflow/praxis-node',
        replacement: path.resolve(
          __dirname,
          'app/PraxisCanvas/tests/stubs/reactflow-praxis-node.tsx',
        ),
      },
      {
        find: '@aideon/design-system/reactflow/timeline-edge',
        replacement: path.resolve(
          __dirname,
          'app/PraxisCanvas/tests/stubs/reactflow-timeline-edge.tsx',
        ),
      },
      {
        find: '@aideon/design-system/lib/utils',
        replacement: path.resolve(__dirname, 'app/AideonDesignSystem/src/lib/utils.ts'),
      },
      {
        find: '@aideon/design-system/lib',
        replacement: path.resolve(__dirname, 'app/AideonDesignSystem/src/lib'),
      },
      {
        find: '@aideon/design-system/styles',
        replacement: path.resolve(__dirname, 'app/AideonDesignSystem/src/styles'),
      },
      {
        find: '@tauri-apps/api/core',
        replacement: path.resolve(__dirname, 'app/PraxisAdapters/tests/stubs/tauri-core.ts'),
      },
    ],
  },
  plugins: [react(), designSystemAliasPlugin()],
  test: {
    environment: 'jsdom',
    setupFiles: [path.resolve(__dirname, 'tests/setup.ts')],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov', 'html'],
      reportOnFailure: true,
      thresholds: {
        lines: 0.8,
        functions: 0.8,
        branches: 0.8,
        statements: 0.8,
      },
      include: [
        'app/PraxisCanvas/src/**/*.{ts,tsx}',
        'app/PraxisAdapters/src/**/*.{ts,tsx}',
        'app/PraxisDtos/src/**/*.{ts,tsx}',
      ],
      exclude: ['**/*.d.ts', '**/*.test.*', 'app/**/dist/**', 'scripts/**'],
    },
  },
});
