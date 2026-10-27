// Renders the social preview card (the image shown when the link is shared) at build time.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import sharp from 'sharp';
import { readableTextOn } from './color.ts';

export interface OgInput {
  name: string;
  bio?: string | undefined;
  /** A file path inside public/, or a remote URL (which is skipped to keep builds offline). */
  avatar?: string | undefined;
  url: string;
  accent: string;
  publicDir: string;
}

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const require = createRequire(import.meta.url);

function font(weight: 400 | 600): Buffer {
  return readFileSync(require.resolve(`@fontsource/inter/files/inter-latin-${weight}-normal.woff`));
}

/** Returns a PNG data URI Satori can draw: SVGs are rasterized, photos cropped square and shrunk. */
async function avatarDataUri(
  avatar: string | undefined,
  publicDir: string,
): Promise<string | undefined> {
  if (!avatar || /^https?:\/\//i.test(avatar)) return undefined;
  const file = join(publicDir, avatar);
  const ext = extname(file).toLowerCase();
  let png: Buffer;
  if (ext === '.svg') {
    png = new Resvg(readFileSync(file), { fitTo: { mode: 'width', value: 440 } }).render().asPng();
  } else if (/^\.(jpe?g|png|webp|avif|tiff?)$/.test(ext)) {
    png = await sharp(file)
      .rotate()
      .resize({ width: 440, height: 440, fit: 'cover' })
      .png()
      .toBuffer();
  } else {
    return undefined;
  }
  return `data:image/png;base64,${png.toString('base64')}`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, children?: unknown, extra = {}): Node => ({
  type,
  props: { style, children, ...extra },
});

export async function renderOgImage(input: OgInput): Promise<Buffer> {
  const avatar = await avatarDataUri(input.avatar, input.publicDir);
  const host = new URL(input.url).host + new URL(input.url).pathname.replace(/\/$/, '');

  const avatarNode = avatar
    ? h('img', { width: 220, height: 220, borderRadius: 110, objectFit: 'cover' }, undefined, {
        src: avatar,
        width: 220,
        height: 220,
      })
    : h(
        'div',
        {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 220,
          height: 220,
          borderRadius: 110,
          background: input.accent,
          color: readableTextOn(input.accent),
          fontSize: 88,
          fontWeight: 600,
        },
        initials(input.name),
      );

  const tree = h(
    'div',
    {
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      height: '100%',
      padding: '0 96px',
      gap: 64,
      background: '#fbfbfd',
      fontFamily: 'Inter',
      color: '#1d1d1f',
    },
    [
      avatarNode,
      h('div', { display: 'flex', flexDirection: 'column', flex: 1, gap: 20 }, [
        h(
          'div',
          { fontSize: 76, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.05 },
          input.name,
        ),
        ...(input.bio
          ? [
              h(
                'div',
                { fontSize: 36, color: '#6e6e73', lineHeight: 1.3, letterSpacing: '-0.01em' },
                input.bio,
              ),
            ]
          : []),
        h(
          'div',
          {
            display: 'flex',
            alignSelf: 'flex-start',
            marginTop: 16,
            padding: '12px 28px',
            borderRadius: 999,
            background: input.accent,
            color: readableTextOn(input.accent),
            fontSize: 30,
            fontWeight: 600,
          },
          host,
        ),
      ]),
    ],
  );

  const svg = await satori(tree as Parameters<typeof satori>[0], {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: [
      { name: 'Inter', data: font(400), weight: 400, style: 'normal' },
      { name: 'Inter', data: font(600), weight: 600, style: 'normal' },
    ],
  });
  return new Resvg(svg, { fitTo: { mode: 'width', value: OG_WIDTH } }).render().asPng();
}
