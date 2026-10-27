import { resolve } from 'node:path';
import type { APIRoute, GetStaticPaths } from 'astro';
import { loadConfig } from '../../config/load.ts';
import { isOptimizable, render, variants, type Variant } from '../../lib/images.ts';

const publicDir = resolve('public');

// One file per size of each local photo in the config (avatar and image blocks).
export const getStaticPaths = (async () => {
  const { profile, blocks } = loadConfig();
  const wanted: [string, 'avatar' | 'image'][] = [
    ...(profile.avatar ? [[profile.avatar, 'avatar'] as [string, 'avatar']] : []),
    ...blocks.flatMap((b) => (b.type === 'image' ? [[b.src, 'image'] as [string, 'image']] : [])),
  ];
  const all = await Promise.all(
    wanted
      .filter(([src]) => isOptimizable(src))
      .map(([src, role]) => variants(publicDir, src, role)),
  );
  const unique = new Map(all.flat().map((v) => [v.file, v]));
  return [...unique.values()].map((variant) => ({
    params: { file: variant.file },
    props: { variant },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ variant: Variant }> = async ({ props }) => {
  const webp = await render(publicDir, props.variant);
  return new Response(new Uint8Array(webp), { headers: { 'Content-Type': 'image/webp' } });
};
