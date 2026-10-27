import type { APIRoute, GetStaticPaths } from 'astro';
import { loadConfig } from '../config/load.ts';
import { buildVCard } from '../lib/vcard.ts';

// Only generated when contact.vcard is on, so phone numbers are never published by accident.
export const getStaticPaths = (() => {
  return loadConfig().contact.vcard ? [{ params: { file: 'contact' } }] : [];
}) satisfies GetStaticPaths;

export const GET: APIRoute = () => {
  const { profile, contact, site } = loadConfig();
  const card = buildVCard({
    name: profile.name,
    organization: contact.organization,
    phone: contact.phone,
    email: contact.email,
    url: site.url,
    note: profile.bio,
  });
  return new Response(card, { headers: { 'Content-Type': 'text/vcard; charset=utf-8' } });
};
