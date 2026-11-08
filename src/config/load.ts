import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { LineCounter, parseDocument } from 'yaml';
import { parseSpotify, parseYouTubeId, spotifyHeight, type SpotifyKind } from '../lib/embeds.ts';
import { PLATFORMS, isEmoji, isPlatform, resolveSocial, type Icon } from '../lib/socials.ts';
import { FolioConfigError, issueToProblems, lineOf, type Problem } from './errors.ts';
import { configSchema, isImageFile, type FolioConfig } from './schema.ts';

export const CONFIG_FILE = 'folio.config.yaml';

export interface Social {
  id: string;
  label: string;
  url: string;
  icon: Icon;
}

export type ResolvedBlock =
  | {
      type: 'link';
      title: string;
      url: string;
      subtitle?: string;
      icon?: Icon;
      /** A picture from public/ shown instead of an icon. */
      thumb?: string;
      featured: boolean;
    }
  | { type: 'header'; title: string }
  | { type: 'youtube'; id: string; title?: string }
  | { type: 'spotify'; kind: SpotifyKind; id: string; height: number; title?: string }
  | { type: 'image'; src: string; alt: string; url?: string; caption?: string };

/** Everything the page needs, with defaults filled in and links resolved. */
export interface ResolvedConfig {
  site: { url?: string; title: string; description?: string; lang: string };
  /** avatar is an image path or URL; emoji is set instead when the avatar is an emoji. */
  profile: { name: string; bio?: string; avatar?: string; emoji?: string; location?: string };
  theme: FolioConfig['theme'];
  socials: Social[];
  blocks: ResolvedBlock[];
  embeds: FolioConfig['embeds'];
  contact: Omit<FolioConfig['contact'], 'email'> & { email?: string | undefined };
  analytics: FolioConfig['analytics'];
  footer: FolioConfig['footer'];
  /** Short links: yoursite/<slug> forwards to url. */
  redirects: { slug: string; url: string }[];
}

/** Turns "./avatar.jpg", "/avatar.jpg" or "public/avatar.jpg" into "avatar.jpg". */
function publicPath(src: string): string {
  return src.replace(/^\.?\//, '').replace(/^public\//, '');
}

function isRemote(src: string): boolean {
  return /^https?:\/\//i.test(src);
}

/**
 * Case-sensitive existence check. macOS ignores case but Linux hosts don't, so
 * "Me.JPG" would work locally and show a broken image once deployed.
 */
function existsExactly(dir: string, relativePath: string): boolean {
  let current = dir;
  for (const part of relativePath.split('/')) {
    let entries: string[];
    try {
      entries = readdirSync(current);
    } catch {
      return false;
    }
    if (!entries.includes(part)) return false;
    current = join(current, part);
  }
  return existsSync(current);
}

const SUPPORTED_IMAGE = /^\.(jpe?g|png|webp|avif|gif|svg)$/i;

function checkImage(
  src: string | undefined,
  path: PropertyKey[],
  publicDir: string,
  locate: (p: PropertyKey[]) => number | undefined,
): Problem | undefined {
  if (!src || isRemote(src)) return undefined;
  const file = publicPath(src);
  const ext = extname(file).toLowerCase();
  if (ext === '.heic' || ext === '.heif') {
    return {
      line: locate(path),
      message: `"${src}" is an iPhone HEIC photo, which most browsers can't show.`,
      fix: 'Save it as a JPG and upload that instead. On a Mac: open it in Preview, then File → Export → Format: JPEG. On iPhone: Settings → Camera → Formats → Most Compatible.',
    };
  }
  if (!SUPPORTED_IMAGE.test(ext)) {
    return {
      line: locate(path),
      message: `"${src}" isn't an image format Folio can use.`,
      fix: 'Use a JPG, PNG, WebP, AVIF, GIF or SVG file.',
    };
  }
  if (existsExactly(publicDir, file)) return undefined;
  let available: string[] = [];
  try {
    available = readdirSync(publicDir).filter((f) => SUPPORTED_IMAGE.test(extname(f)));
  } catch {
    // No public folder yet; the fix below covers it.
  }
  const hint = available.length
    ? ` Images in public/ now: ${available.slice(0, 8).join(', ')}.`
    : '';
  return {
    line: locate(path),
    message: `Can't find the image "${src}". Folio looked for public/${file}.`,
    fix: `Upload the file to the public folder, and check the spelling and capital letters match exactly.${hint}`,
  };
}

/** Validates and resolves config text. Throws FolioConfigError with every problem found. */
export function parseConfig(
  source: string,
  options: { publicDir: string; fileName?: string; fallbackUrl?: string | undefined },
): ResolvedConfig {
  const fileName = options.fileName ?? CONFIG_FILE;
  const counter = new LineCounter();
  const doc = parseDocument(source, { lineCounter: counter, prettyErrors: false });

  if (doc.errors.length > 0) {
    const lines = source.split('\n');
    const problems = doc.errors.map((e) => {
      const line = counter.linePos(e.pos[0]).line;
      return { line, ...yamlProblem(e.code, e.message, lines[line - 1] ?? '') };
    });
    // One slip can trip several YAML rules on the same line; report it once.
    const unique = problems.filter(
      (p, i) => problems.findIndex((q) => q.line === p.line && q.message === p.message) === i,
    );
    throw new FolioConfigError(unique, fileName);
  }

  const raw: unknown = doc.toJS();
  if (raw === null || raw === undefined) {
    throw new FolioConfigError(
      [
        {
          message: 'The file is empty.',
          fix: 'Copy the example config from the Folio repo and change it to your details.',
        },
      ],
      fileName,
    );
  }

  const locate = (path: PropertyKey[]) => lineOf(doc, counter, path);
  const result = configSchema.safeParse(raw);
  if (!result.success) {
    const colors = unquotedColors(source);
    const problems = result.error.issues
      .flatMap((issue) => issueToProblems(issue, raw, configSchema, locate))
      .filter((p) => !colors.some((c) => c.line === p.line));
    throw new FolioConfigError(sortByLine([...colors, ...problems]), fileName);
  }

  const config = result.data;
  const imageProblems = [
    isEmoji(config.profile.avatar ?? '')
      ? undefined
      : checkImage(config.profile.avatar, ['profile', 'avatar'], options.publicDir, locate),
    ...config.blocks.map((b, i) =>
      b.type === 'image'
        ? checkImage(b.src, ['blocks', i, 'src'], options.publicDir, locate)
        : b.type === 'link' && b.icon && isImageFile(b.icon)
          ? checkImage(b.icon, ['blocks', i, 'icon'], options.publicDir, locate)
          : undefined,
    ),
  ].filter((p): p is Problem => p !== undefined);
  const clashes = Object.keys(config.redirects)
    .filter((slug) => existsSync(join(options.publicDir, slug)))
    .map((slug) => ({
      line: locate(['redirects', slug]),
      message: `The short link "${slug}" has the same name as public/${slug}, so one would hide the other.`,
      fix: 'Rename the short link, or the file or folder in public/.',
    }));
  const fileProblems = [...imageProblems, ...clashes];
  if (fileProblems.length > 0) throw new FolioConfigError(fileProblems, fileName);

  return resolveConfig(config, options.fallbackUrl);
}

/** Puts the YAML parser's error into everyday words, with the fix for that slip. */
export function yamlProblem(
  code: string,
  parserMessage: string,
  text: string,
): { message: string; fix: string } {
  const colonInValue = /^\s*(?:-\s+)?([\w-]+):\s+([^'"].*?:\s.*)$/.exec(text);
  if (code === 'BLOCK_AS_IMPLICIT_KEY' && colonInValue) {
    const [, key, value] = colonInValue;
    return {
      message: `The text for "${key}" contains ": ", which YAML reads as the start of a new option.`,
      fix: `Put the text in quotes:   ${key}: "${value?.replace(/"/g, '\\"')}"`,
    };
  }
  switch (code) {
    case 'TAB_AS_INDENT':
      return {
        message: 'This line is indented with a tab.',
        fix: 'Replace the tab with spaces: two for each level, like the lines around it.',
      };
    case 'BLOCK_AS_IMPLICIT_KEY':
    case 'MULTILINE_IMPLICIT_KEY':
    case 'BAD_INDENT':
      return {
        message: 'This line’s indentation doesn’t line up with the lines around it.',
        fix: 'Use the same number of spaces as the other options in this section.',
      };
    case 'DUPLICATE_KEY': {
      const key = /^\s*(?:-\s+)?([\w-]+):/.exec(text)?.[1];
      return {
        message: `${key ? `"${key}"` : 'This option'} appears twice in the same section.`,
        fix: 'Keep one and delete the other.',
      };
    }
    case 'BAD_SCALAR_START': {
      const char = /character (\S)/.exec(parserMessage)?.[1] ?? '@';
      return {
        message: `A value can't start with ${char} unless it's in quotes.`,
        fix:
          char === '@'
            ? 'For a username, leave out the @ (instagram: jane). Otherwise put the value in quotes.'
            : 'Put the value in quotes.',
      };
    }
  }
  if (/quote/i.test(parserMessage)) {
    return {
      message: 'A quote is opened here but never closed.',
      fix: 'Add the matching quote at the end of the text.',
    };
  }
  if (/without - indicator/.test(parserMessage)) {
    return {
      message: 'This line’s indentation doesn’t line up with the lines around it.',
      fix: 'Line it up with the other options of the same block, just after the "- ".',
    };
  }
  return {
    message: `The file isn't valid YAML here (${parserMessage.split('\n')[0]}).`,
    fix: 'Check the indentation lines up with the lines above, and put text containing ": " or " #" in quotes.',
  };
}

/**
 * Finds colors written without quotes, like  accent: #ff375f. YAML reads everything after
 * " #" as a note, so the value silently disappears and the schema would only say it's missing.
 */
export function unquotedColors(source: string): Problem[] {
  return source.split('\n').flatMap((text, i) => {
    const match = /^\s*(?:-\s+)?([\w-]+):\s+(#[0-9a-f]{3}(?:[0-9a-f]{3})?)\b/i.exec(text);
    if (!match) return [];
    const [, key, color] = match;
    return [
      {
        line: i + 1,
        message: `The color for "${key}" needs quotes. Without them, everything after # is treated as a note and ignored.`,
        fix: `Write it as   ${key}: "${color}"`,
      },
    ];
  });
}

function sortByLine(problems: Problem[]): Problem[] {
  return [...problems].sort((a, b) => (a.line ?? Infinity) - (b.line ?? Infinity));
}

// Relative, so the page works at a domain root or under a subpath like GitHub Pages' /repo/.
function imageUrl(src: string): string {
  return isRemote(src) ? src : publicPath(src);
}

function resolveConfig(config: FolioConfig, fallbackUrl?: string): ResolvedConfig {
  const socials: Social[] = [];
  for (const [id, value] of Object.entries(config.socials)) {
    if (!isPlatform(id)) continue;
    const resolved = resolveSocial(id, value);
    if (resolved.ok) {
      socials.push({ id, label: PLATFORMS[id].label, url: resolved.url, icon: PLATFORMS[id].icon });
    }
  }

  const blocks = config.blocks.map((b): ResolvedBlock => {
    switch (b.type) {
      case 'link':
        return {
          type: 'link',
          title: b.title,
          url: b.url,
          featured: b.featured ?? false,
          ...(b.subtitle && { subtitle: b.subtitle }),
          ...(b.icon &&
            (isImageFile(b.icon)
              ? { thumb: imageUrl(b.icon) }
              : {
                  icon: isPlatform(b.icon)
                    ? PLATFORMS[b.icon].icon
                    : { kind: 'emoji' as const, char: b.icon },
                })),
        };
      case 'header':
        return b;
      case 'youtube':
        return {
          type: 'youtube',
          id: parseYouTubeId(b.url) ?? '',
          ...(b.title && { title: b.title }),
        };
      case 'spotify': {
        const { kind, id } = parseSpotify(b.url) ?? { kind: 'track' as const, id: '' };
        return {
          type: 'spotify',
          kind,
          id,
          height: spotifyHeight(kind),
          ...(b.title && { title: b.title }),
        };
      }
      case 'image':
        return {
          type: 'image',
          src: imageUrl(b.src),
          alt: b.alt,
          ...(b.url && { url: b.url }),
          ...(b.caption && { caption: b.caption }),
        };
    }
  });

  const siteUrl = config.site.url ?? fallbackUrl;
  const emailFromSocials = config.socials['email']?.replace(/^mailto:/i, '');
  const description = config.site.description ?? config.profile.bio;
  const email = config.contact.email ?? emailFromSocials;

  return {
    site: {
      title: config.site.title ?? config.profile.name,
      lang: config.site.lang,
      ...(siteUrl && { url: siteUrl.replace(/\/?$/, '/') }),
      ...(description && { description }),
    },
    profile: {
      name: config.profile.name,
      ...(config.profile.bio && { bio: config.profile.bio }),
      ...(config.profile.avatar &&
        (isEmoji(config.profile.avatar)
          ? { emoji: config.profile.avatar.trim() }
          : { avatar: imageUrl(config.profile.avatar) })),
      ...(config.profile.location && { location: config.profile.location }),
    },
    theme: config.theme,
    socials,
    blocks,
    embeds: config.embeds,
    contact: { ...config.contact, ...(email && { email }) },
    analytics: config.analytics,
    footer: config.footer,
    redirects: Object.entries(config.redirects).map(([slug, url]) => ({ slug, url })),
  };
}

/**
 * The page's public address as reported by the host, used when site.url isn't set,
 * so share images, QR codes and canonical links work without extra setup.
 */
export function hostUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const candidates = [
    env['FOLIO_SITE_URL'],
    env['VERCEL_PROJECT_PRODUCTION_URL'] && `https://${env['VERCEL_PROJECT_PRODUCTION_URL']}`,
    env['NETLIFY'] === 'true' ? env['URL'] : undefined,
  ];
  return candidates.find(
    (url): url is string => !!url && URL.canParse(url) && /^https?:/.test(url),
  );
}

/** Reads folio.config.yaml (or FOLIO_CONFIG, used by the end-to-end tests) from the project root. */
export function loadConfig(root = process.cwd()): ResolvedConfig {
  const file = resolve(root, process.env['FOLIO_CONFIG'] ?? CONFIG_FILE);
  if (!existsSync(file)) {
    throw new FolioConfigError(
      [
        {
          message: `Couldn't find ${CONFIG_FILE} in ${root}.`,
          fix: `Make sure the file is in the top folder of your repo and named exactly ${CONFIG_FILE}.`,
        },
      ],
      CONFIG_FILE,
    );
  }
  return parseConfig(readFileSync(file, 'utf8'), {
    publicDir: resolve(root, 'public'),
    fallbackUrl: hostUrl(),
  });
}
