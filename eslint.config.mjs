// eslint.config.mjs
// ESLint v9 flat config, ESM, TS-aware, Sonar-style clean code
// Prettier handles formatting; ESLint handles correctness/clean-code.

import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import jsdoc from 'eslint-plugin-jsdoc';
import promise from 'eslint-plugin-promise';
import regexp from 'eslint-plugin-regexp';
import security from 'eslint-plugin-security';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';

import jest from 'eslint-plugin-jest';
import jestDom from 'eslint-plugin-jest-dom';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import testingLibrary from 'eslint-plugin-testing-library';

import eslintConfigPrettier from 'eslint-config-prettier/flat';

import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

// Constrain TS typed configs to TS/TSX only
const typedTsConfigs = [
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  ...tseslint.configs.recommendedTypeChecked,
].map((cfg) => ({
  ...cfg,
  files: ['**/*.{ts,tsx}'],
}));

export default defineConfig([
  // Global ignores
  globalIgnores([
    'node_modules/**',
    'dist/**',
    'build/**',
    'coverage/**',
    'app/AideonDesktop/src/design-system/components/**',
    '**/.pnpm/**',
    '**/out/**',
  ]),

  // Core JS recommendations (base for "clean code" checks)
  js.configs.recommended,

  // Base language options
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    settings: {
      // Allow import/no-unresolved to pick up TS path aliases in package tsconfigs.
      'import/resolver': {
        typescript: {
          project: ['./tsconfig.eslint.json', './app/AideonDesktop/tsconfig.json'],
          alwaysTryTypes: true,
        },
        node: true,
      },
    },
  },

  // Import hygiene (dead imports, cycles, etc.)
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,

  // Promises, regex, unicorn (modern JS/TS patterns)
  promise.configs['flat/recommended'],
  regexp.configs['flat/recommended'],
  unicorn.configs.recommended,

  // Sonar-style code quality and complexity
  sonarjs.configs.recommended,

  // Security hotspot checks (not taint analysis, but still valuable)
  security.configs.recommended,

  // ESLint comments hygiene
  comments.recommended,

  // JSDoc quality (recommended ruleset)
  jsdoc.configs['flat/recommended'],

  // TypeScript typed configs (type-aware rules)
  ...typedTsConfigs,

  // React + JSX (component-level clean code)
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],

  // Accessibility for JSX
  jsxA11y.flatConfigs.recommended,

  // React Hooks rules
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      // Use the plugin's recommended rules
      ...reactHooks.configs.recommended.rules,
      // Tighten the most important one
      'react-hooks/exhaustive-deps': 'error',
    },
  },

  // TS parser + TS-specific rules (on top of the typed presets)
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

  // Project-level Sonar-style tightening
  {
    rules: {
      // Keep cognitive complexity under control
      'sonarjs/cognitive-complexity': ['error', 8],
      // Optional: avoid huge switches
      'sonarjs/max-switch-cases': ['error', 10],
    },
  },

  // Avoid ESLint trying to sort imports; Prettier (with prettier-plugin-organize-imports)
  // is the single source of truth for import ordering.
  {
    name: 'no-eslint-import-sorting',
    rules: {
      'sort-imports': 'off',
      'import/order': 'off',
    },
  },

  // Test files: Jest + Testing Library + jest-dom
  {
    files: ['**/*.{test,spec}.{js,jsx,ts,tsx}'],

    // Jest recommended + style rules
    ...jest.configs['flat/recommended'],
    ...jest.configs['flat/style'],

    // React Testing Library best practices
    ...testingLibrary.configs['flat/react'],

    // jest-dom assertions best practices
    ...jestDom.configs['flat/recommended'],
  },

  // Put eslint-config-prettier LAST so it can disable any formatting rules
  // from the above configs that would conflict with Prettier.
  eslintConfigPrettier,
]);
