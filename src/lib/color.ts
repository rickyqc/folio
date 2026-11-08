// WCAG contrast helpers, used to pick readable text on the owner's accent color.

export function expandHex(hex: string): string {
  const h = hex.replace('#', '');
  return h.length === 3
    ? `#${h
        .split('')
        .map((c) => c + c)
        .join('')}`.toLowerCase()
    : `#${h}`.toLowerCase();
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const h = expandHex(hex).slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * channel(r ?? 0) + 0.7152 * channel(g ?? 0) + 0.0722 * channel(b ?? 0);
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** White or near-black, whichever reads better on the given background. */
export function readableTextOn(background: string): '#ffffff' | '#1d1d1f' {
  return contrast(background, '#ffffff') >= contrast(background, '#1d1d1f') ? '#ffffff' : '#1d1d1f';
}

/** The page backgrounds in light and dark mode (see --bg in tokens.css). */
export const PAGE_BG = { light: '#fbfbfd', dark: '#000000' } as const;
const PAGE_TEXT = { light: '#1d1d1f', dark: '#f5f5f7' } as const;

/** How much accent a tinted background mixes in, per mode. Mirrors tokens.css. */
export const TINT = { light: 0.07, dark: 0.12 } as const;

export type Background = 'plain' | 'tinted';

/** `amount` of color a mixed into b, as a hex color (what CSS color-mix in srgb gives). */
export function mixHex(a: string, b: string, amount: number): string {
  const [x, y] = [expandHex(a), expandHex(b)];
  const channel = (i: number) => {
    const v =
      parseInt(x.slice(i, i + 2), 16) * amount + parseInt(y.slice(i, i + 2), 16) * (1 - amount);
    return Math.round(v).toString(16).padStart(2, '0');
  };
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

/** The page background for a mode: plain, or tinted with the accent. */
export function pageBackground(
  mode: 'light' | 'dark',
  accent: string,
  background: Background,
): string {
  return background === 'tinted' ? mixHex(accent, PAGE_BG[mode], TINT[mode]) : PAGE_BG[mode];
}

/**
 * An outline color for accent-filled buttons, per mode: the text color where the accent is too
 * close to the page background to stand out (under WCAG's 3:1 for UI parts), else transparent.
 * Returned as a light-dark() pair so one value serves auto, light and dark pages.
 */
export function accentRing(accent: string, background: Background = 'plain'): string {
  const ring = (mode: 'light' | 'dark') =>
    contrast(accent, pageBackground(mode, accent, background)) < 3
      ? PAGE_TEXT[mode]
      : 'transparent';
  return `light-dark(${ring('light')}, ${ring('dark')})`;
}
