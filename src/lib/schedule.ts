// Showing blocks between dates. The page is static, so a block appears or disappears when the
// site rebuilds; .github/workflows/schedule.yml rebuilds shortly after each date starts.
// No imports, so that workflow can run this file with plain Node, before npm install.

export interface Visibility {
  hidden?: boolean | undefined;
  /** First day shown, YYYY-MM-DD in the owner's time zone. */
  from?: string | undefined;
  /** Last day shown, YYYY-MM-DD in the owner's time zone. */
  until?: string | undefined;
}

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY = 24 * 60 * 60 * 1000;

/** True for a real calendar date written YYYY-MM-DD. */
export function isDate(value: string): boolean {
  const match = DATE.exec(value);
  if (!match) return false;
  const [y, m, d] = match.slice(1).map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** True for a time zone name the build can use, like America/New_York or UTC. */
export function isTimeZone(value: string): boolean {
  if (!/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$/.test(value)) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
  } catch {
    return false;
  }
  // Intl also accepts old abbreviations like PST; ask for a Region/City name instead.
  return value === 'UTC' || value.includes('/');
}

/** Milliseconds the zone is ahead of UTC at the given instant. */
function offset(instant: number, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
      .formatToParts(instant)
      .map((p) => [p.type, Number(p.value)]),
  ) as Record<string, number>;
  const local = Date.UTC(
    parts['year'] ?? 0,
    (parts['month'] ?? 1) - 1,
    parts['day'] ?? 1,
    parts['hour'] ?? 0,
    parts['minute'] ?? 0,
    parts['second'] ?? 0,
  );
  return local - (instant - (instant % 1000));
}

/** The instant a YYYY-MM-DD day starts in the time zone. */
export function startOfDay(date: string, timeZone: string): number {
  const [y, m, d] = (DATE.exec(date) ?? []).slice(1).map(Number) as [number, number, number];
  const midnight = Date.UTC(y, m - 1, d);
  // Guess with the offset at UTC midnight, then correct once in case it changed that day.
  const guess = midnight - offset(midnight, timeZone);
  return midnight - offset(guess, timeZone);
}

/** The instant a block's until day ends. */
function endOfDay(date: string, timeZone: string): number {
  return startOfDay(
    new Date(Date.parse(`${date}T00:00:00Z`) + DAY).toISOString().slice(0, 10),
    timeZone,
  );
}

/** Whether a block is on the page at this instant. */
export function isShowing(block: Visibility, now: number, timeZone: string): boolean {
  if (block.hidden) return false;
  if (block.from && now < startOfDay(block.from, timeZone)) return false;
  if (block.until && now >= endOfDay(block.until, timeZone)) return false;
  return true;
}

/** The instants a block's dates take effect: when from starts and when until ends. */
export function changes(block: Visibility, timeZone: string): number[] {
  return [
    ...(block.from ? [startOfDay(block.from, timeZone)] : []),
    ...(block.until ? [endOfDay(block.until, timeZone)] : []),
  ];
}

/**
 * Every instant the page changes, read from the config text with a line scan rather than a YAML
 * parser, so the rebuild workflow needs no npm install. Extra matches only cause a spare rebuild.
 */
export function boundaries(source: string): number[] {
  const value = (line: string, key: string) =>
    new RegExp(`^\\s*(?:-\\s+)?${key}:\\s*['"]?([^'"#\\s]+)['"]?\\s*(?:#.*)?$`).exec(line)?.[1];
  const lines = source.split('\n');
  const zone = lines.map((l) => value(l, 'timezone')).find((v) => v && isTimeZone(v)) ?? 'UTC';
  return lines.flatMap((line) => {
    const from = value(line, 'from');
    const until = value(line, 'until');
    return changes(
      {
        ...(from && isDate(from) && { from }),
        ...(until && isDate(until) && { until }),
      },
      zone,
    );
  });
}

/**
 * True when a date in the config started within the last two hours. The workflow runs hourly
 * and GitHub can delay scheduled runs, so the window overlaps; a spare rebuild is harmless.
 */
export function scheduleDue(source: string, now: number, windowMs = 2 * 60 * 60 * 1000): boolean {
  return boundaries(source).some((t) => t <= now && t > now - windowMs);
}

/**
 * The blocks on the page at this instant, in order. A header goes too when every block under it
 * is off the page, so an ended tour doesn't leave a "Tour dates" heading over nothing. A header
 * that had nothing under it to begin with stays, since the owner put it there.
 */
export function onPage<T extends Visibility & { type: string }>(
  blocks: T[],
  now: number,
  timeZone: string,
): T[] {
  const shown = blocks.map((b) => isShowing(b, now, timeZone));
  return blocks.filter((b, i) => {
    if (!shown[i]) return false;
    if (b.type !== 'header') return true;
    const next = blocks.findIndex((n, j) => j > i && n.type === 'header');
    const section = shown.slice(i + 1, next === -1 ? undefined : next);
    return section.length === 0 || section.some(Boolean);
  });
}
