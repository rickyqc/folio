// Builds a vCard 3.0 file, the version iOS, Android and desktop contacts apps all import.

export interface VCardInput {
  name: string;
  organization?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
  url?: string | undefined;
  note?: string | undefined;
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
  if (input.note) lines.push(`NOTE:${escape(input.note)}`);
  lines.push('END:VCARD');
  return lines.join('\r\n') + '\r\n';
}
