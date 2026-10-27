import { resolve } from 'node:path';
import type { APIRoute, GetStaticPaths } from 'astro';
import { loadConfig } from '../config/load.ts';
import { renderOgImage } from '../lib/og-image.ts';
import { qrPng } from '../lib/qr.ts';

// og.png (the share preview card) and qr.png. Both need the page's public address, which
// comes from site.url or the host, so they're skipped until one is known.
export const getStaticPaths = (() => {
  return loadConfig().site.url ? [{ params: { name: 'og' } }, { params: { name: 'qr' } }] : [];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const { site, profile, theme } = loadConfig();
  const url = site.url ?? '';
  const png =
    params.name === 'qr'
      ? await qrPng(url)
      : await renderOgImage({
          name: profile.name,
          bio: profile.bio,
          avatar: profile.avatar,
          url,
          accent: theme.accent,
          publicDir: resolve('public'),
        });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
