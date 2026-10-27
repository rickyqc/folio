import { z } from 'zod';
import { parseSpotify, parseYouTubeId } from '../lib/embeds.ts';
import { PLATFORMS, PLATFORM_IDS, isEmoji, isPlatform, resolveSocial } from '../lib/socials.ts';

const webUrl = z
  .string()
  .trim()
  .refine((v) => /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v) && URL.canParse(v), {
    message: 'must be a full web address starting with https://',
  });

const text = z.string().trim().min(1);

/** A file in public/ (e.g. "me.jpg") or a full image URL. Existence is checked by the loader. */
const imageSource = z.string().trim().min(1);

const hexColor = z
  .string()
  .trim()
  .regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, 'must be a hex color in quotes, like "#0071e3"');

const linkBlock = z.strictObject({
  type: z.literal('link'),
  title: text.describe('The button text.'),
  url: webUrl.describe('Where the button goes. Must start with https://'),
  subtitle: text.optional().describe('A short second line under the title.'),
  icon: z
    .string()
    .trim()
    .refine((v) => isPlatform(v) || isEmoji(v), {
      message: 'must be a platform name like youtube, or a single emoji in quotes like "🎨"',
    })
    .optional()
    .describe(
      'An icon on the left of the button: a platform name (e.g. youtube) or an emoji (e.g. "🎨").',
    ),
  featured: z.boolean().optional().describe('Make this your one highlighted link.'),
});

const headerBlock = z.strictObject({
  type: z.literal('header'),
  title: text.describe('Section heading, e.g. "Listen" or "Work with me".'),
});

const youtubeBlock = z.strictObject({
  type: z.literal('youtube'),
  url: webUrl.refine((v) => parseYouTubeId(v) !== null, {
    message: 'must be a YouTube video link, like https://youtube.com/watch?v=dQw4w9WgXcQ',
  }),
  title: text.optional().describe('Shown on the player before it loads.'),
});

const spotifyBlock = z.strictObject({
  type: z.literal('spotify'),
  url: webUrl.refine((v) => parseSpotify(v) !== null, {
    message:
      'must be a Spotify share link for a track, album, playlist, episode, show or artist, like https://open.spotify.com/track/…',
  }),
  title: text.optional().describe('Shown on the player before it loads.'),
});

const imageBlock = z.strictObject({
  type: z.literal('image'),
  src: imageSource.describe('A file in the public folder (e.g. poster.jpg) or a full image URL.'),
  alt: text.describe('Describes the image for people using screen readers. Required.'),
  url: webUrl.optional().describe('Make the image a link.'),
  caption: text.optional(),
});

export const BLOCK_TYPES = ['link', 'header', 'youtube', 'spotify', 'image'] as const;
export const ANALYTICS_PROVIDERS = ['none', 'plausible', 'umami'] as const;

const block = z.discriminatedUnion('type', [
  linkBlock,
  headerBlock,
  youtubeBlock,
  spotifyBlock,
  imageBlock,
]);

const socials = z
  .record(z.string(), z.string())
  .superRefine((value, ctx) => {
    for (const [id, handle] of Object.entries(value)) {
      if (!isPlatform(id)) {
        ctx.addIssue({
          code: 'custom',
          path: [id],
          message: 'is not a supported platform',
          params: { folio: 'unknown-social' },
        });
        continue;
      }
      const resolved = resolveSocial(id, handle);
      if (!resolved.ok) {
        ctx.addIssue({ code: 'custom', path: [id], message: resolved.reason });
      }
    }
  })
  .describe(`Your social profiles. Supported: ${PLATFORM_IDS.join(', ')}.`);

export const configSchema = z
  .strictObject({
    site: z
      .strictObject({
        url: webUrl
          .optional()
          .describe('Your page’s address, e.g. https://jane.dev. Used for search engines.'),
        title: text.optional().describe('Browser tab and search title. Defaults to your name.'),
        description: text
          .optional()
          .describe('Search and share description. Defaults to your bio.'),
        lang: z
          .string()
          .regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/, 'must be a language code, like en or pt-BR')
          .default('en'),
      })
      .default({ lang: 'en' }),

    profile: z.strictObject({
      name: text.describe('Your name, shown at the top of the page.'),
      bio: text.optional().describe('One line about you.'),
      avatar: imageSource
        .optional()
        .describe(
          'Your photo: a file in the public folder (e.g. me.jpg), a full image URL, or a single emoji in quotes (e.g. "👩‍🎨").',
        ),
      location: text.optional().describe('e.g. Oakland, CA'),
    }),

    theme: z
      .strictObject({
        mode: z
          .enum(['auto', 'light', 'dark'])
          .default('auto')
          .describe('auto follows the visitor’s device setting.'),
        accent: hexColor.default('#0071e3').describe('Color of your featured link and highlights.'),
        buttons: z.enum(['rounded', 'pill']).default('rounded').describe('Button shape.'),
      })
      .default({ mode: 'auto', accent: '#0071e3', buttons: 'rounded' }),

    socials: socials.default({}),

    blocks: z.array(block).default([]).describe('Your links, headers and embeds, top to bottom.'),

    embeds: z
      .strictObject({
        loadOnTap: z
          .boolean()
          .default(false)
          .describe(
            'Show a placeholder and load YouTube and Spotify players only when tapped, so those companies can’t see who visits your page.',
          ),
      })
      .default({ loadOnTap: false }),

    contact: z
      .strictObject({
        vcard: z
          .boolean()
          .default(false)
          .describe('Show a “Save contact” button that downloads your contact card.'),
        phone: text.optional(),
        email: z.email('must be an email address, like hi@jane.dev').optional(),
        organization: text.optional(),
      })
      .default({ vcard: false }),

    analytics: z
      .discriminatedUnion('provider', [
        z.strictObject({ provider: z.literal('none') }),
        z.strictObject({
          provider: z.literal('plausible'),
          domain: text.describe('The site domain you added in Plausible, e.g. jane.dev'),
          src: webUrl.optional().describe('Only if you self-host Plausible.'),
        }),
        z.strictObject({
          provider: z.literal('umami'),
          websiteId: text.describe('The Website ID from your Umami dashboard.'),
          src: webUrl.optional().describe('Your Umami script URL, if self-hosted.'),
        }),
      ])
      .default({ provider: 'none' }),

    footer: z
      .strictObject({
        credit: z.boolean().default(true).describe('Show a small “Made with Folio” link.'),
        share: z
          .boolean()
          .default(false)
          .describe(
            'Show a Share button (share sheet on phones, copy link on computers). Adds a tiny script.',
          ),
      })
      .default({ credit: true, share: false }),
  })
  .superRefine((config, ctx) => {
    const featured = config.blocks.flatMap((b, i) => (b.type === 'link' && b.featured ? [i] : []));
    for (const i of featured.slice(1)) {
      ctx.addIssue({
        code: 'custom',
        path: ['blocks', i, 'featured'],
        message: 'only one link can be featured',
        params: { folio: 'second-featured', first: (featured[0] ?? 0) + 1 },
      });
    }
  });

export type FolioConfig = z.output<typeof configSchema>;
export type Block = FolioConfig['blocks'][number];

/** JSON Schema for editor autocomplete, with the socials map spelled out per platform. */
export function toJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(configSchema, { io: 'input', unrepresentable: 'any' }) as {
    properties: Record<string, Record<string, unknown>>;
  };
  schema.properties['socials'] = {
    type: 'object',
    description: 'Your social profiles: a username or a full link for each.',
    additionalProperties: false,
    properties: Object.fromEntries(
      Object.entries(PLATFORMS).map(([id, p]) => [
        id,
        { type: 'string', description: `${p.label}, e.g. ${p.example}` },
      ]),
    ),
  };
  return {
    $id: 'https://github.com/rickyqc/folio/blob/main/folio.schema.json',
    title: 'Folio config',
    ...schema,
  };
}
