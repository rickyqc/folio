import type { APIRoute } from 'astro';

// One page to list. A sitemap needs absolute URLs, so it stays empty without a known address.
export const GET: APIRoute = ({ site }) => {
  const entry = site ? `\n  <url><loc>${new URL('/', site).toString()}</loc></url>` : '';
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entry}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
