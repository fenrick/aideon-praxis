import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const isReplitMode =
    mode === 'replit' ||
    Boolean(process.env.REPL_ID ?? process.env.REPLIT ?? process.env.REPLIT_DB_URL);

  const serverHost = isReplitMode ? '0.0.0.0' : '127.0.0.1';
  const serverPort = isReplitMode ? 5000 : 1420;

  return {
    plugins: [tailwindcss(), react()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: [
        { find: '@', replacement: resolve(__dirname, './src') },
        { find: 'aideon', replacement: resolve(__dirname, './src/aideon') },
        { find: 'praxis', replacement: resolve(__dirname, './src/workspaces/praxis') },
        {
          find: 'design-system/reactflow',
          replacement: resolve(__dirname, './src/design-system/components'),
        },
        { find: 'design-system', replacement: resolve(__dirname, './src/design-system') },
        { find: 'adapters', replacement: resolve(__dirname, './src/adapters') },
        { find: 'dtos', replacement: resolve(__dirname, './src/dtos') },
      ],
    },
    server: {
      host: serverHost,
      port: serverPort,
      strictPort: true,
      allowedHosts: isReplitMode ? true : ['localhost', '127.0.0.1'],
    },
  };
});
