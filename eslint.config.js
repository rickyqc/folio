import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      '**/dist/',
      '**/dist-e2e/',
      '**/.astro/',
      '**/node_modules/',
      'test-results/',
      'playwright-report/',
      'lighthouse-report/',
      '.lighthouseci/',
    ],
  },
  js.configs.recommended,
  tseslint.configs.strict,
  astro.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
  },
);
