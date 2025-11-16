import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import type { ViteDevServer } from 'vite';
import { defineConfig } from 'vite';

const windowRoutes = ['splash', 'about', 'settings', 'status'];
const spaRoutes = ['canvas'];

function windowAliasPlugin() {
  const rewrites = new Map<string, string>();

  for (const route of windowRoutes) {
    rewrites.set(`/${route}/index.html`, `/${route}/`);
    rewrites.set(`/${route}.html`, `/${route}/`);
  }

  for (const route of spaRoutes) {
    rewrites.set(`/${route}`, '/');
    rewrites.set(`/${route}/`, '/');
    rewrites.set(`/${route}.html`, '/');
  }

  return {
    name: 'aideon-window-alias',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req: IncomingMessage, _res: ServerResponse, next: () => void) => {
        const url = req.url;
        if (!url) {
          next();
          return;
        }
        const [pathname, search = ''] = url.split('?');
        const target = rewrites.get(pathname);
        if (target) {
          req.url = `${target}${search ? `?${search}` : ''}`;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [tailwindcss(), react(), windowAliasPlugin()],
  resolve: {
    alias: [
      { find: '@', replacement: resolve(__dirname, 'src') },
      { find: '@aideon/PraxisAdapters', replacement: resolve(__dirname, '../PraxisAdapters/src') },
      {
        find: '@aideon/design-system/ui',
        replacement: resolve(__dirname, '../AideonDesignSystem/dist/ui'),
      },
      {
        find: '@aideon/design-system/components/ui/tabs',
        replacement: resolve(__dirname, '../AideonDesignSystem/src/components/ui/tabs.tsx'),
      },
      {
        find: '@aideon/design-system/components/ui',
        replacement: resolve(__dirname, '../AideonDesignSystem/dist/ui'),
      },
      {
        find: '@aideon/design-system/blocks',
        replacement: resolve(__dirname, '../AideonDesignSystem/dist/blocks'),
      },
      {
        find: '@aideon/design-system/reactflow',
        replacement: resolve(__dirname, '../AideonDesignSystem/dist/reactflow'),
      },
      {
        find: '@aideon/design-system/lib/utils',
        replacement: resolve(__dirname, '../AideonDesignSystem/dist/lib/cn.js'),
      },
      {
        find: '@aideon/design-system/lib',
        replacement: resolve(__dirname, '../AideonDesignSystem/dist/lib'),
      },
      {
        find: '@aideon/design-system/styles',
        replacement: resolve(__dirname, '../AideonDesignSystem/src/styles'),
      },
    ],
  },
  server: {
    port: 1420,
    strictPort: true,
    host: '127.0.0.1',
  },
  preview: {
    port: 4173,
    strictPort: true,
    host: '127.0.0.1',
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        splash: resolve(__dirname, 'splash.html'),
        about: resolve(__dirname, 'about.html'),
        settings: resolve(__dirname, 'settings.html'),
        status: resolve(__dirname, 'status.html'),
      },
    },
  },
});
