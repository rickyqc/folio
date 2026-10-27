import {
  siApplemusic,
  siBehance,
  siBluesky,
  siDiscord,
  siDribbble,
  siFacebook,
  siGithub,
  siInstagram,
  siKofi,
  siMastodon,
  siMedium,
  siPatreon,
  siPinterest,
  siSnapchat,
  siSoundcloud,
  siSpotify,
  siSubstack,
  siTelegram,
  siThreads,
  siTiktok,
  siTwitch,
  siWhatsapp,
  siX,
  siYoutube,
} from 'simple-icons';

/** Brand icons are filled Simple Icons paths; generic ones are Lucide-style strokes. */
export type Icon =
  | { kind: 'fill'; path: string }
  | { kind: 'stroke'; path: string }
  | { kind: 'emoji'; char: string };

/** True for exactly one emoji, including skin tones and combined ones like 👩‍🎨. */
export function isEmoji(value: string): boolean {
  const graphemes = [
    ...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(value.trim()),
  ];
  return graphemes.length === 1 && /\p{Extended_Pictographic}/u.test(value);
}

interface Platform {
  label: string;
  icon: Icon;
  /** Builds a profile URL from a bare handle. Absent means the value must be a full URL. */
  fromHandle?: (handle: string) => string;
  /** Shown in error messages and docs. */
  example: string;
}

const brand = (icon: { path: string }): Icon => ({ kind: 'fill', path: icon.path });

export const UI_ICONS = {
  mail: { kind: 'stroke', path: 'M4 6h16v12H4zM4.5 6.5 12 12l7.5-5.5' },
  globe: {
    kind: 'stroke',
    path: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z',
  },
  briefcase: {
    kind: 'stroke',
    path: 'M4 8h16v11H4zM9 8V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V8M4 13h16',
  },
  pin: {
    kind: 'stroke',
    path: 'M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  },
  contact: {
    kind: 'stroke',
    path: 'M5 4h14v16H5zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM8.5 17a3.5 3.5 0 0 1 7 0',
  },
  play: {
    kind: 'fill',
    path: 'M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z',
  },
  arrow: { kind: 'stroke', path: 'M7 17 17 7M8 7h9v9' },
  share: { kind: 'stroke', path: 'M12 15V3M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7' },
} as const satisfies Record<string, Icon>;

export const PLATFORMS = {
  instagram: {
    label: 'Instagram',
    icon: brand(siInstagram),
    fromHandle: (h) => `https://instagram.com/${h}`,
    example: 'janepark',
  },
  x: { label: 'X', icon: brand(siX), fromHandle: (h) => `https://x.com/${h}`, example: 'janepark' },
  tiktok: {
    label: 'TikTok',
    icon: brand(siTiktok),
    fromHandle: (h) => `https://tiktok.com/@${h}`,
    example: 'janepark',
  },
  youtube: {
    label: 'YouTube',
    icon: brand(siYoutube),
    fromHandle: (h) => `https://youtube.com/@${h}`,
    example: 'janepark',
  },
  github: {
    label: 'GitHub',
    icon: brand(siGithub),
    fromHandle: (h) => `https://github.com/${h}`,
    example: 'janepark',
  },
  linkedin: {
    label: 'LinkedIn',
    icon: UI_ICONS.briefcase,
    fromHandle: (h) => `https://linkedin.com/in/${h}`,
    example: 'janepark',
  },
  threads: {
    label: 'Threads',
    icon: brand(siThreads),
    fromHandle: (h) => `https://threads.net/@${h}`,
    example: 'janepark',
  },
  bluesky: {
    label: 'Bluesky',
    icon: brand(siBluesky),
    fromHandle: (h) => `https://bsky.app/profile/${h}`,
    example: 'janepark.bsky.social',
  },
  mastodon: {
    label: 'Mastodon',
    icon: brand(siMastodon),
    example: 'https://mastodon.social/@janepark',
  },
  facebook: {
    label: 'Facebook',
    icon: brand(siFacebook),
    fromHandle: (h) => `https://facebook.com/${h}`,
    example: 'janepark',
  },
  twitch: {
    label: 'Twitch',
    icon: brand(siTwitch),
    fromHandle: (h) => `https://twitch.tv/${h}`,
    example: 'janepark',
  },
  spotify: {
    label: 'Spotify',
    icon: brand(siSpotify),
    example: 'https://open.spotify.com/artist/…',
  },
  applemusic: {
    label: 'Apple Music',
    icon: brand(siApplemusic),
    example: 'https://music.apple.com/…',
  },
  soundcloud: {
    label: 'SoundCloud',
    icon: brand(siSoundcloud),
    fromHandle: (h) => `https://soundcloud.com/${h}`,
    example: 'janepark',
  },
  discord: {
    label: 'Discord',
    icon: brand(siDiscord),
    example: 'https://discord.gg/…',
  },
  substack: {
    label: 'Substack',
    icon: brand(siSubstack),
    fromHandle: (h) => `https://${h}.substack.com`,
    example: 'janepark',
  },
  medium: {
    label: 'Medium',
    icon: brand(siMedium),
    fromHandle: (h) => `https://medium.com/@${h}`,
    example: 'janepark',
  },
  pinterest: {
    label: 'Pinterest',
    icon: brand(siPinterest),
    fromHandle: (h) => `https://pinterest.com/${h}`,
    example: 'janepark',
  },
  dribbble: {
    label: 'Dribbble',
    icon: brand(siDribbble),
    fromHandle: (h) => `https://dribbble.com/${h}`,
    example: 'janepark',
  },
  behance: {
    label: 'Behance',
    icon: brand(siBehance),
    fromHandle: (h) => `https://behance.net/${h}`,
    example: 'janepark',
  },
  snapchat: {
    label: 'Snapchat',
    icon: brand(siSnapchat),
    fromHandle: (h) => `https://snapchat.com/add/${h}`,
    example: 'janepark',
  },
  patreon: {
    label: 'Patreon',
    icon: brand(siPatreon),
    fromHandle: (h) => `https://patreon.com/${h}`,
    example: 'janepark',
  },
  kofi: {
    label: 'Ko-fi',
    icon: brand(siKofi),
    fromHandle: (h) => `https://ko-fi.com/${h}`,
    example: 'janepark',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: brand(siWhatsapp),
    fromHandle: (h) => `https://wa.me/${h.replace(/\D/g, '')}`,
    example: '"+1 555 0100"',
  },
  telegram: {
    label: 'Telegram',
    icon: brand(siTelegram),
    fromHandle: (h) => `https://t.me/${h}`,
    example: 'janepark',
  },
  email: {
    label: 'Email',
    icon: UI_ICONS.mail,
    fromHandle: (h) => `mailto:${h}`,
    example: 'hi@jane.dev',
  },
  website: {
    label: 'Website',
    icon: UI_ICONS.globe,
    example: 'https://jane.dev',
  },
} as const satisfies Record<string, Platform>;

export type PlatformId = keyof typeof PLATFORMS;
export const PLATFORM_IDS = Object.keys(PLATFORMS) as PlatformId[];

export function isPlatform(id: string): id is PlatformId {
  return Object.hasOwn(PLATFORMS, id);
}

const FULL_URL = /^https?:\/\//i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Resolves a config value (handle or full URL) to a link, or returns a reason it can't.
 * Kept separate from the schema so the error can name the exact fix.
 */
export function resolveSocial(
  id: PlatformId,
  value: string,
): { ok: true; url: string } | { ok: false; reason: string } {
  const v = value.trim();
  const platform: Platform = PLATFORMS[id];
  if (id === 'email') {
    const address = v.replace(/^mailto:/i, '');
    return EMAIL.test(address)
      ? { ok: true, url: `mailto:${address}` }
      : { ok: false, reason: `should be an email address, like ${platform.example}` };
  }
  if (FULL_URL.test(v)) {
    try {
      return { ok: true, url: new URL(v).toString() };
    } catch {
      return { ok: false, reason: `isn't a valid web address` };
    }
  }
  if (id === 'whatsapp') {
    const digits = v.replace(/\D/g, '');
    return digits.length >= 7
      ? { ok: true, url: `https://wa.me/${digits}` }
      : {
          ok: false,
          reason: `should be your phone number with country code, like ${platform.example}`,
        };
  }
  if (!platform.fromHandle) {
    return {
      ok: false,
      reason: `needs a full link starting with https://, like ${platform.example}`,
    };
  }
  const handle = v.replace(/^@/, '');
  if (!handle || /\s/.test(handle)) {
    return { ok: false, reason: `should be your username, like ${platform.example}` };
  }
  return { ok: true, url: platform.fromHandle(handle) };
}
