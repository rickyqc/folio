import type { APIRoute } from 'astro';
import { loadConfig } from '../config/load.ts';

export const GET: APIRoute = () => {
  const { site } = loadConfig();
  const sitemap = site.url ? `\nSitemap: ${new URL('sitemap.xml', site.url).toString()}` : '';
  return new Response(`User-agent: *\nAllow: /${sitemap}\n`, {
    headers: { 'Content-Type': 'text/plain' },
  });
};
