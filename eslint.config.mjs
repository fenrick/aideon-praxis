// ESLint v9 flat config
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import importPlugin from 'eslint-plugin-import';
import promise from 'eslint-plugin-promise';
import regexp from 'eslint-plugin-regexp';
import unicorn from 'eslint-plugin-unicorn';
import security from 'eslint-plugin-security';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig(
  [
    globalIgnores([
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'src/stories/**',
      'tests/**/fixtures/**',
      '**/*.min.js',
      '**/.yarn/**',
      '**/out/**',
    ]),
  ],

  js.configs.recommended,

  // Base language options for all files (JS)
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        __dirname: 'readonly',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        module: 'readonly',
        require: 'readonly',
        window: 'readonly',
        document: 'readonly',
      },
    },
  },

  // sonarjs: plugin registered below with project overrides
  // Register additional plugins via overrides below

  {
    name: 'project-overrides',
    plugins: { sonarjs, security, import: importPlugin, promise, regexp, unicorn, '@typescript-eslint': tseslint.plugin },
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'src/stories/**',
      'tests/**/fixtures/**',
      '**/*.min.js',
      '**/.yarn/**',
      '**/out/**',
    ],
    rules: {
      'sonarjs/cognitive-complexity': ['error', 8],
      'unicorn/no-null': 'off',
      'unicorn/prefer-module': 'off',
      'import/no-unresolved': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },

  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
        allowDefaultProject: ['packages/**/src/stories/**/*'],
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-unused-vars': 'off',
    },
  },
);
