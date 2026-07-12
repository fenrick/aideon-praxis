/**
 * Prettier configuration for the React-only workspace.
 * Explicitly list plugins to avoid Prettier auto-loading legacy Svelte plugins.
 */
export default {
  // prettier-plugin-tailwindcss must be listed last (it overrides class order).
  plugins: ['prettier-plugin-organize-imports', 'prettier-plugin-tailwindcss'],

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

  // Markdown/MDX: hard-wrap prose at 120 to match .markdownlint.json MD013
  // (line_length 120), enforced via the existing node:format:check gate.
  // Vendored skill docs under .agents/ are excluded in .prettierignore.
  overrides: [
    {
      files: ['*.md', '*.mdx'],
      options: { proseWrap: 'always', printWidth: 120 },
    },
  ],
};
