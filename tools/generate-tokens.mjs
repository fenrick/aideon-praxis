#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { format, resolveConfig } from 'prettier';
import organizeImports from 'prettier-plugin-organize-imports';
import * as tailwindcss from 'prettier-plugin-tailwindcss';
import StyleDictionary from 'style-dictionary';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultSourceDirectory = join(repositoryRoot, 'src/design-system/styles/tokens');
const generatedCssPath = join(defaultSourceDirectory, 'generated.css');
const generatedTypeScriptPath = join(
  repositoryRoot,
  'src/design-system/foundations/tokens.generated.ts',
);
const [cssFormatOptions, typeScriptFormatOptions] = await Promise.all([
  resolveConfig(generatedCssPath),
  resolveConfig(generatedTypeScriptPath),
]);

const shadcnAliases = {
  '--accent': 'color.surface.sunken',
  '--accent-foreground': 'color.foreground.on-muted',
  '--background': 'color.surface.base',
  '--border': 'color.border.default',
  '--card': 'color.surface.raised',
  '--card-foreground': 'color.foreground.default',
  '--destructive': 'color.action.destructive',
  '--foreground': 'color.foreground.default',
  '--input': 'color.border.input',
  '--muted': 'color.surface.sunken',
  '--muted-foreground': 'color.foreground.muted',
  '--popover': 'color.surface.overlay',
  '--popover-foreground': 'color.foreground.default',
  '--primary': 'color.action.primary',
  '--primary-foreground': 'color.foreground.on-accent',
  '--radius': 'radius.surface',
  '--ring': 'color.border.focus',
  '--secondary': 'color.action.secondary',
  '--secondary-foreground': 'color.foreground.on-secondary',
  ...Object.fromEntries(
    Array.from({ length: 8 }, (_, index) => [`--chart-${index + 1}`, `color.chart.${index + 1}`]),
  ),
  '--sidebar': 'color.sidebar.surface',
  '--sidebar-accent': 'color.sidebar.accent',
  '--sidebar-accent-foreground': 'color.sidebar.accent-foreground',
  '--sidebar-border': 'color.sidebar.border',
  '--sidebar-foreground': 'color.sidebar.foreground',
  '--sidebar-primary': 'color.sidebar.primary',
  '--sidebar-primary-foreground': 'color.sidebar.primary-foreground',
  '--sidebar-ring': 'color.sidebar.focus',
};

const productAliases = {
  '--aideon-elevation-frame': 'elevation.frame',
  '--aideon-elevation-panel': 'elevation.1',
  '--aideon-elevation-shell': 'elevation.3',
  '--aideon-focus-ring': 'elevation.focus',
  '--aideon-provenance-asserted': 'color.provenance.asserted-fg',
  '--aideon-provenance-asserted-soft': 'color.provenance.asserted-bg',
  '--aideon-provenance-generated': 'color.provenance.generated-fg',
  '--aideon-provenance-generated-soft': 'color.provenance.generated-bg',
  '--aideon-provenance-inferred': 'color.provenance.inferred-fg',
  '--aideon-provenance-inferred-soft': 'color.provenance.inferred-bg',
  '--aideon-shell-background': 'color.shell.background',
  '--aideon-shell-border-strong': 'color.shell.border-strong',
  '--aideon-shell-inspector': 'color.shell.inspector',
  '--aideon-shell-navigation': 'color.shell.navigation',
  '--aideon-shell-panel': 'color.shell.panel',
  '--aideon-shell-toolbar': 'color.shell.toolbar',
  '--aideon-status-error': 'color.status.error-fg',
  '--aideon-status-error-soft': 'color.status.error-bg',
  '--aideon-status-info': 'color.status.info-fg',
  '--aideon-status-info-soft': 'color.status.info-bg',
  '--aideon-status-partial': 'color.status.partial-fg',
  '--aideon-status-partial-soft': 'color.status.partial-bg',
  '--aideon-status-stale': 'color.status.stale-fg',
  '--aideon-status-stale-soft': 'color.status.stale-bg',
  '--aideon-status-success': 'color.status.success-fg',
  '--aideon-status-success-soft': 'color.status.success-bg',
  '--aideon-status-warning': 'color.status.warning-fg',
  '--aideon-status-warning-soft': 'color.status.warning-bg',
  '--aideon-surface-subtle': 'color.shell.subtle',
  '--aideon-workspace-surface': 'color.shell.workspace',
};

const referenceAliases = {
  '--aideon-content-padding': 'reference.space.5',
  '--aideon-control-height': 'reference.size.control',
  '--aideon-inspector-width': 'reference.size.inspector',
  '--aideon-motion-deliberate': 'reference.motion.duration.slow',
  '--aideon-motion-fast': 'reference.motion.duration.fast',
  '--aideon-motion-standard': 'reference.motion.duration.normal',
  '--aideon-navigation-width': 'reference.size.navigation',
  '--aideon-shell-gap': 'reference.space.5',
  '--aideon-space-2xl': 'reference.space.8',
  '--aideon-space-2xs': 'reference.space.1',
  '--aideon-space-3xl': 'reference.space.12',
  '--aideon-space-cluster': 'reference.space.3',
  '--aideon-space-field-gap': 'reference.space.2',
  '--aideon-space-lg': 'reference.space.5',
  '--aideon-space-md': 'reference.space.4',
  '--aideon-space-panel-padding': 'reference.space.6',
  '--aideon-space-section': 'reference.space.6',
  '--aideon-space-sm': 'reference.space.3',
  '--aideon-space-xl': 'reference.space.6',
  '--aideon-space-xs': 'reference.space.2',
  '--aideon-toolbar-height': 'reference.size.toolbar',
};

const compatibilityAliases = {
  '--aideon-status-danger': '--aideon-status-error',
  '--aideon-status-danger-soft': '--aideon-status-error-soft',
  '--aideon-status-muted': '--aideon-status-stale',
  '--aideon-status-muted-soft': '--aideon-status-stale-soft',
  '--aideon-status-neutral': '--aideon-status-info',
  '--aideon-status-neutral-soft': '--aideon-status-info-soft',
};

const tokenVariable = (tokenPath) => `--aideon-${tokenPath.replaceAll('.', '-')}`;
const declaration = (name, value) => `  ${name}: ${value};`;

const createDictionary = (sourceDirectory, semanticFile) =>
  new StyleDictionary({
    source: [join(sourceDirectory, 'reference.tokens.json'), join(sourceDirectory, semanticFile)],
    usesDtcg: true,
    platforms: { css: {} },
  });

const originalReference = (token) => {
  const value = token.original.$value;
  const match = typeof value === 'string' ? /^\{([^}]+)\}$/.exec(value) : undefined;
  return match?.[1];
};

const compositeReference = (value) => {
  if (typeof value !== 'string') {
    throw new Error('Typography values must reference the reference tier');
  }
  const match = /^\{([^}]+)\}$/.exec(value);
  if (!match) throw new Error(`Typography value ${value} must reference the reference tier`);
  return `var(${tokenVariable(match[1])})`;
};

const renderTypographyValue = (token) => {
  const value = token.original.$value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const { fontFamily, fontSize, fontWeight, lineHeight } = value;
  return `${compositeReference(fontWeight)} ${compositeReference(fontSize)}/${compositeReference(lineHeight)} ${compositeReference(fontFamily)}`;
};

const renderReferenceDeclarations = (tokens) =>
  tokens
    .filter((token) => token.path[0] === 'reference')
    .map((token) => {
      const value =
        token.$type === 'cubicBezier' && Array.isArray(token.$value)
          ? `cubic-bezier(${token.$value.join(', ')})`
          : String(token.$value);
      return declaration(tokenVariable(token.path.join('.')), value);
    });

const renderSemanticDeclarations = (tokens) =>
  tokens
    .filter((token) => token.path[0] !== 'reference')
    .map((token) => {
      const reference = originalReference(token);
      const typography = token.$type === 'typography' ? renderTypographyValue(token) : undefined;
      if (!reference && !typography) {
        throw new Error(`Semantic token ${token.path.join('.')} must reference a reference token`);
      }
      return declaration(
        tokenVariable(token.path.join('.')),
        typography ?? `var(${tokenVariable(reference)})`,
      );
    });

const renderAliases = (aliases) =>
  Object.entries(aliases).map(([name, tokenPath]) =>
    declaration(name, `var(${tokenVariable(tokenPath)})`),
  );

const renderCompatibilityAliases = () =>
  Object.entries(compatibilityAliases).map(([name, target]) => declaration(name, `var(${target})`));

const renderCss = (lightTokens, darkTokens) => {
  const light = [
    ...renderReferenceDeclarations(lightTokens),
    '',
    ...renderSemanticDeclarations(lightTokens),
    '',
    ...renderAliases(shadcnAliases),
    ...renderAliases(productAliases),
    ...renderAliases(referenceAliases),
    ...renderCompatibilityAliases(),
  ];
  const dark = [
    ...renderSemanticDeclarations(darkTokens),
    '',
    ...renderAliases(shadcnAliases),
    ...renderAliases(productAliases),
  ];

  return [
    '/* Generated by tools/generate-tokens.mjs. Do not edit. */',
    '',
    ':root {',
    ...light,
    '}',
    '',
    '.dark {',
    ...dark,
    '}',
    '',
  ].join('\n');
};

const valueFor = (tokens, path) => {
  const token = tokens.find((candidate) => candidate.path.join('.') === path);
  if (!token) throw new Error(`Missing token ${path}`);
  return String(token.$value);
};

const renderTypeScript = (tokens) => `// Generated by tools/generate-tokens.mjs. Do not edit.

export const generatedSpacingScale = {
  '2xs': '${valueFor(tokens, 'reference.space.1')}',
  xs: '${valueFor(tokens, 'reference.space.2')}',
  sm: '${valueFor(tokens, 'reference.space.3')}',
  md: '${valueFor(tokens, 'reference.space.4')}',
  lg: '${valueFor(tokens, 'reference.space.5')}',
  xl: '${valueFor(tokens, 'reference.space.6')}',
  '2xl': '${valueFor(tokens, 'reference.space.8')}',
  '3xl': '${valueFor(tokens, 'reference.space.12')}',
} as const;

export const generatedRadiusScale = {
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
  frame: 'var(--aideon-radius-frame)',
} as const;

export const generatedElevationScale = {
  shell: 'var(--aideon-elevation-shell)',
  panel: 'var(--aideon-elevation-panel)',
  frame: 'var(--aideon-elevation-frame)',
} as const;
`;

export async function generateTokenArtifacts({ sourceDirectory = defaultSourceDirectory } = {}) {
  const [lightDictionary, darkDictionary] = [
    createDictionary(sourceDirectory, 'semantic-light.tokens.json'),
    createDictionary(sourceDirectory, 'semantic-dark.tokens.json'),
  ];
  const [light, dark] = await Promise.all([
    lightDictionary.getPlatformTokens('css'),
    darkDictionary.getPlatformTokens('css'),
  ]);

  const [css, typeScript] = await Promise.all([
    format(renderCss(light.allTokens, dark.allTokens), {
      ...cssFormatOptions,
      filepath: generatedCssPath,
      plugins: [organizeImports, tailwindcss],
    }),
    format(renderTypeScript(light.allTokens), {
      ...typeScriptFormatOptions,
      filepath: generatedTypeScriptPath,
      plugins: [organizeImports, tailwindcss],
    }),
  ]);

  return { css, typeScript };
}

const assertCurrent = async (path, expected) => {
  const actual = await readFile(path, 'utf8').catch(() => undefined);
  if (actual !== expected) {
    throw new Error(
      `Generated token artifact is stale: ${relative(repositoryRoot, path)}. Run pnpm run design:tokens.`,
    );
  }
};

export async function checkTokenArtifacts(artifacts) {
  const expected = artifacts ?? (await generateTokenArtifacts());
  await Promise.all([
    assertCurrent(generatedCssPath, expected.css),
    assertCurrent(generatedTypeScriptPath, expected.typeScript),
  ]);
}

const run = async () => {
  const check = process.argv.includes('--check');
  const artifacts = await generateTokenArtifacts();

  if (check) {
    await checkTokenArtifacts(artifacts);
    console.log('Generated design tokens are current.');
    return;
  }

  await Promise.all([
    writeFile(generatedCssPath, artifacts.css),
    writeFile(generatedTypeScriptPath, artifacts.typeScript),
  ]);
  console.log('Generated design token artifacts.');
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await run();
}
