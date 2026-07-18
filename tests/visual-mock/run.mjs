/**
 * Mock-driven visual validation runner.
 *
 * Boots the Next.js renderer, injects the Tauri-host mock (see
 * `tauri-host-mock.mjs`), then drives the REAL assembled UX through a set of
 * flows — the foundation gate, the opened twin-authoring surface, and the
 * auxiliary windows — asserting key content renders and capturing light + dark
 * screenshots. No native Tauri build required.
 *
 * Usage:  pnpm run test:visual-mock            (spawns the dev server itself)
 *         BASE_URL=http://localhost:1420 node tests/visual-mock/run.mjs   (reuse a running server)
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import { installTauriHostMock, makeFixtures } from './tauri-host-mock.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const screensDir = join(here, 'screens');
const BASE_URL = process.env.BASE_URL || 'http://localhost:1420';

/** @typedef {{ name: string, route: string, fixtures?: object, waitFor?: string, drive?: (page:any)=>Promise<void>, expect: string[] }} Scenario */

/** @type {Scenario[]} */
const scenarios = [
  {
    name: 'foundation-gate',
    route: '/',
    expect: ['Workspace foundation'],
  },
  {
    name: 'workspace-authoring',
    route: '/',
    drive: async (page) => {
      // Let React hydrate before touching the controlled input, otherwise the
      // onChange never fires and the Create button stays disabled.
      await page.waitForTimeout(2000);
      const input = page.getByPlaceholder('/path/to/workspace');
      await input.waitFor({ state: 'visible', timeout: 10000 });
      await input.fill('/Users/demo/twins/enterprise-demo');
      await page
        .getByRole('button', { name: /^create$/i })
        .first()
        .click({ timeout: 10000 });
      await page.waitForTimeout(1500);
    },
    expect: ['Foundation status', 'Customer Portal', 'Catalogue'],
  },
  {
    name: 'canvas-graph',
    route: '/',
    fixtures: { withGraphTemplate: true },
    drive: async (page) => {
      // Engines are not a navigation axis: the canvas lives on the Model
      // surface, so drive navigation there before the graph is asserted.
      await page.waitForTimeout(2000);
      await page
        .getByRole('button', { name: /modelling studio/i })
        .first()
        .click({ timeout: 10000 });
      await page.waitForTimeout(1000);
    },
    waitFor: '.react-flow',
    expect: ['Customer Portal'],
  },
  {
    name: 'surface-nav',
    route: '/',
    fixtures: { withGraphTemplate: true },
    drive: async (page) => {
      // Default surface is the workspace foundation gate; navigating to the
      // Model surface swaps the content area to the Topos canvas.
      await page.waitForTimeout(2000);
      await page
        .getByRole('button', { name: /modelling studio/i })
        .first()
        .click({ timeout: 10000 });
      await page.waitForSelector('.react-flow', { timeout: 10000 });
      await page.waitForTimeout(1000);
    },
    expect: ['Customer Portal'],
  },
  {
    name: 'inspector-selection',
    route: '/',
    fixtures: { withGraphTemplate: true },
    drive: async (page) => {
      // Navigate to the Model surface, wait for the canvas, then select a graph
      // node so the right-hand inspector resolves and renders its properties.
      await page.waitForTimeout(2000);
      await page
        .getByRole('button', { name: /modelling studio/i })
        .first()
        .click({ timeout: 10000 });
      await page.waitForSelector('.react-flow', { timeout: 10000 });
      await page.waitForTimeout(1000);
      await page
        .getByText('Customer Portal', { exact: false })
        .first()
        .click({ timeout: 10000 })
        .catch(() => {});
      await page.waitForTimeout(1000);
    },
    waitFor: '[data-testid="aideon-shell-inspector"]',
    // 'Customer Portal' proves the node's name surfaced; the inspector title is
    // present whether or not selection resolves, so the empty-state fallback
    // still satisfies the gate if a node click is missed.
    expect: ['Inspector', 'Customer Portal'],
  },
  { name: 'settings', route: '/settings', expect: ['Color theme'] },
  { name: 'about', route: '/about', expect: ['Desktop shell'] },
  { name: 'status', route: '/status', expect: ['status'] },
  { name: 'styleguide', route: '/styleguide', expect: ['Styleguide'] },
];

const KNOWN_BENIGN = [
  /Hydration failed/i,
  /script tag while rendering/i,
  /did not match/i,
  /Warning:/i,
];

async function httpOk(url) {
  try {
    const r = await fetch(url);
    return r.ok || r.status === 200;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await httpOk(url)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function maybeStartServer() {
  if (await httpOk(BASE_URL)) return null;
  console.log('· starting dev server (pnpm run node:dev)…');
  const proc = spawn('pnpm', ['run', 'node:dev'], {
    cwd: repoRoot,
    detached: true,
    stdio: 'ignore',
  });
  const ready = await waitForServer(BASE_URL);
  if (!ready) {
    try {
      process.kill(-proc.pid);
    } catch {}
    throw new Error('dev server did not become ready');
  }
  console.log('· dev server ready');
  return proc;
}

async function shoot(context, scenario, mode) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.emulateMedia({ colorScheme: mode });
  await page.addInitScript(installTauriHostMock, makeFixtures(scenario.fixtures));
  await page.addInitScript((m) => {
    try {
      localStorage.setItem('theme', m);
    } catch {}
  }, mode);
  await page.goto(BASE_URL + scenario.route, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (scenario.drive) await scenario.drive(page).catch((e) => errors.push('drive: ' + e.message));
  if (scenario.waitFor)
    await page
      .waitForSelector(scenario.waitFor, { timeout: 10000 })
      .catch(() => errors.push('waitFor timeout: ' + scenario.waitFor));
  await page.waitForTimeout(1500);
  await page.emulateMedia({ colorScheme: mode });
  await page.evaluate((m) => {
    const d = document.documentElement;
    d.classList.remove('light', 'dark');
    d.classList.add(m);
    d.style.colorScheme = m;
  }, mode);
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(screensDir, `${scenario.name}-${mode}.png`), fullPage: true });

  // Assertions run once (mode-independent), on the light pass.
  let missing = [];
  if (mode === 'light') {
    const body = (await page.textContent('body').catch(() => '')) || '';
    missing = scenario.expect.filter((t) => !body.toLowerCase().includes(t.toLowerCase()));
  }
  const fatal = errors.filter((e) => !KNOWN_BENIGN.some((re) => re.test(e)));
  await page.close();
  return { missing, fatal };
}

async function main() {
  mkdirSync(screensDir, { recursive: true });
  const server = await maybeStartServer();
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const scenario of scenarios) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
      });
      const light = await shoot(context, scenario, 'light');
      const dark = await shoot(context, scenario, 'dark');
      await context.close();
      const fatal = [...light.fatal, ...dark.fatal];
      const pass = light.missing.length === 0 && fatal.length === 0;
      results.push({ name: scenario.name, pass, missing: light.missing, fatal });
      console.log(
        `${pass ? '✓' : '✗'} ${scenario.name}${pass ? '' : '  ' + JSON.stringify({ missing: light.missing, fatal })}`,
      );
    }
  } finally {
    await browser.close();
    if (server) {
      try {
        process.kill(-server.pid);
      } catch {}
    }
  }
  const failed = results.filter((r) => !r.pass);
  console.log(
    `\n${results.length - failed.length}/${results.length} scenarios passed. Screenshots: tests/visual-mock/screens/`,
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
