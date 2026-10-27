import type { APIRoute } from 'astro';
import { loadConfig } from '../config/load.ts';

// A sitemap needs absolute URLs, so it lists the page only once site.url is set.
export const GET: APIRoute = () => {
  const { site } = loadConfig();
  const entry = site.url ? `\n  <url><loc>${site.url}</loc></url>` : '';
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entry}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
