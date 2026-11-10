import type { APIRoute } from 'astro';
import { PAGES } from '../site';

// A sitemap needs absolute URLs, so it stays empty without a known address.
export const GET: APIRoute = ({ site }) => {
  const entries = site
    ? PAGES.map((path) => `\n  <url><loc>${new URL(path, site).toString()}</loc></url>`).join('')
    : '';
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
