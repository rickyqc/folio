import type { APIRoute, GetStaticPaths } from 'astro';
import { loadConfig } from '../config/load.ts';
import { resolve } from 'node:path';
import { avatarJpeg } from '../lib/images.ts';
import { buildVCard } from '../lib/vcard.ts';

// Only generated when contact.vcard is on, so phone numbers are never published by accident.
export const getStaticPaths = (() => {
  return loadConfig().contact.vcard ? [{ params: { file: 'contact' } }] : [];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async () => {
  const { profile, contact, site, socials } = loadConfig();
  const card = buildVCard({
    name: profile.name,
    organization: contact.organization,
    phone: contact.phone,
    email: contact.email,
    url: site.url,
    note: profile.bio,
    photo: profile.avatar ? await avatarJpeg(resolve('public'), profile.avatar) : undefined,
    // Email is already its own field.
    socials: socials.filter((s) => s.id !== 'email').map(({ id, url }) => ({ id, url })),
  });
  return new Response(card, { headers: { 'Content-Type': 'text/vcard; charset=utf-8' } });
};
