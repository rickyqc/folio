import type { APIRoute } from 'astro';
import { renderShareCard } from '../og-card';

export const GET: APIRoute = async () =>
  new Response(new Uint8Array(await renderShareCard()), {
    headers: { 'Content-Type': 'image/png' },
  });
