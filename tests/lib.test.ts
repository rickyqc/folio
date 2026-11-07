import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { clickAttributes } from '../src/lib/analytics.ts';
import { accentRing, contrast, expandHex, readableTextOn } from '../src/lib/color.ts';
import {
  isYouTubeChannel,
  parseSpotify,
  parseYouTubeId,
  spotifyHeight,
} from '../src/lib/embeds.ts';
import { PLATFORM_IDS, resolveSocial } from '../src/lib/socials.ts';
import { withLinkScheme, withScheme } from '../src/lib/urls.ts';
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

describe('accentRing', () => {
  it('outlines accents that blend into the page background', () => {
    expect(accentRing('#0071e3')).toBe('light-dark(transparent, transparent)');
    expect(accentRing('#f5f5f7')).toBe('light-dark(#1d1d1f, transparent)');
    expect(accentRing('#1c1c1e')).toBe('light-dark(transparent, #f5f5f7)');
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

describe('withScheme', () => {
  it('adds https:// to bare domains only', () => {
    expect(withScheme('jane.dev')).toBe('https://jane.dev');
    expect(withScheme(' www.jane.dev/shop?x=1 ')).toBe('https://www.jane.dev/shop?x=1');
    expect(withScheme('jane.dev:8080')).toBe('https://jane.dev:8080');
    expect(withScheme('http://jane.dev')).toBe('http://jane.dev');
    expect(withScheme('hi@jane.dev')).toBe('hi@jane.dev');
    expect(withScheme('not a link')).toBe('not a link');
    expect(withScheme('hello')).toBe('hello');
  });

  it('turns a bare email into a mailto: link on buttons', () => {
    expect(withLinkScheme('hi@jane.dev')).toBe('mailto:hi@jane.dev');
    expect(withLinkScheme('jane.dev')).toBe('https://jane.dev');
    expect(withLinkScheme('tel:+15550100')).toBe('tel:+15550100');
  });
});

describe('isYouTubeChannel', () => {
  it('spots channel pages, not videos', () => {
    expect(isYouTubeChannel('https://www.youtube.com/@mkbhd')).toBe(true);
    expect(isYouTubeChannel('https://youtube.com/channel/UC123')).toBe(true);
    expect(isYouTubeChannel('https://m.youtube.com/c/name')).toBe(true);
    expect(isYouTubeChannel('https://youtube.com/watch?v=aqz-KE-bpKQ')).toBe(false);
    expect(isYouTubeChannel('https://youtube.com/shorts/aqz-KE-bpKQ')).toBe(false);
  });
});

describe('clickAttributes', () => {
  it('tags links for Umami only', () => {
    expect(clickAttributes('umami', 'Shop', 'https://a.com')).toEqual({
      'data-umami-event': 'Link click',
      'data-umami-event-link': 'Shop',
      'data-umami-event-url': 'https://a.com',
    });
    expect(clickAttributes('plausible', 'Shop', 'https://a.com')).toEqual({});
    expect(clickAttributes('none', 'Shop', 'https://a.com')).toEqual({});
  });
});
