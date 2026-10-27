import { Resvg } from '@resvg/resvg-js';
import type { APIRoute } from 'astro';

// The Folio mark, full-bleed (iOS rounds the corners itself), for bookmarks and small previews.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#1d1d1f"/><rect x="8" y="8" width="16" height="4" rx="2" fill="#2997ff"/><rect x="8" y="14" width="16" height="4" rx="2" fill="#f5f5f7"/><rect x="8" y="20" width="16" height="4" rx="2" fill="#f5f5f7" opacity=".55"/></svg>`;

export const GET: APIRoute = () => {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 180 } }).render().asPng();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
