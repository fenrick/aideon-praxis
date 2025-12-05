// ESLint v9 flat config (pure flat presets, TS type-checked)
import js from '@eslint/js';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier/flat';
import importPlugin from 'eslint-plugin-import';
import promise from 'eslint-plugin-promise';
import react from 'eslint-plugin-react';
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

const configs = [
  globalIgnores([
    'node_modules/**',
    'dist/**',
    'build/**',
    'coverage/**',
    'app/AideonDesktop/legacy/**',
    'app/AideonDesktop/src/design-system/components/**',
    '**/.pnpm/**',
    '**/out/**',
  ]),

  // Base JS rules roughly equivalent to the “core” checks Sonar also relies on
  js.configs.recommended,

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
  react.configs['flat/recommended'],
  react.configs['flat/jsx-runtime'],

  // Security hygiene rules (note: NOT equivalent to Sonar’s taint analysis)
  security.configs.recommended,

  // Disable stylistic rules that conflict with Prettier formatting
  prettierConfig,

  // Apply TS typed configs only to TS files
  ...typedTsConfigs,

  // Project-specific tweaks
  {
    name: 'project-overrides',
    rules: {
      'sonarjs/cognitive-complexity': ['error', 8],
      'unicorn/no-null': 'off',
      'unicorn/prefer-module': 'off',
      'import/no-unresolved': 'off',
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
      'security/detect-non-literal-fs-filename': 'off',
    },
  },

  // Relax lint for the flattened desktop TS/React code while types are being aligned
  {
    files: ['app/AideonDesktop/src/**/*.{ts,tsx}', 'app/AideonDesktop/tests/**/*.{ts,tsx}'],
  },

  // Enforce Prettier formatting (including JSX/TSX)
  {
    plugins: { prettier: prettierPlugin },
    rules: {
      'prettier/prettier': [
        'error',
        {
          bracketSameLine: false,
          singleQuote: true,
          jsxSingleQuote: false,
          trailingComma: 'all',
        },
      ],
    },
  },
];

export default defineConfig(configs);
