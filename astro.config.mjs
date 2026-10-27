// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  build: {
    // Inline all CSS so the page is a single request (see Quality bar: under 50 KB).
    inlineStylesheets: 'always',
  },
});
