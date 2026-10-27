// @ts-check
import { defineConfig } from 'astro/config';

// The Folio project website (not the link page Folio generates for users).
export default defineConfig({
  output: 'static',
  build: {
    inlineStylesheets: 'always',
  },
});
