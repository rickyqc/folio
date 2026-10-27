import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrast, expandHex, readableTextOn } from '../src/lib/color.ts';
import { parseSpotify, parseYouTubeId, spotifyHeight } from '../src/lib/embeds.ts';
import { PLATFORM_IDS, resolveSocial } from '../src/lib/socials.ts';
import { buildVCard } from '../src/lib/vcard.ts';

describe('parseYouTubeId', () => {
  it.each([
    'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    'https://youtube.com/watch?v=aqz-KE-bpKQ&t=42s',
    'https://m.youtube.com/watch?v=aqz-KE-bpKQ',
    'https://youtu.be/aqz-KE-bpKQ?si=share',
    'https://www.youtube.com/shorts/aqz-KE-bpKQ',
    'https://www.youtube.com/embed/aqz-KE-bpKQ',
    'https://www.youtube.com/live/aqz-KE-bpKQ',
  ])('reads %s', (url) => {
    expect(parseYouTubeId(url)).toBe('aqz-KE-bpKQ');
  });

  it.each([
    'https://youtube.com/@janepark',
    'https://vimeo.com/123',
    'not a url',
    'https://youtu.be/short',
  ])('rejects %s', (url) => {
    expect(parseYouTubeId(url)).toBeNull();
  });
});

describe('parseSpotify', () => {
  it('reads tracks, playlists and localized links', () => {
    expect(parseSpotify('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=x')).toEqual({
      kind: 'track',
      id: '4uLU6hMCjMI75M1A2tKUQC',
    });
    expect(
      parseSpotify('https://open.spotify.com/intl-de/playlist/37i9dQZF1DXcBWIGoYBM5M'),
    ).toEqual({
      kind: 'playlist',
      id: '37i9dQZF1DXcBWIGoYBM5M',
    });
  });

  it('rejects other hosts and kinds', () => {
    expect(parseSpotify('https://spotify.com/track/4uLU6hMCjMI75M1A2tKUQC')).toBeNull();
    expect(parseSpotify('https://open.spotify.com/user/4uLU6hMCjMI75M1A2tKUQC')).toBeNull();
  });

  it('uses the compact player for single items', () => {
    expect(spotifyHeight('track')).toBe(152);
    expect(spotifyHeight('playlist')).toBe(352);
  });
});

describe('resolveSocial', () => {
  it('builds profile links from handles, with or without @', () => {
    expect(resolveSocial('tiktok', '@jane')).toEqual({ ok: true, url: 'https://tiktok.com/@jane' });
    expect(resolveSocial('substack', 'jane')).toEqual({
      ok: true,
      url: 'https://jane.substack.com',
    });
    expect(resolveSocial('whatsapp', '+1 555 0100')).toEqual({
      ok: true,
      url: 'https://wa.me/15550100',
    });
  });

  it('keeps full links as they are', () => {
    expect(resolveSocial('mastodon', 'https://mastodon.social/@jane')).toEqual({
      ok: true,
      url: 'https://mastodon.social/@jane',
    });
  });

  it('explains what is wrong', () => {
    expect(resolveSocial('mastodon', 'jane')).toMatchObject({
      ok: false,
      reason: expect.stringContaining('https://'),
    });
    expect(resolveSocial('email', 'jane')).toMatchObject({
      ok: false,
      reason: expect.stringContaining('email'),
    });
    expect(resolveSocial('github', 'jane park')).toMatchObject({ ok: false });
  });
});

describe('color', () => {
  it('expands short hex codes', () => {
    expect(expandHex('#0AF')).toBe('#00aaff');
  });

  it('computes WCAG contrast', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrast('#1d1d1f', '#fbfbfd')).toBeGreaterThan(15);
  });

  it('picks readable text for the accent', () => {
    expect(readableTextOn('#0071e3')).toBe('#ffffff');
    expect(readableTextOn('#ffd60a')).toBe('#1d1d1f');
    for (const accent of ['#0071e3', '#ffd60a', '#34c759', '#ff375f', '#888888']) {
      expect(contrast(accent, readableTextOn(accent))).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('buildVCard', () => {
  it('writes a vCard 3.0 with escaped values and CRLF line endings', () => {
    const card = buildVCard({
      name: 'Jane Q. Park',
      organization: 'Park, Studio; LLC',
      phone: '+1 555 0100',
      email: 'hi@jane.dev',
      url: 'https://jane.dev/',
      note: 'Designer',
    });
    expect(card.split('\r\n')).toEqual([
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:Park;Jane Q.;;;',
      'FN:Jane Q. Park',
      'ORG:Park\\, Studio\\; LLC',
      'TEL;TYPE=CELL:+1 555 0100',
      'EMAIL;TYPE=INTERNET:hi@jane.dev',
      'URL:https://jane.dev/',
      'NOTE:Designer',
      'END:VCARD',
      '',
    ]);
  });

  it('handles a single-word name and leaves out empty fields', () => {
    const card = buildVCard({ name: 'Cher' });
    expect(card).toContain('N:;Cher;;;');
    expect(card).not.toContain('TEL');
  });
});

describe('docs stay in sync', () => {
  const read = (file: string) => readFileSync(resolve(import.meta.dirname, '..', file), 'utf8');

  it.each(['docs/AI_PROMPT.md', 'docs/CONFIG.md'])('%s lists every social platform', (file) => {
    const text = read(file);
    const missing = PLATFORM_IDS.filter((id) => !new RegExp(`\\b${id}\\b`).test(text));
    expect(missing).toEqual([]);
  });
});
