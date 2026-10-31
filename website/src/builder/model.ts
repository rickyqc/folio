// The config builder's data, checks and YAML output. No DOM here, so it's unit tested
// (tests/builder.test.ts runs every output through Folio's real config validator).
import { parseSpotify, parseYouTubeId } from '../../../src/lib/embeds.ts';
import { isLinkUrl } from '../../../src/lib/link-url.ts';
import type { YamlValue } from './yaml-lite';

export interface Platform {
  id: string;
  label: string;
  example: string;
  /** True when the platform needs a full link rather than a username. */
  needsUrl: boolean;
}

export type Item =
  | { kind: 'link'; title: string; url: string; subtitle: string; icon: string }
  | { kind: 'header'; title: string }
  /** A YouTube video or Spotify player; the link decides which. */
  | { kind: 'embed'; url: string; title: string }
  /** Only from a loaded config. Kept as is, since images live in the repo, not the builder. */
  | { kind: 'image'; src: string; alt: string; url: string; caption: string };

/** Settings from a loaded config that the builder has no fields for, written back unchanged. */
export type Kept = Partial<
  Record<'site' | 'contact' | 'embeds' | 'analytics' | 'footer', Record<string, string | boolean>>
>;

export interface BuilderState {
  name: string;
  bio: string;
  location: string;
  avatar: string;
  mode: 'auto' | 'light' | 'dark';
  accent: string;
  buttons: 'rounded' | 'pill';
  socials: { platform: string; value: string }[];
  items: Item[];
  /** Index into items of the featured link, if any. */
  featured: number | null;
  vcard: boolean;
  share: boolean;
  kept: Kept;
}

export const ACCENTS = ['#0071e3', '#ff375f', '#34c759', '#ff9f0a', '#af52de', '#1d1d1f'] as const;

/** Avatar choices: occupations, each as a woman and a man. All have Noto artwork for share cards. */
export const AVATARS = [
  ['👩‍🎨', 'Artist'],
  ['👨‍🎨', 'Artist'],
  ['👩‍💻', 'Technologist'],
  ['👨‍💻', 'Technologist'],
  ['👩‍🍳', 'Cook'],
  ['👨‍🍳', 'Cook'],
  ['👩‍🎤', 'Singer'],
  ['👨‍🎤', 'Singer'],
  ['👩‍🏫', 'Teacher'],
  ['👨‍🏫', 'Teacher'],
  ['👩‍🔬', 'Scientist'],
  ['👨‍🔬', 'Scientist'],
  ['👩‍💼', 'Office worker'],
  ['👨‍💼', 'Office worker'],
  ['👩‍⚕️', 'Health worker'],
  ['👨‍⚕️', 'Health worker'],
  ['👩‍🌾', 'Farmer'],
  ['👨‍🌾', 'Farmer'],
  ['👩‍🎓', 'Student'],
  ['👨‍🎓', 'Student'],
] as const;

export function emptyState(): BuilderState {
  return {
    name: '',
    bio: '',
    location: '',
    avatar: '👩‍🎨',
    mode: 'auto',
    accent: '#0071e3',
    buttons: 'rounded',
    socials: [{ platform: 'instagram', value: '' }],
    items: [
      { kind: 'link', title: '', url: '', subtitle: '', icon: '' },
      { kind: 'link', title: '', url: '', subtitle: '', icon: '' },
    ],
    featured: 0,
    vcard: true,
    share: false,
    kept: {},
  };
}

export interface Issue {
  /** Matches a data-field attribute in the form. */
  field: string;
  message: string;
}

const WEB_URL = /^https?:\/\/[^\s.]+\.[^\s]+$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mirrors Folio's own rules, so the copied file passes the build. */
export function validate(state: BuilderState, platforms: Platform[]): Issue[] {
  const issues: Issue[] = [];
  if (!state.name.trim()) issues.push({ field: 'name', message: 'Add your name.' });
  const avatar = state.avatar.trim();
  if (
    avatar &&
    !isEmoji(avatar) &&
    !/\.(jpe?g|png|webp|avif|gif|svg)$/i.test(avatar) &&
    !/^https:\/\//.test(avatar)
  ) {
    issues.push({ field: 'avatar', message: 'Pick an emoji, or leave it on initials.' });
  }

  state.socials.forEach((s, i) => {
    const value = s.value.trim().replace(/^@/, '');
    if (!value) return;
    const platform = platforms.find((p) => p.id === s.platform);
    if (s.platform === 'email') {
      if (!EMAIL.test(value))
        issues.push({ field: `social-${i}`, message: 'Enter an email address.' });
    } else if (platform?.needsUrl && !WEB_URL.test(value)) {
      issues.push({
        field: `social-${i}`,
        message: `Paste the full link, like ${platform.example}`,
      });
    } else if (!WEB_URL.test(value) && /\s/.test(value)) {
      issues.push({ field: `social-${i}`, message: 'Usernames can’t contain spaces.' });
    }
  });

  state.items.forEach((item, i) => {
    if (item.kind === 'header' || item.kind === 'image') return;
    if (item.kind === 'embed') {
      const url = withScheme(item.url);
      if (!url) {
        if (item.title.trim())
          issues.push({ field: `item-${i}-url`, message: 'Add the YouTube or Spotify link.' });
      } else if (!embedType(url)) {
        issues.push({
          field: `item-${i}-url`,
          message: 'Paste a YouTube video link or a Spotify share link.',
        });
      }
      return;
    }
    const title = item.title.trim();
    const url = item.url.trim();
    if (!title && !url) return;
    if (!title) issues.push({ field: `item-${i}-title`, message: 'Add the button text.' });
    if (!url) issues.push({ field: `item-${i}-url`, message: 'Add where the button goes.' });
    else if (!isLinkUrl(withScheme(url))) {
      issues.push({
        field: `item-${i}-url`,
        message: 'Enter a web address, mailto: email link, or tel: phone link.',
      });
    }
    if (
      item.icon.trim() &&
      !isEmoji(item.icon) &&
      !platforms.some((p) => p.id === item.icon.trim())
    ) {
      issues.push({ field: `item-${i}-icon`, message: 'Use one emoji.' });
    }
  });
  return issues;
}

/** Which player a link gets, or null when it's neither a YouTube video nor a Spotify item. */
export function embedType(url: string): 'youtube' | 'spotify' | null {
  const v = withScheme(url);
  return parseYouTubeId(v) ? 'youtube' : parseSpotify(v) ? 'spotify' : null;
}

export function isEmoji(value: string): boolean {
  const graphemes = [
    ...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(value.trim()),
  ];
  return graphemes.length === 1 && /\p{Extended_Pictographic}/u.test(value);
}

/** Fixes the most common slip, a link without https://. */
export function withScheme(url: string): string {
  const v = url.trim();
  return v && !/^[a-z]+:/i.test(v) && /\./.test(v) ? `https://${v}` : v;
}

// YAML reads some plain words as booleans, numbers or null, and treats ": " and " #" specially.
const RESERVED = /^(true|false|yes|no|on|off|null|y|n|~)$/i;
const PLAIN = /^[\p{L}\p{N}][\p{L}\p{N}\p{M} .,'’!?&()/@+–—_-]*$/u;

/** A YAML scalar: plain when that's unambiguous, otherwise double-quoted (JSON strings are valid YAML). */
export function scalar(value: string): string {
  const v = value.trim();
  const plain = PLAIN.test(v) && !RESERVED.test(v) && !/^[-+.\d]/.test(v) && !/[:#]/.test(v);
  return plain ? v : JSON.stringify(v);
}

export function hasContent(item: Item): boolean {
  switch (item.kind) {
    case 'header':
      return !!item.title.trim();
    case 'embed':
      return !!item.url.trim();
    case 'image':
      return true;
    default:
      return !!(item.title.trim() && item.url.trim());
  }
}

function keptLines(values: Record<string, string | boolean> | undefined): string[] {
  return Object.entries(values ?? {}).map(
    ([key, value]) => `  ${key}: ${typeof value === 'boolean' ? value : scalar(value)}`,
  );
}

function section(name: string, values: Record<string, string | boolean> | undefined): string[] {
  const lines = keptLines(values);
  return lines.length ? ['', `${name}:`, ...lines] : [];
}

export function toYaml(state: BuilderState): string {
  const avatar = state.avatar.trim();
  const kept = state.kept ?? {};
  const out: string[] = [
    '# yaml-language-server: $schema=./folio.schema.json',
    '# Made with the Folio config builder. Every option: docs/CONFIG.md',
    ...section('site', kept.site),
    '',
    'profile:',
    `  name: ${scalar(state.name || 'Your Name')}`,
  ];
  if (state.bio.trim()) out.push(`  bio: ${scalar(state.bio)}`);
  if (avatar) out.push(`  avatar: ${isEmoji(avatar) ? JSON.stringify(avatar) : scalar(avatar)}`);
  if (state.location.trim()) out.push(`  location: ${scalar(state.location)}`);

  out.push(
    '',
    'theme:',
    `  mode: ${state.mode}`,
    `  accent: ${JSON.stringify(state.accent)}`,
    `  buttons: ${state.buttons}`,
  );

  const socials = state.socials.filter((s) => s.value.trim());
  if (socials.length) {
    out.push('', 'socials:');
    for (const s of socials) {
      const value = s.platform === 'email' ? s.value.trim() : s.value.trim().replace(/^@/, '');
      out.push(`  ${s.platform}: ${scalar(value)}`);
    }
  }

  const items = state.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => hasContent(item));
  if (items.length) {
    out.push('', 'blocks:');
    for (const { item, index } of items) {
      if (item.kind === 'header') {
        out.push('  - type: header', `    title: ${scalar(item.title)}`);
        continue;
      }
      if (item.kind === 'embed') {
        const url = withScheme(item.url);
        out.push(`  - type: ${embedType(url) ?? 'youtube'}`, `    url: ${scalar(url)}`);
        if (item.title.trim()) out.push(`    title: ${scalar(item.title)}`);
        continue;
      }
      if (item.kind === 'image') {
        out.push('  - type: image', `    src: ${scalar(item.src)}`, `    alt: ${scalar(item.alt)}`);
        if (item.url.trim()) out.push(`    url: ${scalar(item.url)}`);
        if (item.caption.trim()) out.push(`    caption: ${scalar(item.caption)}`);
        continue;
      }
      out.push('  - type: link', `    title: ${scalar(item.title)}`);
      if (item.subtitle.trim()) out.push(`    subtitle: ${scalar(item.subtitle)}`);
      out.push(`    url: ${scalar(withScheme(item.url))}`);
      if (item.icon.trim()) out.push(`    icon: ${JSON.stringify(item.icon.trim())}`);
      if (state.featured === index) out.push('    featured: true');
    }
  }

  out.push(
    ...section('embeds', kept.embeds),
    '',
    'contact:',
    `  vcard: ${state.vcard}`,
    ...keptLines(kept.contact),
    ...section('analytics', kept.analytics),
    '',
    'footer:',
    `  share: ${state.share}`,
    `  credit: ${kept.footer?.['credit'] ?? true}`,
    '',
  );
  return out.join('\n');
}

type YamlMap = { [key: string]: YamlValue };

const isMap = (v: YamlValue | undefined): v is YamlMap =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: YamlValue | undefined): string => (typeof v === 'string' ? v : '');

/** The plain values of a map, for sections the builder writes back unchanged. */
function scalars(v: YamlValue | undefined, only?: string[]): Record<string, string | boolean> {
  if (!isMap(v)) return {};
  return Object.fromEntries(
    Object.entries(v).filter(
      ([key, value]) =>
        (typeof value === 'string' || typeof value === 'boolean') && (!only || only.includes(key)),
    ),
  ) as Record<string, string | boolean>;
}

const SECTIONS = [
  'site',
  'profile',
  'theme',
  'socials',
  'blocks',
  'embeds',
  'contact',
  'analytics',
  'footer',
];

/**
 * Turns an existing folio.config.yaml (already parsed) into builder state, so people can change
 * their page here. Settings the builder has no fields for are kept and written back as they were;
 * anything it can't carry is listed in `skipped`.
 */
export function fromConfig(
  data: YamlValue,
  platforms: Platform[],
): { state: BuilderState; skipped: string[] } {
  if (!isMap(data) || !isMap(data['profile'])) {
    throw new Error('That doesn’t look like a Folio config: it has no profile section.');
  }
  const skipped: string[] = [];
  const profile = data['profile'];
  const theme = isMap(data['theme']) ? data['theme'] : {};
  const contact = isMap(data['contact']) ? data['contact'] : {};
  const footer = isMap(data['footer']) ? data['footer'] : {};
  const mode = str(theme['mode']);
  const accent = str(theme['accent']);

  const state: BuilderState = {
    ...emptyState(),
    name: str(profile['name']),
    bio: str(profile['bio']),
    location: str(profile['location']),
    avatar: str(profile['avatar']),
    mode: mode === 'light' || mode === 'dark' ? mode : 'auto',
    accent: /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(accent) ? accent : ACCENTS[0],
    buttons: theme['buttons'] === 'pill' ? 'pill' : 'rounded',
    socials: [],
    items: [],
    featured: null,
    vcard: contact['vcard'] === true,
    share: footer['share'] === true,
  };

  if (isMap(data['socials'])) {
    for (const [platform, value] of Object.entries(data['socials'])) {
      if (platforms.some((p) => p.id === platform) && str(value)) {
        state.socials.push({ platform, value: str(value) });
      } else skipped.push(`socials: ${platform}`);
    }
  }

  const blocks = Array.isArray(data['blocks']) ? data['blocks'] : [];
  for (const block of blocks) {
    const b = isMap(block) ? block : {};
    switch (b['type']) {
      case 'link':
        if (b['featured'] === true && state.featured === null) state.featured = state.items.length;
        state.items.push({
          kind: 'link',
          title: str(b['title']),
          url: str(b['url']),
          subtitle: str(b['subtitle']),
          icon: str(b['icon']),
        });
        break;
      case 'header':
        state.items.push({ kind: 'header', title: str(b['title']) });
        break;
      case 'youtube':
      case 'spotify':
        state.items.push({ kind: 'embed', url: str(b['url']), title: str(b['title']) });
        break;
      case 'image':
        state.items.push({
          kind: 'image',
          src: str(b['src']),
          alt: str(b['alt']),
          url: str(b['url']),
          caption: str(b['caption']),
        });
        break;
      default:
        skipped.push(`a block of type “${str(b['type']) || 'unknown'}”`);
    }
  }

  const kept: Kept = {
    site: scalars(data['site']),
    contact: scalars(contact, ['phone', 'email', 'organization']),
    embeds: scalars(data['embeds']),
    analytics: scalars(data['analytics']),
    footer: scalars(footer, ['credit']),
  };
  state.kept = Object.fromEntries(
    Object.entries(kept).filter(([, values]) => Object.keys(values).length),
  ) as Kept;

  for (const key of Object.keys(data)) if (!SECTIONS.includes(key)) skipped.push(key);
  return { state, skipped };
}
