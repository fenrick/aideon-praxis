// ESLint v9 flat config (pure flat presets, no compat, TS type-checked)
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-plugin-prettier/recommended';
import promise from 'eslint-plugin-promise';
import regexp from 'eslint-plugin-regexp';
import security from 'eslint-plugin-security';
import sonarjs from 'eslint-plugin-sonarjs';
import svelte from 'eslint-plugin-svelte';
import unicorn from 'eslint-plugin-unicorn';
import { defineConfig, globalIgnores } from 'eslint/config';
import svelteParser from 'svelte-eslint-parser';
import tseslint from 'typescript-eslint';

// Constrain TS typed configs to only TS files in this repo
const typedTsConfigs = [
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  ...tseslint.configs.recommendedTypeChecked,
].map((cfg) => ({ ...cfg, files: ['**/*.{ts,tsx}'] }));

export default defineConfig(
  // Global ignores first so they short‑circuit for all subsequent configs
  [
    globalIgnores([
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '**/.pnpm/**',
      '**/out/**',
      '**/.svelte-kit/**',
    ]),
  ],
  // Base JS rules roughly equivalent to the “core” checks Sonar also relies on
  js.configs.recommended,

  // TypeScript: avoid applying typed configs globally; handled per-file below

  // Base language options for JS/MJS
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },

  // High-value community rule packs that cover areas Sonar also cares about
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  promise.configs['flat/recommended'],
  regexp.configs['flat/recommended'],
  unicorn.configs.recommended,
  sonarjs.configs.recommended,
  // Svelte support
  ...svelte.configs['flat/recommended'],
  prettier,

  // Security hygiene rules (note: NOT equivalent to Sonar’s taint analysis)
  security.configs.recommended,

  // Apply TS typed configs only to TS files
  ...typedTsConfigs,

  // Project-specific tweaks
  {
    name: 'project-overrides',
    rules: {
      // Sonar-like maintainability signal
      'sonarjs/cognitive-complexity': ['error', 8],

      // Keep noise down where packs overlap
      'unicorn/no-null': 'off', // often too strict
      'unicorn/prefer-module': 'off', // off if you still use CommonJS
      'import/no-unresolved': 'off', // leave to TS when using path aliases
    },
  },

  // TS parser + generic rules
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: false,
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },

  // Allow generated shadcn components to keep their original prop names
  {
    files: ['app/PraxisCanvas/src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'unicorn/prevent-abbreviations': 'off',
      'sonarjs/prefer-read-only-props': 'off',
      'sonarjs/deprecation': 'off',
      '@typescript-eslint/no-deprecated': 'off',
      'sonarjs/table-header': 'off',
    },
  },

  // Svelte files
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tsParser,
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        localStorage: 'readonly',
      },
    },
    rules: {
      // Type names like HTMLDivElement shouldn't be flagged as undefined in TS blocks
      'no-undef': 'off',
      'svelte/no-target-blank': 'error',
      'svelte/no-at-debug-tags': 'error',
      'svelte/no-reactive-functions': 'error',
      'svelte/no-reactive-literals': 'error',
      // UI ergonomics: tone down noisy cross-env rules for .svelte
      'unicorn/filename-case': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/prefer-query-selector': 'off',
      'unicorn/prefer-top-level-await': 'off',
      'sonarjs/cognitive-complexity': 'off',
      'sonarjs/no-nested-conditional': 'off',
      'sonarjs/pseudo-random': 'off',
      'no-empty': 'off',
      'promise/param-names': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // Test files: relax unsafe + ergonomics rules that are noisy in mocks
  {
    files: ['**/*.test.{ts,tsx}', '**/tests/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: false,
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/prefer-readonly': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'promise/param-names': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      // This specific test walks the renderer tree; non-literal fs args are expected
      'security/detect-non-literal-fs-filename': 'off',
    },
  },
);
