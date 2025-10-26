import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const host = process.env.TAURI_DEV_HOST;
const windowRoutes = ['splash', 'about', 'settings', 'status'];

function windowAliasPlugin() {
  const rewrites = new Map(
    windowRoutes.flatMap((route) => [
      [`/${route}/index.html`, `/${route}/`],
      [`/${route}.html`, `/${route}/`],
    ]),
  );

  return {
    name: 'aideon-window-alias',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
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
  plugins: [sveltekit(), windowAliasPlugin()],

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
