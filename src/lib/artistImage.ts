/**
 * Fetch a representative image for an artist from Wikipedia.
 * Free, no API key, CORS-enabled. Returns null if nothing usable found.
 */
export async function fetchArtistImageFromWikipedia(
  artistName: string
): Promise<string | null> {
  if (!artistName?.trim()) return null;

  // Try a few title variants to maximize hit rate
  const variants = [
    `${artistName} (musician)`,
    `${artistName} (band)`,
    artistName,
  ];

  for (const title of variants) {
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        title
      )}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) continue;
      const data = await res.json();
      // Prefer the larger original image, fall back to thumbnail
      const img = data?.originalimage?.source || data?.thumbnail?.source;
      if (img && typeof img === "string") return img;
    } catch {
      // try next variant
    }
  }

  return null;
}
