// Parses the share links people actually paste into an embeddable ID.

const YOUTUBE_ID = /^[\w-]{11}$/;

/** Returns the 11-character video ID from any common YouTube URL, or null. */
export function parseYouTubeId(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, '');
  let id: string | null = null;
  if (host === 'youtu.be') {
    id = url.pathname.slice(1).split('/')[0] ?? null;
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const [first, second] = url.pathname.split('/').filter(Boolean);
    if (first === 'watch') id = url.searchParams.get('v');
    else if (first === 'shorts' || first === 'embed' || first === 'live') id = second ?? null;
  }
  return id && YOUTUBE_ID.test(id) ? id : null;
}

export const SPOTIFY_KINDS = ['track', 'album', 'playlist', 'episode', 'show', 'artist'] as const;
export type SpotifyKind = (typeof SPOTIFY_KINDS)[number];

/** Returns the kind and ID from an open.spotify.com URL, or null. */
export function parseSpotify(input: string): { kind: SpotifyKind; id: string } | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.hostname !== 'open.spotify.com') return null;
  // Localized links look like /intl-de/track/<id>.
  const parts = url.pathname.split('/').filter((p) => p && !p.startsWith('intl-'));
  const [kind, id] = parts;
  if (!kind || !id || !(SPOTIFY_KINDS as readonly string[]).includes(kind)) return null;
  if (!/^[A-Za-z0-9]{22}$/.test(id)) return null;
  return { kind: kind as SpotifyKind, id };
}

/** Compact players suit single items; collections get the taller player with a track list. */
export function spotifyHeight(kind: SpotifyKind): number {
  return kind === 'track' || kind === 'episode' ? 152 : 352;
}
