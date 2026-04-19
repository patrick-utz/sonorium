/**
 * Lightweight client-side album cover lookup.
 * Tries iTunes Search API first (fast, CORS-friendly), then falls back
 * to MusicBrainz + Cover Art Archive, and finally Discogs (via the
 * existing `discogs-marketplace` edge function).
 *
 * Returns a public image URL or null. Results are cached in-memory and
 * persisted in sessionStorage to avoid hammering APIs on re-renders.
 */

import { supabase } from "@/integrations/supabase/client";

const MEMORY_CACHE = new Map<string, string | null>();
const SESSION_KEY_PREFIX = "sonorium_album_cover_v1:";

function cacheKey(artist: string, album: string) {
  return `${artist.toLowerCase().trim()}|${album.toLowerCase().trim()}`;
}

function readSessionCache(key: string): string | null | undefined {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY_PREFIX + key);
    if (raw === null) return undefined;
    return raw === "" ? null : raw;
  } catch {
    return undefined;
  }
}

function writeSessionCache(key: string, value: string | null) {
  try {
    sessionStorage.setItem(SESSION_KEY_PREFIX + key, value ?? "");
  } catch {
    /* ignore quota errors */
  }
}

async function lookupItunes(artist: string, album: string): Promise<string | null> {
  try {
    const term = encodeURIComponent(`${artist} ${album}`);
    const url = `https://itunes.apple.com/search?term=${term}&entity=album&limit=5`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    const artistLc = artist.toLowerCase().trim();
    const albumLc = album.toLowerCase().trim();
    // Prefer exact-ish artist match
    const best =
      results.find(
        (r: any) =>
          (r.artistName || "").toLowerCase().trim() === artistLc &&
          (r.collectionName || "").toLowerCase().trim().includes(albumLc),
      ) ||
      results.find((r: any) =>
        (r.artistName || "").toLowerCase().includes(artistLc),
      ) ||
      results[0];
    if (!best?.artworkUrl100) return null;
    // Upgrade to higher-res
    return String(best.artworkUrl100).replace("100x100bb", "500x500bb");
  } catch {
    return null;
  }
}

async function lookupMusicBrainz(artist: string, album: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(`release:"${album}" AND artist:"${artist}"`);
    const searchUrl = `https://musicbrainz.org/ws/2/release/?query=${query}&fmt=json&limit=5`;
    const res = await fetch(searchUrl, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const releases = Array.isArray(data?.releases) ? data.releases : [];
    if (releases.length === 0) return null;

    // Try each release until we find one that has cover art
    for (const release of releases.slice(0, 3)) {
      try {
        const coverRes = await fetch(
          `https://coverartarchive.org/release/${release.id}/front-500`,
          { method: "HEAD" },
        );
        if (coverRes.ok) {
          return `https://coverartarchive.org/release/${release.id}/front-500`;
        }
      } catch {
        // continue
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function lookupDiscogs(artist: string, album: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("discogs-marketplace", {
      body: { artist, album, action: "search-alternatives" },
    });
    if (error) {
      console.warn("Discogs cover lookup error:", error.message);
      return null;
    }
    const alternatives = Array.isArray(data?.data?.alternatives)
      ? data.data.alternatives
      : [];
    if (alternatives.length === 0) return null;

    const artistLc = artist.toLowerCase().trim();
    const albumLc = album.toLowerCase().trim();
    // Prefer a result that matches both artist + album and has a cover
    const best =
      alternatives.find(
        (r: any) =>
          (r.cover_image || r.thumb) &&
          (r.artist || "").toLowerCase().includes(artistLc) &&
          (r.title || "").toLowerCase().includes(albumLc),
      ) ||
      alternatives.find((r: any) => r.cover_image || r.thumb);

    if (!best) return null;
    return best.cover_image || best.thumb || null;
  } catch (e) {
    console.warn("Discogs cover lookup failed:", e);
    return null;
  }
}

export async function lookupAlbumCover(
  artist: string,
  album: string,
): Promise<string | null> {
  if (!artist?.trim() || !album?.trim()) return null;
  const key = cacheKey(artist, album);

  // Memory cache
  if (MEMORY_CACHE.has(key)) return MEMORY_CACHE.get(key) ?? null;

  // Session cache
  const sessionHit = readSessionCache(key);
  if (sessionHit !== undefined) {
    MEMORY_CACHE.set(key, sessionHit);
    return sessionHit;
  }

  // Try iTunes → MusicBrainz → Discogs (in that order)
  let result = await lookupItunes(artist, album);
  if (!result) {
    result = await lookupMusicBrainz(artist, album);
  }
  if (!result) {
    result = await lookupDiscogs(artist, album);
  }

  MEMORY_CACHE.set(key, result);
  writeSessionCache(key, result);
  return result;
}
