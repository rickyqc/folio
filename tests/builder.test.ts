import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { parseConfig } from '../src/config/load.ts';
import { PLATFORMS } from '../src/lib/socials.ts';
import {
  AVATARS,
  emptyState,
  fromConfig,
  scalar,
  toYaml,
  validate,
  withScheme,
  type BuilderState,
} from '../website/src/builder/model.ts';
import { parseYamlLite, YamlLiteError } from '../website/src/builder/yaml-lite.ts';

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
  it.each(['mailto:hello@example.com', 'tel:+15550100'])('validates contact button %s', (url) => {
    const config = state({
      name: 'Studio',
      items: [{ kind: 'link', title: 'Contact', url, subtitle: '', icon: '' }],
    });
    expect(validate(config, platforms)).toEqual([]);
    expect(build(config).blocks[0]).toMatchObject({ type: 'link', url });
  });

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

describe('video and music in the builder', () => {
  it('writes YouTube and Spotify players from the link alone', () => {
    const config = build(
      state({
        name: 'Sam',
        items: [
          { kind: 'embed', url: 'youtu.be/aqz-KE-bpKQ', title: 'Throwing a mug' },
          {
            kind: 'embed',
            url: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
            title: '',
          },
          { kind: 'embed', url: '', title: '' },
        ],
      }),
    );
    expect(config.blocks).toMatchObject([
      { type: 'youtube', title: 'Throwing a mug' },
      { type: 'spotify' },
    ]);
  });

  it('asks for a YouTube or Spotify link', () => {
    const fields = (url: string, title = '') =>
      validate(state({ name: 'Sam', items: [{ kind: 'embed', url, title }] }), platforms).map(
        (i) => i.field,
      );
    expect(fields('https://vimeo.com/123')).toEqual(['item-0-url']);
    expect(fields('', 'My song')).toEqual(['item-0-url']);
    expect(fields('')).toEqual([]);
  });
});

describe('loading an existing config', () => {
  const sample = readFileSync(resolve(import.meta.dirname, '../folio.config.yaml'), 'utf8');
  const full = readFileSync(resolve(import.meta.dirname, 'fixtures/full.config.yaml'), 'utf8');

  it.each([
    ['the sample', sample],
    ['every option', full],
  ])('reads %s exactly like the real YAML library', (_, source) => {
    expect(parseYamlLite(source)).toEqual(parse(source));
  });

  it.each([
    ['comments and quotes', `a: 'it''s # not a comment' # but this is\nb: "x\\"y"\n`],
    ['an apostrophe in a plain value', "bio: It's me # hi\n"],
    ['a list at the same indent as its key', 'blocks:\n- type: link\n  title: A\n- type: header\n'],
    ['empty maps and lists', 'socials: {}\nblocks: []\n'],
    ['plain values that look special', 'a: yes\nb: 42\nc: ~\nd: True\n'],
  ])('handles %s', (_, source) => {
    expect(parseYamlLite(source)).toEqual(parseLike(source));
  });

  function parseLike(source: string) {
    // Folio reads numbers as text anyway, so compare with every plain value as a string.
    return JSON.parse(
      JSON.stringify(parse(source), (_, v) => (typeof v === 'number' ? String(v) : v)),
    );
  }

  it('names the line it can’t read', () => {
    const error = (source: string) => {
      try {
        parseYamlLite(source);
      } catch (e) {
        return e instanceof YamlLiteError ? e.message : 'other';
      }
      return 'parsed';
    };
    expect(error('profile:\n  bio: |\n    two lines\n')).toMatch(/^Line 2:/);
    expect(error('profile:\n  name: "open\n')).toMatch(/^Line 2: .*isn’t closed/);
    expect(error('profile:\n\tname: Sam\n')).toMatch(/^Line 2: .*tabs/);
    expect(error('profile:\n  name: Sam\n    bio: x\n')).toMatch(/^Line 3:/);
    expect(error('socials: [a, b]\n')).toMatch(/^Line 1:/);
  });

  it('round-trips the sample: same page, same settings', () => {
    const { state: loaded, skipped } = fromConfig(parseYamlLite(sample), platforms);
    expect(skipped).toEqual([]);
    const before = parseConfig(sample, { publicDir });
    const after = build(loaded);
    expect(after).toEqual(before);
  });

  it('round-trips every option, including ones the builder has no fields for', () => {
    const { state: loaded, skipped } = fromConfig(parseYamlLite(full), platforms);
    expect(skipped).toEqual([]);
    expect(loaded.avatar).toBe('avatar.svg');
    expect(loaded.items.map((i) => i.kind)).toEqual([
      'link',
      'link',
      'link',
      'header',
      'embed',
      'image',
    ]);
    expect(build(loaded)).toEqual(parseConfig(full, { publicDir }));
  });

  it('says what it had to leave out, and rejects things that aren’t configs', () => {
    const { skipped } = fromConfig(
      parseYamlLite(
        'profile:\n  name: Sam\nsocials:\n  myspace: sam\nblocks:\n  - type: map\nextra: 1\n',
      ),
      platforms,
    );
    expect(skipped).toEqual(['socials: myspace', 'a block of type “map”', 'extra']);
    expect(() => fromConfig(parseYamlLite('hello: world\n'), platforms)).toThrow(/no profile/);
    expect(() => fromConfig(parseYamlLite('just text\n'), platforms)).toThrow(/^Line 1:/);
  });
});
