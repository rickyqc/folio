import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { LineCounter, parseDocument } from 'yaml';
import { parseSpotify, parseYouTubeId, spotifyHeight, type SpotifyKind } from '../lib/embeds.ts';
import { PLATFORMS, isPlatform, resolveSocial, type Icon } from '../lib/socials.ts';
import { FolioConfigError, issueToProblems, lineOf, type Problem } from './errors.ts';
import { configSchema, type FolioConfig } from './schema.ts';

export const CONFIG_FILE = 'folio.config.yaml';

export interface Social {
  id: string;
  label: string;
  url: string;
  icon: Icon;
}

export type ResolvedBlock =
  | { type: 'link'; title: string; url: string; subtitle?: string; icon?: Icon; featured: boolean }
  | { type: 'header'; title: string }
  | { type: 'youtube'; id: string; title?: string }
  | { type: 'spotify'; kind: SpotifyKind; id: string; height: number; title?: string }
  | { type: 'image'; src: string; alt: string; url?: string; caption?: string };

/** Everything the page needs, with defaults filled in and links resolved. */
export interface ResolvedConfig {
  site: { url?: string; title: string; description?: string; lang: string };
  profile: { name: string; bio?: string; avatar?: string; location?: string };
  theme: FolioConfig['theme'];
  socials: Social[];
  blocks: ResolvedBlock[];
  embeds: FolioConfig['embeds'];
  contact: Omit<FolioConfig['contact'], 'email'> & { email?: string | undefined };
  analytics: FolioConfig['analytics'];
  footer: FolioConfig['footer'];
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

function checkImage(
  src: string | undefined,
  path: PropertyKey[],
  publicDir: string,
  locate: (p: PropertyKey[]) => number | undefined,
): Problem | undefined {
  if (!src || isRemote(src)) return undefined;
  const file = publicPath(src);
  if (existsExactly(publicDir, file)) return undefined;
  let available: string[] = [];
  try {
    available = readdirSync(publicDir).filter((f) => /\.(jpe?g|png|webp|avif|gif|svg)$/i.test(f));
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
  options: { publicDir: string; fileName?: string },
): ResolvedConfig {
  const fileName = options.fileName ?? CONFIG_FILE;
  const counter = new LineCounter();
  const doc = parseDocument(source, { lineCounter: counter, prettyErrors: false });

  if (doc.errors.length > 0) {
    throw new FolioConfigError(
      doc.errors.map((e) => ({
        line: counter.linePos(e.pos[0]).line,
        message: `The file isn't valid YAML here (${e.message.split('\n')[0]}).`,
        fix: 'Check the indentation lines up with the lines above, and put text containing ": " or " #" in quotes.',
      })),
      fileName,
    );
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
    const problems = result.error.issues.flatMap((issue) =>
      issueToProblems(issue, raw, configSchema, locate),
    );
    throw new FolioConfigError(sortByLine(problems), fileName);
  }

  const config = result.data;
  const imageProblems = [
    checkImage(config.profile.avatar, ['profile', 'avatar'], options.publicDir, locate),
    ...config.blocks.map((b, i) =>
      b.type === 'image'
        ? checkImage(b.src, ['blocks', i, 'src'], options.publicDir, locate)
        : undefined,
    ),
  ].filter((p): p is Problem => p !== undefined);
  if (imageProblems.length > 0) throw new FolioConfigError(imageProblems, fileName);

  return resolveConfig(config);
}

function sortByLine(problems: Problem[]): Problem[] {
  return [...problems].sort((a, b) => (a.line ?? Infinity) - (b.line ?? Infinity));
}

// Relative, so the page works at a domain root or under a subpath like GitHub Pages' /repo/.
function imageUrl(src: string): string {
  return isRemote(src) ? src : publicPath(src);
}

function resolveConfig(config: FolioConfig): ResolvedConfig {
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
          ...(b.icon && {
            icon: isPlatform(b.icon)
              ? PLATFORMS[b.icon].icon
              : { kind: 'emoji' as const, char: b.icon },
          }),
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

  const emailFromSocials = config.socials['email']?.replace(/^mailto:/i, '');
  const description = config.site.description ?? config.profile.bio;
  const email = config.contact.email ?? emailFromSocials;

  return {
    site: {
      title: config.site.title ?? config.profile.name,
      lang: config.site.lang,
      ...(config.site.url && { url: config.site.url.replace(/\/?$/, '/') }),
      ...(description && { description }),
    },
    profile: {
      name: config.profile.name,
      ...(config.profile.bio && { bio: config.profile.bio }),
      ...(config.profile.avatar && { avatar: imageUrl(config.profile.avatar) }),
      ...(config.profile.location && { location: config.profile.location }),
    },
    theme: config.theme,
    socials,
    blocks,
    embeds: config.embeds,
    contact: { ...config.contact, ...(email && { email }) },
    analytics: config.analytics,
    footer: config.footer,
  };
}

/** Reads folio.config.yaml from the project root. */
export function loadConfig(root = process.cwd()): ResolvedConfig {
  const file = resolve(root, CONFIG_FILE);
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
  return parseConfig(readFileSync(file, 'utf8'), { publicDir: resolve(root, 'public') });
}
