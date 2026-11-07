// Forgives the most common slips when typing an address, so they fix themselves instead of
// failing the build. Shared with the config builder, so both treat links the same way.

const EMAIL = /^[^\s@/:]+@[^\s@/]+\.[^\s@/]+$/;

/** Adds https:// to something that looks like a bare domain: "jane.dev/shop", "www.jane.dev". */
export function withScheme(value: string): string {
  const v = value.trim();
  const bareDomain = /^[^\s/@:]+\.[^\s/@:]+(:\d+)?([/?#]\S*)?$/.test(v);
  return bareDomain && !/^[a-z][a-z0-9+-]*:/i.test(v) ? `https://${v}` : v;
}

/** For link buttons: a bare email becomes a mailto: link, a bare domain gets https://. */
export function withLinkScheme(value: string): string {
  const v = value.trim();
  return EMAIL.test(v) ? `mailto:${v}` : withScheme(v);
}
