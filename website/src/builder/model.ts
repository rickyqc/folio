// The config builder's data, checks and YAML output. No DOM here, so it's unit tested
// (tests/builder.test.ts runs every output through Folio's real config validator).

export interface Platform {
  id: string;
  label: string;
  example: string;
  /** True when the platform needs a full link rather than a username. */
  needsUrl: boolean;
}

export type Item =
  | { kind: 'link'; title: string; url: string; subtitle: string; icon: string }
  | { kind: 'header'; title: string };

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
}

export const ACCENTS = ['#0071e3', '#ff375f', '#34c759', '#ff9f0a', '#af52de', '#1d1d1f'] as const;

export function emptyState(): BuilderState {
  return {
    name: '',
    bio: '',
    location: '',
    avatar: '',
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
  if (state.avatar.trim() && !/\.(jpe?g|png|webp|avif|gif|svg)$/i.test(state.avatar.trim())) {
    issues.push({ field: 'avatar', message: 'Use the file name of a JPG or PNG, like me.jpg.' });
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
    if (item.kind === 'header') return;
    const title = item.title.trim();
    const url = item.url.trim();
    if (!title && !url) return;
    if (!title) issues.push({ field: `item-${i}-title`, message: 'Add the button text.' });
    if (!url) issues.push({ field: `item-${i}-url`, message: 'Add where the button goes.' });
    else if (!WEB_URL.test(withScheme(url))) {
      issues.push({ field: `item-${i}-url`, message: 'That doesn’t look like a web address.' });
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
  return item.kind === 'header' ? !!item.title.trim() : !!(item.title.trim() && item.url.trim());
}

export function toYaml(state: BuilderState): string {
  const out: string[] = [
    '# yaml-language-server: $schema=./folio.schema.json',
    '# Made with the Folio config builder. Every option: docs/CONFIG.md',
    '',
    'profile:',
    `  name: ${scalar(state.name || 'Your Name')}`,
  ];
  if (state.bio.trim()) out.push(`  bio: ${scalar(state.bio)}`);
  if (state.avatar.trim()) out.push(`  avatar: ${scalar(state.avatar)}`);
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
      out.push('  - type: link', `    title: ${scalar(item.title)}`);
      if (item.subtitle.trim()) out.push(`    subtitle: ${scalar(item.subtitle)}`);
      out.push(`    url: ${scalar(withScheme(item.url))}`);
      if (item.icon.trim()) out.push(`    icon: ${JSON.stringify(item.icon.trim())}`);
      if (state.featured === index) out.push('    featured: true');
    }
  }

  out.push(
    '',
    'contact:',
    `  vcard: ${state.vcard}`,
    '',
    'footer:',
    `  share: ${state.share}`,
    '  credit: true',
    '',
  );
  return out.join('\n');
}
