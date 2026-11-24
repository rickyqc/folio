// theme.font choices. Each is a stack of fonts already on the visitor's device, so a choice
// never adds a download. ui-serif, ui-rounded and ui-monospace are Apple's own faces (New York,
// SF Pro Rounded, SF Mono); the names after them cover Windows, Android and Linux. Rounded has no
// common equivalent elsewhere, so it falls back to the usual system font there.

const SYSTEM = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, system-ui, sans-serif";

export const FONT_STACKS = {
  system: SYSTEM,
  serif: "ui-serif, 'Iowan Old Style', Charter, Georgia, Cambria, 'Noto Serif', serif",
  rounded: `ui-rounded, 'SF Pro Rounded', ${SYSTEM}`,
  mono: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, 'Cascadia Mono', Consolas, 'Roboto Mono', 'Liberation Mono', monospace",
} as const;

export type Font = keyof typeof FONT_STACKS;

/** The inline style that sets the page font, or nothing for the default in tokens.css. */
export function fontStyle(font: Font): string {
  return font === 'system' ? '' : `; --font: ${FONT_STACKS[font]}`;
}
