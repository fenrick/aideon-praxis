import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const buildDir = path.resolve(__dirname, '../build');
const windows = ['splash', 'about', 'settings', 'status'];

async function main() {
  await Promise.all(
    windows.map(async (window) => {
      const source = path.join(buildDir, `${window}.html`);
      const targetDir = path.join(buildDir, window);
      const target = path.join(targetDir, 'index.html');

      try {
        const html = await readFile(source);
        await mkdir(targetDir, { recursive: true });
        await writeFile(target, html);
      } catch (error) {
        if (
          (error instanceof Error && 'code' in error && error.code === 'ENOENT') ||
          error?.code === 'ENOENT'
        ) {
          return;
        }
        throw error;
      }
    }),
  );
}

main().catch((error) => {
  console.error('postbuild-windows failed:', error);
  process.exitCode = 1;
});
