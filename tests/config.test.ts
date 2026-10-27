import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { FolioConfigError } from '../src/config/errors.ts';
import { loadConfig, parseConfig } from '../src/config/load.ts';
import { toJsonSchema } from '../src/config/schema.ts';

const publicDir = mkdtempSync(join(tmpdir(), 'folio-public-'));
writeFileSync(join(publicDir, 'me.jpg'), '');
afterAll(() => rmSync(publicDir, { recursive: true, force: true }));

const MINIMAL = `profile:\n  name: Jane Park\n`;

function parse(yaml: string) {
  return parseConfig(yaml, { publicDir });
}

/** Returns the printed error, failing the test if the config was accepted. */
function errorFor(yaml: string): string {
  try {
    parse(yaml);
  } catch (error) {
    if (error instanceof FolioConfigError) return error.message;
    throw error;
  }
  throw new Error('Expected the config to be rejected');
}

describe('folio.config.yaml', () => {
  it('loads without errors', () => {
    // Runs against your own config too, so a mistake shows up as a failed check on GitHub.
    const config = loadConfig(resolve(import.meta.dirname, '..'));
    expect(config.profile.name.length).toBeGreaterThan(0);
  });

  it('matches the committed JSON Schema (run npm run schema if this fails)', () => {
    const committed = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../folio.schema.json'), 'utf8'),
    ) as unknown;
    expect(committed).toEqual(toJsonSchema());
  });
});

describe('defaults', () => {
  it('needs only a name', () => {
    const config = parse(MINIMAL);
    expect(config.site.title).toBe('Jane Park');
    expect(config.theme).toEqual({ mode: 'auto', accent: '#0071e3', buttons: 'rounded' });
    expect(config.blocks).toEqual([]);
    expect(config.footer.credit).toBe(true);
    expect(config.contact.vcard).toBe(false);
    expect(config.embeds.loadOnTap).toBe(false);
  });

  it('uses the bio as the description and adds a trailing slash to the site url', () => {
    const config = parse(
      `site:\n  url: https://jane.dev\nprofile:\n  name: Jane\n  bio: Hi there\n`,
    );
    expect(config.site.url).toBe('https://jane.dev/');
    expect(config.site.description).toBe('Hi there');
  });
});

describe('link icons', () => {
  const link = (icon: string) =>
    `${MINIMAL}blocks:\n  - type: link\n    title: Shop\n    url: https://a.com\n    icon: ${icon}\n`;

  it('accepts a platform name or a single emoji', () => {
    expect(parse(link('youtube')).blocks[0]).toMatchObject({ icon: { kind: 'fill' } });
    expect(parse(link('"🎨"')).blocks[0]).toMatchObject({ icon: { kind: 'emoji', char: '🎨' } });
    expect(parse(link('"👩‍🎨"')).blocks[0]).toMatchObject({ icon: { kind: 'emoji', char: '👩‍🎨' } });
    expect(parse(link('"☕️"')).blocks[0]).toMatchObject({ icon: { kind: 'emoji' } });
  });

  it('explains anything else', () => {
    expect(errorFor(link('calendar'))).toContain(
      'must be a platform name like youtube, or a single emoji in quotes like "🎨"',
    );
    expect(errorFor(link('"🎨🎨"'))).toContain('a single emoji');
  });
});

describe('embeds', () => {
  it('can load players only when tapped', () => {
    expect(parse(`${MINIMAL}embeds:\n  loadOnTap: true\n`).embeds.loadOnTap).toBe(true);
  });

  it('explains a quoted true', () => {
    expect(errorFor(`${MINIMAL}embeds:\n  loadOnTap: "yes"\n`)).toContain(
      '"loadOnTap" in embeds should be true or false (without quotes).',
    );
  });
});

describe('resolving', () => {
  it('turns handles into profile links and keeps the config order', () => {
    const config = parse(
      `${MINIMAL}socials:\n  github: "@jane"\n  email: hi@jane.dev\n  instagram: https://instagram.com/jane\n`,
    );
    expect(config.socials.map((s) => [s.id, s.url])).toEqual([
      ['github', 'https://github.com/jane'],
      ['email', 'mailto:hi@jane.dev'],
      ['instagram', 'https://instagram.com/jane'],
    ]);
    expect(config.contact.email).toBe('hi@jane.dev');
  });

  it('accepts avatar paths written several ways', () => {
    for (const avatar of ['me.jpg', './me.jpg', '/me.jpg', 'public/me.jpg']) {
      const config = parse(`profile:\n  name: Jane\n  avatar: ${avatar}\n`);
      expect(config.profile.avatar).toBe('me.jpg');
    }
  });

  it('extracts embed IDs', () => {
    const config = parse(
      `${MINIMAL}blocks:\n  - type: youtube\n    url: https://youtu.be/aqz-KE-bpKQ\n  - type: spotify\n    url: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc\n`,
    );
    expect(config.blocks).toEqual([
      { type: 'youtube', id: 'aqz-KE-bpKQ' },
      { type: 'spotify', kind: 'playlist', id: '37i9dQZF1DXcBWIGoYBM5M', height: 352 },
    ]);
  });
});

describe('friendly errors', () => {
  it('names the block, line and fix when a link has no url', () => {
    const message = errorFor(
      `${MINIMAL}blocks:\n  - type: header\n    title: Work\n  - type: link\n    title: Shop\n`,
    );
    expect(message).toContain(`Line 6: Block 2 (link “Shop”) is missing "url".`);
    expect(message).toContain('Fix: Add a line like   url: https://example.com');
    expect(message).toContain("your page wasn't updated");
  });

  it('says when the profile section is missing', () => {
    expect(errorFor(`theme:\n  mode: dark\n`)).toContain(
      'Your config is missing the profile section.',
    );
  });

  it('suggests the right name for a misspelled option', () => {
    expect(errorFor(`profile:\n  name: Jane\n  boi: Hello\n`)).toContain(
      'Line 3: profile has an unknown option "boi". Did you mean "bio"?',
    );
  });

  it('suggests the right block type', () => {
    expect(
      errorFor(`${MINIMAL}blocks:\n  - type: lnk\n    title: Shop\n    url: https://x.com\n`),
    ).toContain('Block 1 (lnk “Shop”) has an unknown type "lnk". Did you mean "link"?');
  });

  it('suggests the right social platform', () => {
    expect(errorFor(`${MINIMAL}socials:\n  instgram: jane\n`)).toContain(
      '"instgram" in socials isn\'t a supported platform. Did you mean "instagram"?',
    );
  });

  it('explains a url without https://', () => {
    expect(
      errorFor(`${MINIMAL}blocks:\n  - type: link\n    title: Shop\n    url: jane.dev/shop\n`),
    ).toContain('"url" in Block 1 (link “Shop”) must be a full web address starting with https://');
  });

  it('allows only one featured link', () => {
    const message = errorFor(
      `${MINIMAL}blocks:\n  - type: link\n    title: A\n    url: https://a.com\n    featured: true\n  - type: link\n    title: B\n    url: https://b.com\n    featured: true\n`,
    );
    expect(message).toContain('Block 2 (link “B”) is featured, but Block 1 already is.');
  });

  it('rejects a link that is not a YouTube video', () => {
    expect(
      errorFor(`${MINIMAL}blocks:\n  - type: youtube\n    url: https://vimeo.com/123\n`),
    ).toContain('must be a YouTube video link');
  });

  it('requires alt text on images', () => {
    expect(errorFor(`${MINIMAL}blocks:\n  - type: image\n    src: me.jpg\n`)).toContain(
      'Block 1 (image) is missing "alt".',
    );
  });

  it('points to the missing image file and lists what is there', () => {
    const message = errorFor(`profile:\n  name: Jane\n  avatar: Me.JPG\n`);
    expect(message).toContain(
      'Line 3: Can\'t find the image "Me.JPG". Folio looked for public/Me.JPG.',
    );
    expect(message).toContain('Images in public/ now: me.jpg');
  });

  it('explains how to convert an iPhone HEIC photo', () => {
    const message = errorFor(`profile:\n  name: Jane\n  avatar: IMG_0042.HEIC\n`);
    expect(message).toContain('is an iPhone HEIC photo');
    expect(message).toContain('File → Export → Format: JPEG');
  });

  it('rejects files that are not images', () => {
    expect(errorFor(`profile:\n  name: Jane\n  avatar: resume.pdf\n`)).toContain(
      "isn't an image format Folio can use",
    );
  });

  it('explains an invalid choice and suggests the closest one', () => {
    expect(errorFor(`${MINIMAL}theme:\n  mode: darkk\n`)).toContain(
      '"mode" in theme must be one of: auto, light, dark. You wrote "darkk".',
    );
  });

  it('explains a color that is not a hex code', () => {
    expect(errorFor(`${MINIMAL}theme:\n  accent: blue\n`)).toContain(
      'must be a hex color in quotes',
    );
  });

  it('catches YAML syntax mistakes with a line number', () => {
    expect(errorFor(`profile:\n  name: Jane\n   bio: bad indent\n`)).toMatch(
      /Line \d: The file isn't valid YAML/,
    );
  });

  it('requires the fields each analytics provider needs', () => {
    expect(errorFor(`${MINIMAL}analytics:\n  provider: plausible\n`)).toContain(
      'analytics is missing "domain".',
    );
  });

  it('reports every problem at once, in file order', () => {
    const message = errorFor(`profile:\n  boi: x\ntheme:\n  mode: neon\n`);
    expect(message).toContain('has 3 problems');
    expect(message.indexOf('missing "name"')).toBeLessThan(message.indexOf('"mode"'));
  });

  it('handles an empty file', () => {
    expect(errorFor('')).toContain('The file is empty.');
  });
});
