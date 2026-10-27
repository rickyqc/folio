import type { Document, LineCounter } from 'yaml';
import type { z } from 'zod';
import { PLATFORMS, PLATFORM_IDS } from '../lib/socials.ts';
import { ANALYTICS_PROVIDERS, BLOCK_TYPES } from './schema.ts';

export interface Problem {
  line?: number | undefined;
  message: string;
  fix?: string | undefined;
}

/** Example values, so a "missing" error can show the exact line to add. */
const EXAMPLES: Record<string, string> = {
  name: 'Jane Park',
  title: 'My newsletter',
  url: 'https://example.com',
  alt: 'A short description of the image',
  src: 'poster.jpg',
  type: 'link',
  domain: 'jane.dev',
  websiteId: 'your-umami-website-id',
  accent: '"#0071e3"',
};

type Path = PropertyKey[];

/** Thrown when folio.config.yaml can't produce a page. `message` is ready to print. */
export class FolioConfigError extends Error {
  readonly problems: Problem[];

  constructor(problems: Problem[], fileName = 'folio.config.yaml') {
    super(renderProblems(problems, fileName));
    this.name = 'FolioConfigError';
    this.problems = problems;
  }
}

export function renderProblems(problems: Problem[], fileName = 'folio.config.yaml'): string {
  const count = problems.length === 1 ? '1 problem' : `${problems.length} problems`;
  const lines = [`${fileName} has ${count}, so your page wasn't updated.`, ''];
  problems.forEach((p, i) => {
    const where = p.line ? `Line ${p.line}: ` : '';
    lines.push(`  ${i + 1}. ${where}${p.message}`);
    if (p.fix) lines.push(`     Fix: ${p.fix}`);
    lines.push('');
  });
  return lines.join('\n').trimEnd();
}

function getAt(raw: unknown, path: Path): unknown {
  let node: unknown = raw;
  for (const key of path) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<PropertyKey, unknown>)[key];
  }
  return node;
}

/** The 1-based line of the deepest part of `path` that exists in the file. */
export function lineOf(doc: Document, counter: LineCounter, path: Path): number | undefined {
  for (let depth = path.length; depth >= 0; depth--) {
    const node = doc.getIn(path.slice(0, depth) as unknown[], true) as
      { range?: [number, number, number] } | undefined;
    if (node?.range) return counter.linePos(node.range[0]).line;
    if (depth === 0) return undefined;
  }
  return undefined;
}

function blockLabel(raw: unknown, index: number): string {
  const block = getAt(raw, ['blocks', index]) as Record<string, unknown> | undefined;
  const type = typeof block?.['type'] === 'string' ? block['type'] : undefined;
  const title = typeof block?.['title'] === 'string' ? block['title'] : undefined;
  if (!type) return `Block ${index + 1}`;
  return title ? `Block ${index + 1} (${type} “${title}”)` : `Block ${index + 1} (${type})`;
}

/** Splits a path into a human owner ("profile", "Block 3 (link “Shop”)") and the field name. */
function describe(raw: unknown, path: Path): { owner: string; field: string | undefined } {
  if (path[0] === 'blocks' && typeof path[1] === 'number') {
    const rest = path.slice(2).map(String);
    return { owner: blockLabel(raw, path[1]), field: rest.length ? rest.join('.') : undefined };
  }
  if (path.length === 0) return { owner: 'Your config', field: undefined };
  if (path.length === 1) return { owner: 'Your config', field: String(path[0]) };
  return { owner: path.slice(0, -1).map(String).join('.'), field: String(path.at(-1)) };
}

function distance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      const substitution = (row[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
      next.push(Math.min((row[j] ?? 0) + 1, (next[j - 1] ?? 0) + 1, substitution));
    }
    row = next;
  }
  return row[b.length] ?? 0;
}

export function suggest(input: string, options: readonly string[]): string | undefined {
  const lower = input.toLowerCase();
  let best: { option: string; score: number } | undefined;
  for (const option of options) {
    const score = distance(lower, option.toLowerCase());
    if (!best || score < best.score) best = { option, score };
  }
  return best && best.score <= Math.max(2, Math.floor(input.length / 3)) ? best.option : undefined;
}

const TYPE_WORDS: Record<string, string> = {
  string: 'text',
  boolean: 'true or false (without quotes)',
  array: 'a list (each item starts with "- ")',
  object: 'a section with options indented under it',
  number: 'a number',
};

/** Walks the schema to find which keys are allowed at `path`, for "did you mean" hints. */
function keysAt(schema: z.ZodType, path: Path, raw: unknown): string[] {
  let node = schema as unknown as { _zod: { def: Record<string, unknown> } };
  for (let i = 0; i <= path.length; i++) {
    // Unwrap defaults, optionals and refinements.
    while (['default', 'optional', 'pipe', 'nullable'].includes(node._zod.def['type'] as string)) {
      node = (node._zod.def['innerType'] ?? node._zod.def['in']) as typeof node;
    }
    const def = node._zod.def;
    if (def['type'] === 'union') {
      const value =
        getAt(raw, [...path.slice(0, i), 'type']) ?? getAt(raw, [...path.slice(0, i), 'provider']);
      const match = (def['options'] as (typeof node)[]).find((o) => {
        const shape = o._zod.def['shape'] as Record<
          string,
          { _zod: { def: { values?: unknown[] } } }
        >;
        const disc = shape['type'] ?? shape['provider'];
        return disc?._zod.def.values?.includes(value);
      });
      if (!match) return [];
      node = match;
      continue;
    }
    if (i === path.length) break;
    const key = path[i];
    if (def['type'] === 'object') {
      const shape = def['shape'] as Record<string, typeof node>;
      if (typeof key !== 'string' || !shape[key]) return [];
      node = shape[key];
    } else if (def['type'] === 'array') {
      node = def['element'] as typeof node;
    } else {
      return [];
    }
  }
  const finalDef = node._zod.def;
  return finalDef['type'] === 'object' ? Object.keys(finalDef['shape'] as object) : [];
}

export function issueToProblems(
  issue: z.core.$ZodIssue,
  raw: unknown,
  schema: z.ZodType,
  locate: (path: Path) => number | undefined,
): Problem[] {
  const path = issue.path;
  const { owner, field } = describe(raw, path);
  const line = locate(path);
  const value = getAt(raw, path);
  const quoted = field ? `"${field}"` : '';

  switch (issue.code) {
    case 'invalid_type': {
      if (value === undefined || value === null) {
        if (path.length === 1) {
          return [
            {
              line,
              message: `Your config is missing the ${field} section.`,
              fix: `Add a "${field}:" section. See folio.config.yaml in the Folio repo for an example.`,
            },
          ];
        }
        const example = field ? EXAMPLES[field.split('.').at(-1) ?? ''] : undefined;
        return [
          {
            line,
            message: `${owner} is missing ${quoted}.`,
            fix: field ? `Add a line like   ${field}: ${example ?? '…'}` : undefined,
          },
        ];
      }
      const want = TYPE_WORDS[issue.expected] ?? issue.expected;
      return [
        {
          line,
          message: field
            ? `${quoted} in ${owner} should be ${want}.`
            : `${owner} should be ${want}.`,
          fix:
            issue.expected === 'boolean'
              ? `Write true or false, without quotes.`
              : issue.expected === 'string'
                ? `Put the value in quotes if it contains : or # or starts with a special character.`
                : undefined,
        },
      ];
    }

    case 'unrecognized_keys': {
      const allowed = keysAt(schema, path, raw);
      return issue.keys.map((key) => {
        const guess = suggest(key, allowed);
        const where = path.length === 0 ? 'Your config' : describe(raw, [...path, key]).owner;
        return {
          line: locate([...path, key]),
          message: `${where} has an unknown option "${key}".${guess ? ` Did you mean "${guess}"?` : ''}`,
          fix: guess
            ? `Rename it to ${guess}.`
            : allowed.length
              ? `Allowed options here: ${allowed.join(', ')}.`
              : `Remove it.`,
        };
      });
    }

    case 'invalid_value': {
      const options = issue.values.map(String);
      const guess = typeof value === 'string' ? suggest(value, options) : undefined;
      return [
        {
          line,
          message: `${quoted} in ${owner} must be one of: ${options.join(', ')}. You wrote "${String(value)}".`,
          fix: guess ? `Did you mean ${guess}?` : undefined,
        },
      ];
    }

    case 'invalid_union': {
      // A block or analytics entry whose "type"/"provider" isn't recognized.
      // Zod may report this at the entry itself or at its discriminator key.
      const entry = path.at(-1) === 'type' || path.at(-1) === 'provider' ? path.slice(0, -1) : path;
      const discKey = entry.at(-1) === 'analytics' ? 'provider' : 'type';
      const disc = getAt(raw, [...entry, discKey]);
      const { owner } = describe(raw, entry);
      const allowed = discKey === 'type' ? BLOCK_TYPES : ANALYTICS_PROVIDERS;
      if (disc === undefined) {
        return [
          {
            line: locate(entry),
            message: `${owner} is missing "${discKey}".`,
            fix: `Add a line like   ${discKey}: ${allowed[0]}   (one of: ${allowed.join(', ')})`,
          },
        ];
      }
      const guess = typeof disc === 'string' ? suggest(disc, allowed) : undefined;
      return [
        {
          line: locate([...entry, discKey]),
          message: `${owner} has an unknown ${discKey} "${String(disc)}".${guess ? ` Did you mean "${guess}"?` : ''}`,
          fix: `Use one of: ${allowed.join(', ')}.`,
        },
      ];
    }

    case 'too_small':
      return [
        {
          line,
          message: `${quoted} in ${owner} can't be empty.`,
          fix: `Fill it in, or delete the line.`,
        },
      ];

    case 'invalid_format':
      return [{ line, message: `${quoted} in ${owner} ${issue.message}.` }];

    case 'custom': {
      const params = (issue.params ?? {}) as { folio?: string; first?: number };
      if (params.folio === 'unknown-social' && field) {
        const guess = suggest(field, PLATFORM_IDS);
        return [
          {
            line,
            message: `"${field}" in socials isn't a supported platform.${guess ? ` Did you mean "${guess}"?` : ''}`,
            fix: guess
              ? `Rename it to ${guess}.`
              : `Use one of: ${PLATFORM_IDS.join(', ')}. For anything else, add it as a link block.`,
          },
        ];
      }
      if (params.folio === 'second-featured') {
        return [
          {
            line,
            message: `${owner} is featured, but Block ${params.first} already is. Only one link can be featured.`,
            fix: `Remove "featured: true" from one of them.`,
          },
        ];
      }
      if (path[0] === 'socials' && field && field in PLATFORMS) {
        return [{ line, message: `${quoted} in socials ${issue.message}.` }];
      }
      return [
        {
          line,
          message: field
            ? `${quoted} in ${owner} ${issue.message}.`
            : `${owner}: ${issue.message}.`,
        },
      ];
    }

    default:
      return [
        {
          line,
          message: field
            ? `${quoted} in ${owner}: ${issue.message}.`
            : `${owner}: ${issue.message}.`,
        },
      ];
  }
}
