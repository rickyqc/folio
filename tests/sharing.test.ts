import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { hostUrl, parseConfig } from '../src/config/load.ts';
import { OG_HEIGHT, OG_WIDTH, renderOgImage } from '../src/lib/og-image.ts';
import { qrPng, qrSvg } from '../src/lib/qr.ts';

const publicDir = resolve(import.meta.dirname, '../public');

/** Width and height from a PNG's IHDR chunk. */
function pngSize(png: Buffer): { width: number; height: number } {
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

describe('hostUrl', () => {
  it('prefers FOLIO_SITE_URL, then Vercel, then Netlify', () => {
    expect(
      hostUrl({ FOLIO_SITE_URL: 'https://a.dev/', VERCEL_PROJECT_PRODUCTION_URL: 'b.vercel.app' }),
    ).toBe('https://a.dev/');
    expect(hostUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'my-folio.vercel.app' })).toBe(
      'https://my-folio.vercel.app',
    );
    expect(hostUrl({ NETLIFY: 'true', URL: 'https://my-folio.netlify.app' })).toBe(
      'https://my-folio.netlify.app',
    );
  });

  it('ignores a URL variable outside Netlify and anything that is not a web address', () => {
    expect(hostUrl({ URL: 'https://not-netlify.dev' })).toBeUndefined();
    expect(hostUrl({ FOLIO_SITE_URL: 'not a url' })).toBeUndefined();
    expect(hostUrl({})).toBeUndefined();
  });

  it('is used only when site.url is not set', () => {
    const yaml = (url = '') => `${url}profile:\n  name: Jane\n`;
    const opts = { publicDir, fallbackUrl: 'https://my-folio.vercel.app' };
    expect(parseConfig(yaml(), opts).site.url).toBe('https://my-folio.vercel.app/');
    expect(parseConfig(yaml('site:\n  url: https://jane.dev\n'), opts).site.url).toBe(
      'https://jane.dev/',
    );
  });
});

describe('share button option', () => {
  it('is off by default so pages ship no JavaScript', () => {
    expect(parseConfig('profile:\n  name: Jane\n', { publicDir }).footer.share).toBe(false);
  });
});

describe('renderOgImage', () => {
  it('renders a 1200×630 PNG with an SVG avatar', async () => {
    const png = await renderOgImage({
      name: 'Jane Park',
      bio: 'Designer',
      avatar: 'avatar.svg',
      url: 'https://jane.dev/',
      accent: '#0071e3',
      publicDir,
    });
    expect(pngSize(png)).toEqual({ width: OG_WIDTH, height: OG_HEIGHT });
  });

  it('falls back to initials without an avatar', async () => {
    const png = await renderOgImage({
      name: 'Jane Park',
      url: 'https://jane.dev/',
      accent: '#ffd60a',
      publicDir,
    });
    expect(pngSize(png)).toEqual({ width: OG_WIDTH, height: OG_HEIGHT });
  });
});

describe('QR codes', () => {
  it('encodes the page as SVG and a 1024px PNG', async () => {
    expect(await qrSvg('https://jane.dev/')).toMatch(/^<svg[\s\S]*<\/svg>\s*$/);
    expect(pngSize(await qrPng('https://jane.dev/')).width).toBe(1024);
  });
});
