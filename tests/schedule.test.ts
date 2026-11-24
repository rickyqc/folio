import { describe, expect, it } from 'vitest';
import {
  boundaries,
  isDate,
  isShowing,
  isTimeZone,
  scheduleDue,
  startOfDay,
} from '../src/lib/schedule.ts';

const at = (iso: string) => new Date(iso).getTime();

describe('startOfDay', () => {
  it('is midnight in the given time zone', () => {
    expect(startOfDay('2026-12-01', 'UTC')).toBe(at('2026-12-01T00:00:00Z'));
    expect(startOfDay('2026-12-01', 'America/Los_Angeles')).toBe(at('2026-12-01T08:00:00Z'));
    expect(startOfDay('2026-07-01', 'America/Los_Angeles')).toBe(at('2026-07-01T07:00:00Z'));
    expect(startOfDay('2026-12-01', 'Asia/Kolkata')).toBe(at('2026-11-30T18:30:00Z'));
  });

  it('handles the day clocks change', () => {
    // Clocks go forward at 2am on 2026-03-08 in Los Angeles; midnight is still PST.
    expect(startOfDay('2026-03-08', 'America/Los_Angeles')).toBe(at('2026-03-08T08:00:00Z'));
    expect(startOfDay('2026-03-09', 'America/Los_Angeles')).toBe(at('2026-03-09T07:00:00Z'));
  });
});

describe('isShowing', () => {
  const tz = 'America/New_York';

  it('shows blocks with no dates, and hides hidden ones', () => {
    expect(isShowing({}, at('2026-12-01T12:00:00Z'), tz)).toBe(true);
    expect(isShowing({ hidden: true }, at('2026-12-01T12:00:00Z'), tz)).toBe(false);
    expect(isShowing({ hidden: false }, at('2026-12-01T12:00:00Z'), tz)).toBe(true);
  });

  it('shows from the start of the from day', () => {
    const block = { from: '2026-12-01' };
    expect(isShowing(block, at('2026-12-01T04:59:00Z'), tz)).toBe(false);
    expect(isShowing(block, at('2026-12-01T05:00:00Z'), tz)).toBe(true);
  });

  it('shows through the end of the until day', () => {
    const block = { until: '2026-12-24' };
    expect(isShowing(block, at('2026-12-25T04:59:00Z'), tz)).toBe(true);
    expect(isShowing(block, at('2026-12-25T05:00:00Z'), tz)).toBe(false);
  });

  it('a hidden block stays hidden inside its dates', () => {
    expect(isShowing({ hidden: true, from: '2026-01-01' }, at('2026-06-01T00:00:00Z'), tz)).toBe(
      false,
    );
  });
});

describe('validation helpers', () => {
  it('accepts real dates only', () => {
    expect(isDate('2026-12-01')).toBe(true);
    expect(isDate('2028-02-29')).toBe(true);
    expect(isDate('2026-02-30')).toBe(false);
    expect(isDate('2026-12-1')).toBe(false);
    expect(isDate('Dec 1')).toBe(false);
  });

  it('accepts time zone names', () => {
    expect(isTimeZone('UTC')).toBe(true);
    expect(isTimeZone('Europe/London')).toBe(true);
    expect(isTimeZone('PST')).toBe(false);
    expect(isTimeZone('Mars/Olympus')).toBe(false);
  });
});

describe('scheduleDue', () => {
  const config = [
    'site:',
    '  timezone: America/Los_Angeles # Pacific',
    'blocks:',
    '  - type: link',
    '    title: Pre-save',
    '    url: https://a.com',
    "    until: '2026-12-04'",
    '  - type: link',
    '    title: Listen',
    '    url: https://b.com',
    '    from: "2026-12-05"',
    '    # from: 2026-01-01 is a note, not a date',
  ].join('\n');

  it('finds every date and the time zone without a YAML parser', () => {
    // until 2026-12-04 ends the moment from 2026-12-05 starts.
    expect(boundaries(config)).toEqual([at('2026-12-05T08:00:00Z'), at('2026-12-05T08:00:00Z')]);
  });

  it('is due shortly after a date starts in the owner’s time zone', () => {
    expect(scheduleDue(config, at('2026-12-05T08:20:00Z'))).toBe(true);
    expect(scheduleDue(config, at('2026-12-05T07:59:00Z'))).toBe(false);
    expect(scheduleDue(config, at('2026-12-05T11:00:00Z'))).toBe(false);
  });

  it('is never due without dates', () => {
    expect(scheduleDue('profile:\n  name: Jane\n', at('2026-12-05T08:20:00Z'))).toBe(false);
  });
});
