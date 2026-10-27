import type { APIRoute, GetStaticPaths } from 'astro';
import { loadConfig } from '../config/load.ts';
import { qrSvg } from '../lib/qr.ts';

// qr.svg, for printing at any size. Needs the page's public address, like qr.png.
export const getStaticPaths = (() => {
  return loadConfig().site.url ? [{ params: { name: 'qr' } }] : [];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async () => {
  const svg = await qrSvg(loadConfig().site.url ?? '');
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
};
