import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isOptimizable, optimize, render, variants } from '../src/lib/images.ts';
import { renderOgImage } from '../src/lib/og-image.ts';

const publicDir = mkdtempSync(join(tmpdir(), 'folio-images-'));

beforeAll(async () => {
  const photo = { width: 3000, height: 2000, channels: 3 as const, background: '#c86' };
  await sharp({ create: photo }).jpeg({ quality: 95 }).toFile(join(publicDir, 'Big Photo.jpg'));
  // Stored landscape but tagged to display rotated, the way phones save portrait shots.
  await sharp({ create: photo })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toFile(join(publicDir, 'sideways.jpg'));
  await sharp({ create: { ...photo, width: 64, height: 64 } })
    .png()
    .toFile(join(publicDir, 'tiny.png'));
});
afterAll(() => rmSync(publicDir, { recursive: true, force: true }));

describe('isOptimizable', () => {
  it('handles local photos only', () => {
    expect(isOptimizable('me.jpg')).toBe(true);
    expect(isOptimizable('me.HEIC')).toBe(false);
    expect(isOptimizable('avatar.svg')).toBe(false);
    expect(isOptimizable('https://example.com/me.jpg')).toBe(false);
  });
});

describe('optimize', () => {
  it('turns a large avatar into small square WebP sizes', async () => {
    const img = await optimize(publicDir, 'Big Photo.jpg', 'avatar');
    expect(img).toEqual({
      src: 'folio-images/Big-Photo-288-sq.webp',
      srcset:
        'folio-images/Big-Photo-96-sq.webp 96w, folio-images/Big-Photo-192-sq.webp 192w, folio-images/Big-Photo-288-sq.webp 288w',
      width: 96,
      height: 96,
    });
  });

  it('keeps the shape of images and reports their size to prevent layout shift', async () => {
    const img = await optimize(publicDir, 'Big Photo.jpg', 'image');
    expect(img.srcset).toContain('Big-Photo-1440.webp 1440w');
    expect([img.width, img.height]).toEqual([3000, 2000]);
  });

  it('respects phone rotation', async () => {
    const img = await optimize(publicDir, 'sideways.jpg', 'image');
    expect([img.width, img.height]).toEqual([2000, 3000]);
  });

  it('never makes a small image bigger', async () => {
    expect((await variants(publicDir, 'tiny.png', 'image')).map((v) => v.width)).toEqual([64]);
  });

  it('passes SVGs and remote images through', async () => {
    expect(await optimize(publicDir, 'avatar.svg', 'avatar')).toEqual({ src: 'avatar.svg' });
  });
});

describe('render', () => {
  it('writes a WebP at the requested size, far smaller than the original', async () => {
    const [small] = await variants(publicDir, 'Big Photo.jpg', 'avatar');
    if (!small) throw new Error('expected a variant');
    const webp = await render(publicDir, small);
    const meta = await sharp(webp).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['webp', 96, 96]);
    expect(webp.length).toBeLessThan(5_000);
  });
});

describe('share image', () => {
  it('uses a photo avatar', async () => {
    const png = await renderOgImage({
      name: 'Jane',
      avatar: 'Big Photo.jpg',
      url: 'https://jane.dev/',
      accent: '#0071e3',
      publicDir,
    });
    expect((await sharp(png).metadata()).width).toBe(1200);
  });
});
