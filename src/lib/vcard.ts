// Builds a vCard 3.0 file, the version iOS, Android and desktop contacts apps all import.

export interface VCardInput {
  name: string;
  organization?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
  url?: string | undefined;
  note?: string | undefined;
  /** A small square JPEG, embedded so the contact shows the owner's picture. */
  photo?: Buffer | undefined;
  /** Social profiles, as X-SOCIALPROFILE (read by Apple Contacts and most others). */
  socials?: { id: string; url: string }[] | undefined;
}

function escape(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function buildVCard(input: VCardInput): string {
  const parts = input.name.trim().split(/\s+/);
  const family = parts.length > 1 ? (parts.pop() ?? '') : '';
  const given = parts.join(' ');

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escape(family)};${escape(given)};;;`,
    `FN:${escape(input.name.trim())}`,
  ];
  if (input.organization) lines.push(`ORG:${escape(input.organization)}`);
  if (input.phone) lines.push(`TEL;TYPE=CELL:${escape(input.phone)}`);
  if (input.email) lines.push(`EMAIL;TYPE=INTERNET:${escape(input.email)}`);
  if (input.url) lines.push(`URL:${escape(input.url)}`);
  for (const social of input.socials ?? []) {
    lines.push(`X-SOCIALPROFILE;TYPE=${social.id}:${escape(social.url)}`);
  }
  if (input.note) lines.push(`NOTE:${escape(input.note)}`);
  if (input.photo) lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${input.photo.toString('base64')}`);
  lines.push('END:VCARD');
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** vCard lines over 75 characters continue on the next line after a space (RFC 2425). */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) parts.push(' ' + line.slice(i, i + 74));
  return parts.join('\r\n');
}
