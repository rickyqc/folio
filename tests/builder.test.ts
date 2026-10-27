import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseConfig } from '../src/config/load.ts';
import { PLATFORMS } from '../src/lib/socials.ts';
import {
  AVATARS,
  emptyState,
  scalar,
  toYaml,
  validate,
  withScheme,
  type BuilderState,
} from '../website/src/builder/model.ts';

const publicDir = resolve(import.meta.dirname, '../public');
const platforms = Object.entries(PLATFORMS).map(([id, p]) => ({
  id,
  label: p.label,
  example: p.example,
  needsUrl: !('fromHandle' in p),
}));

function state(overrides: Partial<BuilderState>): BuilderState {
  return { ...emptyState(), ...overrides };
}

/** The builder's whole promise: what it hands people passes Folio's real validator. */
function build(s: BuilderState) {
  return parseConfig(toYaml(s), { publicDir });
}

describe('config builder output', () => {
  it('is valid for a typical page and keeps every detail', () => {
    const config = build(
      state({
        name: 'Riley Chen',
        bio: 'Barista & latte artist',
        location: 'Austin, TX',
        avatar: '👨‍🍳',
        accent: '#ff375f',
        buttons: 'pill',
        mode: 'dark',
        socials: [
          { platform: 'instagram', value: '@rileymakes' },
          { platform: 'email', value: 'riley@example.com' },
          { platform: 'mastodon', value: 'https://mastodon.social/@riley' },
        ],
        items: [
          {
            kind: 'link',
            title: 'Book a class',
            url: 'example.com/book',
            subtitle: 'Saturdays',
            icon: '☕️',
          },
          { kind: 'header', title: 'Shop' },
          {
            kind: 'link',
            title: 'Beans',
            url: 'https://example.com/beans',
            subtitle: '',
            icon: 'instagram',
          },
        ],
        featured: 0,
        share: true,
      }),
    );
    expect(config.profile).toEqual({
      name: 'Riley Chen',
      bio: 'Barista & latte artist',
      emoji: '👨‍🍳',
      location: 'Austin, TX',
    });
    expect(config.theme).toEqual({ mode: 'dark', accent: '#ff375f', buttons: 'pill' });
    expect(config.socials.map((s) => s.url)).toEqual([
      'https://instagram.com/rileymakes',
      'mailto:riley@example.com',
      'https://mastodon.social/@riley',
    ]);
    expect(config.blocks).toMatchObject([
      { type: 'link', title: 'Book a class', url: 'https://example.com/book', featured: true },
      { type: 'header', title: 'Shop' },
      { type: 'link', title: 'Beans', featured: false },
    ]);
    expect(config.footer.share).toBe(true);
  });

  it.each([
    'Designer: product & brand',
    'Coffee #1 fan',
    'yes',
    'null',
    '42',
    '- dash first',
    'Say "hi"',
    'Back\\slash',
    'Café crème 🥐',
    '“Curly quotes”',
    '@handle style',
    'Ends with colon:',
  ])('survives tricky text: %s', (text) => {
    const config = build(
      state({
        name: text,
        bio: text,
        items: [
          { kind: 'link', title: text, url: 'https://example.com', subtitle: text, icon: '' },
        ],
      }),
    );
    expect(config.profile.name).toBe(text);
    expect(config.profile.bio).toBe(text);
    expect(config.blocks[0]).toMatchObject({ title: text, subtitle: text });
  });

  it('skips empty rows and works with just a name', () => {
    const config = build(state({ name: 'Sam' }));
    expect(config.blocks).toEqual([]);
    expect(config.socials).toEqual([]);
  });

  it('features nothing when the featured link was left empty', () => {
    const config = build(
      state({
        name: 'Sam',
        items: [
          { kind: 'link', title: '', url: '', subtitle: '', icon: '' },
          { kind: 'link', title: 'Shop', url: 'https://example.com', subtitle: '', icon: '' },
        ],
        featured: 0,
      }),
    );
    expect(config.blocks).toMatchObject([{ title: 'Shop', featured: false }]);
  });
});

describe('builder checks', () => {
  const fields = (s: BuilderState) => validate(s, platforms).map((i) => i.field);

  it('needs a name', () => {
    expect(fields(state({}))).toContain('name');
    expect(fields(state({ name: 'Sam' }))).toEqual([]);
  });

  it('catches half-filled links and bad addresses, but fixes a missing https://', () => {
    const items = (url: string, title = 'Shop') => [
      { kind: 'link' as const, title, url, subtitle: '', icon: '' },
    ];
    expect(fields(state({ name: 'Sam', items: items('example.com') }))).toEqual([]);
    expect(fields(state({ name: 'Sam', items: items('not a link') }))).toEqual(['item-0-url']);
    expect(fields(state({ name: 'Sam', items: items('https://a.com', '') }))).toEqual([
      'item-0-title',
    ]);
  });

  it('checks socials the way the build does', () => {
    const social = (platform: string, value: string) =>
      fields(state({ name: 'Sam', socials: [{ platform, value }] }));
    expect(social('email', 'not-an-email')).toEqual(['social-0']);
    expect(social('mastodon', 'riley')).toEqual(['social-0']);
    expect(social('github', 'riley chen')).toEqual(['social-0']);
    expect(social('github', 'riley')).toEqual([]);
  });

  it('accepts every offered emoji avatar, and initials', () => {
    for (const [emoji] of AVATARS) {
      expect(fields(state({ name: 'Sam', avatar: emoji }))).toEqual([]);
      expect(build(state({ name: 'Sam', avatar: emoji })).profile.emoji).toBe(emoji);
    }
    expect(build(state({ name: 'Sam', avatar: '' })).profile).toEqual({ name: 'Sam' });
  });

  it('rejects an avatar that is neither an emoji nor a usable file', () => {
    expect(fields(state({ name: 'Sam', avatar: 'IMG_1.HEIC' }))).toEqual(['avatar']);
  });
});

describe('helpers', () => {
  it('adds https:// only when it looks like an address', () => {
    expect(withScheme('jane.dev')).toBe('https://jane.dev');
    expect(withScheme('https://jane.dev')).toBe('https://jane.dev');
    expect(withScheme('hello')).toBe('hello');
  });

  it('quotes only when YAML would misread the text', () => {
    expect(scalar('Jane Park')).toBe('Jane Park');
    expect(scalar('true')).toBe('"true"');
    expect(scalar('a: b')).toBe('"a: b"');
  });
});
