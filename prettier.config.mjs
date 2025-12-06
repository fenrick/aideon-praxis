/**
 * Prettier configuration for the React-only workspace.
 * Explicitly list plugins to avoid Prettier auto-loading legacy Svelte plugins.
 */
export default {
  plugins: ['prettier-plugin-organize-imports'],
  pluginSearchDirs: false,

  // optional but recommended to make formatting deterministic:
  semi: true,
  singleQuote: true,
  jsxSingleQuote: false,
  trailingComma: 'all',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'always',
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  endOfLine: 'lf',
};
