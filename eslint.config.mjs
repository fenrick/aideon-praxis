// ESLint v9 flat config (pure flat presets, no compat, TS type-checked)
import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-plugin-prettier';
import promise from 'eslint-plugin-promise';
import regexp from 'eslint-plugin-regexp';
import security from 'eslint-plugin-security';
import sonarjs from 'eslint-plugin-sonarjs';
import svelte from 'eslint-plugin-svelte';
import unicorn from 'eslint-plugin-unicorn';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  // Global ignores first so they short‑circuit for all subsequent configs
  [
    globalIgnores([
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '**/.yarn/**',
      '**/out/**',
    ]),
  ],
  // Base JS rules roughly equivalent to the “core” checks Sonar also relies on
  js.configs.recommended,

  // TypeScript: typed configs
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  ...tseslint.configs.recommendedTypeChecked,

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

  // Security hygiene rules (note: NOT equivalent to Sonar’s taint analysis)
  security.configs.recommended,

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
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // Prettier as an ESLint rule (keeps formatting surfaced in editors/CI)
      'prettier/prettier': 'error',
    },
    plugins: { prettier },
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
    },
  },

  // Svelte files
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelte.parser,
      parserOptions: {
        svelteFeatures: { experimentalGenerics: true },
        // Let the Svelte parser use TS parser for <script lang="ts">
        parser: tseslint.parser,
        projectService: false,
        tsconfigRootDir: import.meta.dirname,
        project: ['./tsconfig.eslint.json'],
        extraFileExtensions: ['.svelte'],
      },
    },
    rules: {
      // Svelte plugin recommended already included; add any project preferences here
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
