// ESLint v9 flat config (pure flat presets, no compat, TS type-checked)
import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import promise from 'eslint-plugin-promise';
import regexp from 'eslint-plugin-regexp';
import security from 'eslint-plugin-security';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import { defineConfig, globalIgnores } from 'eslint/config';
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
      'app/AideonDesktop/legacy/**',
      '**/.pnpm/**',
      '**/out/**',
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

  // Relax lint for the flattened desktop TS/React code while types are being aligned
  {
    files: ['app/AideonDesktop/src/**/*.{ts,tsx}', 'app/AideonDesktop/tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
      '@typescript-eslint/no-unnecessary-type-conversion': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
      'unicorn/filename-case': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/explicit-length-check': 'off',
      'unicorn/prefer-number-properties': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'sonarjs/prefer-read-only-props': 'off',
      'sonarjs/no-nested-conditional': 'off',
      'sonarjs/table-header': 'off',
      'sonarjs/void-use': 'off',
      'sonarjs/function-return-type': 'off',
      'sonarjs/cognitive-complexity': 'off',
      'sonarjs/pseudo-random': 'off',
      'sonarjs/deprecation': 'off',
      'promise/always-return': 'off',
      'security/detect-object-injection': 'off',
    },
  },
);
