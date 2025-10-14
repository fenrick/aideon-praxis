import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { main: 'src/main.ts' },
    platform: 'node',
    target: 'node20',
    format: ['cjs'],
    outDir: 'dist',
    sourcemap: true,
    clean: false,
    dts: false,
    external: ['electron'],
    outExtension: () => ({ js: '.js' }),
  },
  {
    entry: { preload: 'src/preload.ts' },
    platform: 'node',
    target: 'node20',
    format: ['cjs'],
    outDir: 'dist',
    sourcemap: true,
    clean: false,
    dts: false,
    external: ['electron'],
    outExtension: () => ({ js: '.js' }),
  },
]);
