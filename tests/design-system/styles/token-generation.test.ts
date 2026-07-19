import { access, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const sourceDirectory = path.join(process.cwd(), 'src/design-system/styles/tokens');
const temporaryDirectories: string[] = [];

const semanticColourPaths = [
  'color.surface.base',
  'color.surface.raised',
  'color.surface.overlay',
  'color.surface.sunken',
  'color.foreground.default',
  'color.foreground.muted',
  'color.foreground.subtle',
  'color.foreground.on-accent',
  'color.foreground.disabled',
  'color.border.default',
  'color.border.subtle',
  'color.border.strong',
  'color.border.focus',
  'color.action.primary',
  'color.action.primary-hover',
  'color.action.primary-active',
  'color.action.primary-disabled',
  'color.action.secondary',
  'color.action.secondary-hover',
  'color.action.secondary-active',
  'color.action.secondary-disabled',
  'color.action.destructive',
  'color.action.destructive-hover',
  'color.action.destructive-active',
  'color.action.destructive-disabled',
  ...['info', 'success', 'warning', 'error', 'neutral'].flatMap((tone) =>
    ['fg', 'bg', 'border'].map((role) => `color.status.${tone}-${role}`),
  ),
  ...['asserted', 'inferred', 'generated'].flatMap((kind) =>
    ['fg', 'bg', 'border'].map((role) => `color.provenance.${kind}-${role}`),
  ),
  ...Array.from({ length: 8 }, (_, index) => `color.chart.${String(index + 1)}`),
  'color.sidebar.surface',
  'color.sidebar.foreground',
  'color.sidebar.primary',
  'color.sidebar.primary-foreground',
  'color.sidebar.accent',
  'color.sidebar.accent-foreground',
  'color.sidebar.border',
  'color.sidebar.focus',
] as const;

const semanticPaths = [
  ...semanticColourPaths,
  'space.inset.dense',
  'space.inset.comfortable',
  'space.stack.xs',
  'space.stack.sm',
  'space.stack.md',
  'space.stack.lg',
  'space.inline.xs',
  'space.inline.sm',
  'space.inline.md',
  'space.inline.lg',
  'radius.control',
  'radius.surface',
  'radius.pill',
  'elevation.0',
  'elevation.1',
  'elevation.2',
  'elevation.3',
  'motion.duration.instant',
  'motion.duration.fast',
  'motion.duration.normal',
  'motion.duration.slow',
  'motion.easing.standard',
  'motion.easing.decelerate',
  'motion.easing.accelerate',
  'motion.easing.linear',
  'motion.transition.standard',
  'motion.transition.emphasis',
  'motion.transition.none',
  'size.target.min',
  'size.target.comfortable',
] as const;

/**
 * Convert a DTCG token path to its generated CSS custom-property name.
 * @param tokenPath - The dot-separated DTCG path.
 */
function cssVariable(tokenPath: string): string {
  return `--aideon-${tokenPath.replaceAll('.', '-')}`;
}

interface GeneratedArtifacts {
  css: string;
  typeScript: string;
}

interface TokenGeneratorModule {
  generateTokenArtifacts(options: { sourceDirectory: string }): Promise<GeneratedArtifacts>;
}

/**
 * Load the JavaScript token generator through its public module API.
 * @param options - Generator input.
 * @param options.sourceDirectory - Directory containing the DTCG sources.
 */
async function generateTokenArtifacts(options: {
  sourceDirectory: string;
}): Promise<GeneratedArtifacts> {
  const generatorUrl = pathToFileURL(path.join(process.cwd(), 'tools/generate-tokens.mjs')).href;
  const generator = (await import(
    /* @vite-ignore */ generatorUrl
  )) as unknown as TokenGeneratorModule;
  return generator.generateTokenArtifacts(options);
}

/**
 * Read one generated custom-property value from the CSS artifact.
 * @param css - Generated stylesheet text.
 * @param name - Custom-property name to find.
 */
function declarationValue(css: string, name: string): string | undefined {
  const prefix = `  ${name}: `;
  const declarationLine = css.split('\n').find((line) => line.startsWith(prefix));
  return declarationLine?.slice(prefix.length, -1);
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(async (directory) => {
      const { rm } = await import('node:fs/promises');
      await rm(directory, { force: true, recursive: true });
    }),
  );
});

describe('DTCG token generation', () => {
  it('has an authoritative source and generator', async () => {
    await expect(
      access(path.join(sourceDirectory, 'reference.tokens.json')),
    ).resolves.toBeUndefined();
    await expect(
      access(path.join(sourceDirectory, 'semantic-light.tokens.json')),
    ).resolves.toBeUndefined();
    await expect(
      access(path.join(sourceDirectory, 'semantic-dark.tokens.json')),
    ).resolves.toBeUndefined();
    await expect(
      access(path.join(process.cwd(), 'tools/generate-tokens.mjs')),
    ).resolves.toBeUndefined();
  });

  it('emits every named semantic token through a reference variable', async () => {
    const { css } = await generateTokenArtifacts({ sourceDirectory });

    for (const tokenPath of semanticPaths) {
      expect(declarationValue(css, cssVariable(tokenPath))).toMatch(
        /^var\(--aideon-reference-[^)]+\)$/,
      );
    }
  });

  it('emits shadcn variables as aliases of semantic tokens', async () => {
    const { css } = await generateTokenArtifacts({ sourceDirectory });

    expect(css).toContain('--primary: var(--aideon-color-action-primary);');
    expect(css).toContain('--ring: var(--aideon-color-border-focus);');
    expect(css).toContain('--destructive: var(--aideon-color-action-destructive);');
    expect(css).toContain('--radius: var(--aideon-radius-surface);');
  });

  it('propagates a changed reference value without changing its semantic binding', async () => {
    const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'aideon-tokens-'));
    temporaryDirectories.push(temporaryDirectory);

    const referenceSource = JSON.parse(
      await readFile(path.join(sourceDirectory, 'reference.tokens.json'), 'utf8'),
    ) as Record<string, unknown>;
    const semanticLightSource = await readFile(
      path.join(sourceDirectory, 'semantic-light.tokens.json'),
      'utf8',
    );
    const semanticDarkSource = await readFile(
      path.join(sourceDirectory, 'semantic-dark.tokens.json'),
      'utf8',
    );

    const reference = referenceSource.reference as {
      color: { teal: { '600': { $value: string } } };
    };
    reference.color.teal['600'].$value = 'oklch(0.5 0.1 190)';

    await Promise.all([
      writeFile(
        path.join(temporaryDirectory, 'reference.tokens.json'),
        `${JSON.stringify(referenceSource, undefined, 2)}\n`,
      ),
      writeFile(path.join(temporaryDirectory, 'semantic-light.tokens.json'), semanticLightSource),
      writeFile(path.join(temporaryDirectory, 'semantic-dark.tokens.json'), semanticDarkSource),
    ]);

    const { css } = await generateTokenArtifacts({ sourceDirectory: temporaryDirectory });

    expect(css).toContain('--aideon-reference-color-teal-600: oklch(0.5 0.1 190);');
    expect(css).toContain('--aideon-color-action-primary: var(--aideon-reference-color-teal-600);');
  });
});
