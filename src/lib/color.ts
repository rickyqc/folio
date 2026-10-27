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
