// @ts-check
import { defineConfig } from 'astro/config';

// Link previews (iMessage, Slack, X) need absolute URLs, so the site needs its own address.
// Vercel provides it at build time; SITE_URL overrides it anywhere else.
const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const site = process.env.SITE_URL ?? (vercel ? `https://${vercel}` : undefined);

// The Folio project website (not the link page Folio generates for users).
export default defineConfig({
  output: 'static',
  ...(site && { site }),
  build: {
    inlineStylesheets: 'always',
  },
});
