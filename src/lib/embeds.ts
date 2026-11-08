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

/** True for a channel page (youtube.com/@name, /channel/…, /c/…, /user/…) rather than a video. */
export function isYouTubeChannel(input: string): boolean {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return false;
  }
  const host = url.hostname.replace(/^(www\.|m\.)/, '');
  const first = url.pathname.split('/').filter(Boolean)[0] ?? '';
  return (
    host === 'youtube.com' && (first.startsWith('@') || ['channel', 'c', 'user'].includes(first))
  );
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

export type AppleMusicKind = 'album' | 'playlist' | 'song';

/**
 * Turns a music.apple.com share link into the embed player address and its kind. A song
 * shared from an album (…/album/name/123?i=456) plays as that single song.
 */
export function parseAppleMusic(input: string): { kind: AppleMusicKind; src: string } | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.hostname !== 'music.apple.com') return null;
  const [country, kind, ...rest] = url.pathname.split('/').filter(Boolean);
  const id = rest.at(-1);
  if (!country || !/^[a-z]{2}$/.test(country) || !id) return null;
  if (kind !== 'album' && kind !== 'playlist' && kind !== 'song') return null;
  const song = url.searchParams.get('i');
  const src = `https://embed.music.apple.com${url.pathname}${song ? `?i=${encodeURIComponent(song)}` : ''}`;
  return { kind: kind === 'album' && song ? 'song' : kind, src };
}

/** Single songs get the compact player; albums and playlists show their track list. */
export function appleMusicHeight(kind: AppleMusicKind): number {
  return kind === 'song' ? 175 : 450;
}

/**
 * Checks a soundcloud.com track or playlist link and returns its clean address and whether
 * it's a playlist. Short on.soundcloud.com links can't be read at build time, so they're refused.
 */
export function parseSoundCloud(input: string): { url: string; playlist: boolean } | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.hostname.replace(/^(www\.|m\.)/, '') !== 'soundcloud.com') return null;
  const parts = url.pathname.split('/').filter(Boolean);
  const playlist = parts.length === 3 && parts[1] === 'sets';
  if (!(parts.length === 2 || playlist) || ['discover', 'search', 'you'].includes(parts[0] ?? '')) {
    return null;
  }
  return { url: `https://soundcloud.com/${parts.join('/')}`, playlist };
}

/** SoundCloud's player for a track or playlist, in the owner's accent color. */
export function soundCloudPlayer(trackUrl: string, accent: string): string {
  const params = new URLSearchParams({
    url: trackUrl,
    color: accent,
    visual: 'false',
    show_comments: 'false',
    show_reposts: 'false',
  });
  return `https://w.soundcloud.com/player/?${params}`;
}
