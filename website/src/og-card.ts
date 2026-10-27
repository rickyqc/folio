// The website's share card: what iMessage, Slack and X show when someone sends the link.
// Rendered at build time with the same tools as users' cards (Satori + resvg, Inter).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';

const require = createRequire(import.meta.url);
const font = (weight: number) =>
  readFileSync(require.resolve(`@fontsource/inter/files/inter-latin-${weight}-normal.woff`));

type Style = Record<string, string | number>;
type El = { type: string; props: { style?: Style; children?: unknown; [key: string]: unknown } };
const div = (style: Style, children?: unknown): El => ({ type: 'div', props: { style, children } });

const BLUE = '#0071e3';
const INK = '#1d1d1f';
const MUTED = '#6e6e73';

/** The sample avatar, rasterized so Satori can draw it. Built from website/, so public/ is one up. */
function avatar(): string {
  const svg = readFileSync(resolve(process.cwd(), '../public/avatar.svg'));
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 200 } }).render().asPng();
  return `data:image/png;base64,${png.toString('base64')}`;
}

function logo(): El {
  const bar = (color: string, opacity = 1) =>
    div({ width: 26, height: 7, borderRadius: 4, background: color, opacity });
  return div(
    {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 4,
      width: 48,
      height: 48,
      borderRadius: 13,
      background: INK,
    },
    [bar('#2997ff'), bar('#f5f5f7'), bar('#f5f5f7', 0.55)],
  );
}

function button(title: string, sub?: string, featured = false): El {
  return div(
    {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: sub ? 62 : 52,
      borderRadius: 14,
      background: featured ? BLUE : '#ffffff',
      border: featured ? 'none' : '1.5px solid rgba(0,0,0,0.1)',
      color: featured ? '#ffffff' : INK,
    },
    [
      div({ fontSize: 17, fontWeight: 500 }, title),
      ...(sub
        ? [div({ fontSize: 13, color: featured ? '#ffffff' : MUTED, marginTop: 2 }, sub)]
        : []),
    ],
  );
}

function phone(): El {
  return div(
    {
      display: 'flex',
      position: 'absolute',
      right: 70,
      top: 64,
      width: 340,
      height: 680,
      padding: 13,
      borderRadius: 60,
      background: INK,
      transform: 'rotate(4deg)',
    },
    div(
      {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        padding: '64px 22px 0',
        borderRadius: 48,
        background: '#fbfbfd',
      },
      [
        {
          type: 'img',
          props: { src: avatar(), width: 84, height: 84, style: { borderRadius: 42 } },
        },
        div(
          { fontSize: 24, fontWeight: 700, color: INK, marginTop: 14, letterSpacing: '-0.02em' },
          'Jane Park',
        ),
        div({ fontSize: 14, color: MUTED, marginTop: 4 }, 'Product designer in San Francisco'),
        div({ display: 'flex', flexDirection: 'column', width: '100%', gap: 10, marginTop: 24 }, [
          button('Read my newsletter', 'Every other Sunday', true),
          div({ fontSize: 13, fontWeight: 600, color: MUTED, margin: '8px 0 0 4px' }, 'Work'),
          button('Portfolio', 'Apps, brands and type'),
          button('Book a design review'),
          button('Shop my icon set'),
        ]),
      ],
    ),
  );
}

export async function renderShareCard(): Promise<Buffer> {
  const tree = div(
    {
      display: 'flex',
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      background: '#fbfbfd',
      backgroundImage:
        'radial-gradient(circle at 82% 30%, rgba(0,113,227,0.16), rgba(0,113,227,0) 55%), radial-gradient(circle at 10% 100%, rgba(255,105,180,0.10), rgba(255,105,180,0) 45%)',
      fontFamily: 'Inter',
      color: INK,
    },
    [
      div(
        {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 0 0 84px',
          width: 700,
        },
        [
          div({ display: 'flex', alignItems: 'center', gap: 14 }, [
            logo(),
            div({ fontSize: 38, fontWeight: 700, letterSpacing: '-0.03em' }, 'Folio'),
          ]),
          div(
            {
              display: 'flex',
              flexDirection: 'column',
              marginTop: 34,
              fontSize: 82,
              fontWeight: 800,
              lineHeight: 1.0,
              letterSpacing: '-0.045em',
            },
            [div({}, 'Your links.'), div({}, 'Your page.'), div({ color: BLUE }, 'Your domain.')],
          ),
          div(
            {
              fontSize: 30,
              color: MUTED,
              marginTop: 30,
              letterSpacing: '-0.01em',
              lineHeight: 1.3,
            },
            'A free, open-source link-in-bio page you own. Live in five minutes.',
          ),
        ],
      ),
      phone(),
    ],
  );

  const svg = await satori(tree as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Inter', data: font(500), weight: 500, style: 'normal' },
      { name: 'Inter', data: font(700), weight: 700, style: 'normal' },
      { name: 'Inter', data: font(800), weight: 800, style: 'normal' },
    ],
  });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}
