import autoprefixer from 'autoprefixer';
import { sveltekit } from '@sveltejs/kit/vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import tailwindcss from '@tailwindcss/postcss';
import type { ViteDevServer } from 'vite';
import { defineConfig } from 'vite';

const host = process.env.TAURI_DEV_HOST;
const windowRoutes = ['splash', 'about', 'settings', 'status'];

function uriSanitizerPlugin() {
  return {
    name: 'aideon-uri-sanitizer',
    configureServer(server: ViteDevServer) {
      const logger = server.config.logger;
      server.middlewares.use((req: IncomingMessage, _res: ServerResponse, next: () => void) => {
        const url = req.url;
        if (!url) {
          next();
          return;
        }
        try {
          decodeURI(url);
          next();
        } catch (error) {
          const sanitized = url.replace(/%(?![0-9A-Fa-f]{2})/g, '%25');
          req.url = sanitized;
          logger.warn(
            `Sanitized malformed request URL "${url}" -> "${sanitized}" (${(error as Error).message})`,
          );
          next();
        }
      });
    },
  };
}

function windowAliasPlugin() {
  const rewrites = new Map(
    windowRoutes.flatMap((route) => [
      [`/${route}/index.html`, `/${route}/`],
      [`/${route}.html`, `/${route}/`],
    ]),
  );

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

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [sveltekit(), uriSanitizerPlugin(), windowAliasPlugin()],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ['**/tests/**'],
    },
  },
}));
