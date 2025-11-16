import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const buildDir = path.resolve(__dirname, '../dist');
const windows = [
  { name: 'splash', source: 'splash.html' },
  { name: 'about', source: 'about.html' },
  { name: 'settings', source: 'settings.html' },
  { name: 'status', source: 'status.html' },
  { name: 'canvas', source: 'index.html' },
  { name: 'styleguide', source: 'styleguide.html' },
];

async function main() {
  await Promise.all(
    windows.map(async (entry) => {
      const source = path.join(buildDir, entry.source);
      const targetDir = path.join(buildDir, entry.name);
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
