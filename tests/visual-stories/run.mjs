/**
 * Story-driven visual regression runner for the honest-state design-system blocks.
 *
 * Mirrors `tests/visual-mock/run.mjs`: it serves the built static Storybook,
 * discovers the honest-state block stories from `storybook-static/index.json`,
 * then screenshots each story in three modes — light, dark, and reduced-motion —
 * asserting the block renders visible content with no fatal console/page errors.
 *
 * The screenshots (written to `tests/visual-stories/screens/`, git-ignored) are
 * the artefact for human review; a strict pixel baseline is intentionally not
 * enforced here (see README for how to add one later).
 *
 * Usage:  pnpm run test:visual-stories                                   (serves storybook-static, building it if missing)
 *         STORYBOOK_URL=http://localhost:6006 node tests/visual-stories/run.mjs   (reuse a running `pnpm run storybook`)
 */
import { spawnSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const staticDir = join(repoRoot, 'storybook-static');
const screensDir = join(here, 'screens');

/**
 * The honest-state blocks under test. A story belongs to the suite when its
 * `importPath` names one of these `<block>.stories` files. Keeping this as a
 * lookup set (rather than a hard-coded id list) means new stories added to any
 * honest-state block are covered automatically.
 */
const HONEST_STATE_BLOCKS = new Set([
  'provenance-badge',
  'provenance-panel',
  'stale-badge',
  'rebuilding-indicator',
  'partial-banner',
  'confidence-label',
  'diff-marker',
  'error-frame',
  'warning-banner',
  'status-badge',
]);

/**
 * The three visual modes captured per story. `theme` drives the Storybook
 * `withThemeByClassName` global (dark toggles the `.dark` class); `reducedMotion`
 * and `colorScheme` are emulated at the browser level.
 * @type {{ name: string, theme: string, colorScheme: 'light'|'dark', reducedMotion: 'no-preference'|'reduce' }[]}
 */
const MODES = [
  { name: 'light', theme: 'light', colorScheme: 'light', reducedMotion: 'no-preference' },
  { name: 'dark', theme: 'dark', colorScheme: 'dark', reducedMotion: 'no-preference' },
  { name: 'reduced-motion', theme: 'light', colorScheme: 'light', reducedMotion: 'reduce' },
];

const KNOWN_BENIGN = [
  /Hydration failed/i,
  /did not match/i,
  /Warning:/i,
  /Download the React DevTools/i,
];

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.ttf', 'font/ttf'],
  ['.ico', 'image/x-icon'],
  ['.map', 'application/json; charset=utf-8'],
]);

function ensureStorybookBuilt() {
  if (existsSync(join(staticDir, 'index.json'))) return;
  console.log('· building static Storybook (pnpm run build-storybook)…');
  const built = spawnSync('pnpm', ['run', 'build-storybook'], { cwd: repoRoot, stdio: 'inherit' });
  if (built.status !== 0) throw new Error('build-storybook failed');
}

/** Resolve a request URL to a safe file path inside `staticDir`, or null if out of bounds/missing. */
function resolveStaticPath(rawUrl) {
  const rawPath = decodeURIComponent((rawUrl || '/').split('?')[0]);
  const relative = normalize(rawPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = rawPath.endsWith('/')
    ? join(staticDir, relative, 'index.html')
    : join(staticDir, relative);
  const inBounds = filePath.startsWith(staticDir) && existsSync(filePath);
  return inBounds ? filePath : null;
}

/** Serve `storybook-static/` on an ephemeral port; returns { server, origin }. */
async function serveStatic() {
  const server = createServer((request, response) => {
    const filePath = resolveStaticPath(request.url);
    if (!filePath) {
      response.writeHead(404);
      response.end('not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': MIME_TYPES.get(extname(filePath)) || 'application/octet-stream',
    });
    const stream = createReadStream(filePath);
    stream.on('error', () => response.destroy());
    stream.pipe(response);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return { server, origin: `http://127.0.0.1:${port}` };
}

/** Derive the design-system block name from a story's import path. */
function blockOf(importPath) {
  const match = /\/([^/]+)\.stories\.[jt]sx?$/.exec(importPath);
  return match ? match[1] : undefined;
}

/** Read `index.json` and return the honest-state story entries. */
function discoverStories() {
  const index = JSON.parse(readFileSync(join(staticDir, 'index.json'), 'utf8'));
  const entries = Object.values(index.entries ?? index.stories ?? {});
  return entries
    .filter((entry) => entry.type !== 'docs' && HONEST_STATE_BLOCKS.has(blockOf(entry.importPath)))
    .map((entry) => ({
      id: entry.id,
      block: blockOf(entry.importPath),
      title: entry.title,
      name: entry.name,
    }));
}

/** Capture one story across every mode; returns its aggregated result row. */
async function captureStory(browser, origin, story) {
  const context = await browser.newContext({
    viewport: { width: 640, height: 400 },
    deviceScaleFactor: 2,
  });
  const fatal = [];
  let rendered = '';
  for (const mode of MODES) {
    const shot = await shoot(context, origin, story, mode);
    fatal.push(...shot.fatal.map((error) => `${mode.name}: ${error}`));
    if (mode.name === 'light') rendered = shot.rendered;
  }
  await context.close();
  const present = rendered.length > 0;
  return {
    id: story.id,
    block: story.block,
    name: story.name,
    present,
    fatal,
    pass: present && fatal.length === 0,
  };
}

/**
 * Wait for the story root to render real content instead of a fixed sleep, then
 * a brief settle for fonts/CSS transitions. This is a screenshot suite, not a
 * pixel baseline, so a short deterministic settle after content appears is enough.
 */
async function settleStory(page) {
  await page
    .waitForFunction(
      () => (document.querySelector('#storybook-root')?.textContent || '').trim().length > 0,
      { timeout: 5000 },
    )
    .catch(() => {});
  await page.waitForTimeout(150);
}

/** Screenshot one story in one mode; returns { fatal, rendered }. */
async function shoot(context, origin, story, mode) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.emulateMedia({ colorScheme: mode.colorScheme, reducedMotion: mode.reducedMotion });
  const url = `${origin}/iframe.html?id=${story.id}&globals=theme:${mode.theme}&viewMode=story`;
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  const root = page.locator('#storybook-root');
  await root
    .waitFor({ state: 'attached', timeout: 15000 })
    .catch(() => errors.push('storybook-root missing'));
  const errorOverlay = await page
    .locator('.sb-show-errordisplay')
    .count()
    .catch(() => 0);
  if (errorOverlay > 0) errors.push('storybook error overlay shown');
  await settleStory(page);
  const fileName = `${story.block}--${story.name.replaceAll(/\W+/g, '-')}-${mode.name}.png`;
  await page.screenshot({ path: join(screensDir, fileName) });
  const rendered = ((await root.textContent().catch(() => '')) || '').trim();
  const fatal = errors.filter((error) => !KNOWN_BENIGN.some((pattern) => pattern.test(error)));
  await page.close();
  return { fatal, rendered };
}

/** One-line pass/fail log line for a captured story. */
function logResult(result) {
  const detail = result.pass
    ? ''
    : '  ' + JSON.stringify({ present: result.present, fatal: result.fatal });
  console.log(`${result.pass ? '✓' : '✗'} ${result.block} — ${result.name}${detail}`);
}

/** Capture every story in sequence, logging each; always closes the browser. */
async function captureAll(browser, origin, stories) {
  const results = [];
  try {
    for (const story of stories) {
      const result = await captureStory(browser, origin, story);
      results.push(result);
      logResult(result);
    }
  } finally {
    await browser.close();
  }
  return results;
}

/** Print the run summary; returns the process exit code (0 = all passed and no gaps). */
function reportSummary(results, coveredBlocks, missingBlocks) {
  const passed = results.filter((result) => result.pass).length;
  console.log(
    `\n${passed}/${results.length} stories passed across ${MODES.length} modes ` +
      `(${coveredBlocks.size}/${HONEST_STATE_BLOCKS.size} honest-state blocks). ` +
      `Screenshots: tests/visual-stories/screens/`,
  );
  if (missingBlocks.length > 0) console.log(`⚠ no stories found for: ${missingBlocks.join(', ')}`);
  return passed === results.length && missingBlocks.length === 0 ? 0 : 1;
}

async function main() {
  ensureStorybookBuilt();
  mkdirSync(screensDir, { recursive: true });

  const reuseUrl = process.env.STORYBOOK_URL;
  const hosted = reuseUrl
    ? { server: null, origin: reuseUrl.replace(/\/$/, '') }
    : await serveStatic();

  const stories = discoverStories();
  const coveredBlocks = new Set(stories.map((story) => story.block));
  const missingBlocks = [...HONEST_STATE_BLOCKS].filter((block) => !coveredBlocks.has(block));

  const browser = await chromium.launch();
  const results = await captureAll(browser, hosted.origin, stories);
  if (hosted.server) hosted.server.close();

  process.exit(reportSummary(results, coveredBlocks, missingBlocks));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
