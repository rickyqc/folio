/** The addresses a link button can open, shared by the config and the builder. */
export function isLinkUrl(value: string): boolean {
  if (!URL.canParse(value)) return false;
  return (
    /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(value) ||
    (/^mailto:/i.test(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(new URL(value).pathname)) ||
    /^tel:\+?(?=[\d().-]*\d)[\d().-]+(?:;[^\s]+)?$/i.test(value)
  );
}
