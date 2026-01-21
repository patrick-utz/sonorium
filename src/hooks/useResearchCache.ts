import { useState, useEffect, useCallback } from "react";

const CACHE_KEY = "sonorium_research_cache";
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  query: string;
}

interface ResearchCache {
  artist: Record<string, CacheEntry<any>>;
  album: Record<string, CacheEntry<any>>;
  prices: Record<string, CacheEntry<any>>;
}

export function useResearchCache() {
  const [cache, setCache] = useState<ResearchCache>(() => {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Clean expired entries
        const now = Date.now();
        Object.keys(parsed.artist || {}).forEach((key) => {
          if (now - parsed.artist[key].timestamp > CACHE_EXPIRY_MS) {
            delete parsed.artist[key];
          }
        });
        Object.keys(parsed.album || {}).forEach((key) => {
          if (now - parsed.album[key].timestamp > CACHE_EXPIRY_MS) {
            delete parsed.album[key];
          }
        });
        // Prices expire faster (1 day)
        Object.keys(parsed.prices || {}).forEach((key) => {
          if (now - parsed.prices[key].timestamp > 24 * 60 * 60 * 1000) {
            delete parsed.prices[key];
          }
        });
        return parsed;
      }
    } catch (e) {
      console.warn("Cache read error:", e);
    }
    return { artist: {}, album: {}, prices: {} };
  });

  // Persist cache to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.warn("Cache write error:", e);
    }
  }, [cache]);

  const getCacheKey = (type: "artist" | "album", ...parts: string[]) => {
    return parts.map((p) => p.toLowerCase().trim()).filter(Boolean).join("|");
  };

  const getArtistCache = useCallback(
    (artist: string) => {
      const key = getCacheKey("artist", artist);
      const entry = cache.artist[key];
      if (entry && Date.now() - entry.timestamp < CACHE_EXPIRY_MS) {
        return entry.data;
      }
      return null;
    },
    [cache.artist]
  );

  const setArtistCache = useCallback((artist: string, data: any) => {
    const key = getCacheKey("artist", artist);
    setCache((prev) => ({
      ...prev,
      artist: {
        ...prev.artist,
        [key]: { data, timestamp: Date.now(), query: artist },
      },
    }));
  }, []);

  const getAlbumCache = useCallback(
    (artist: string, album: string, label?: string, catalog?: string) => {
      const key = getCacheKey("album", artist, album, label || "", catalog || "");
      const entry = cache.album[key];
      if (entry && Date.now() - entry.timestamp < CACHE_EXPIRY_MS) {
        return entry.data;
      }
      return null;
    },
    [cache.album]
  );

  const setAlbumCache = useCallback(
    (artist: string, album: string, label: string | undefined, catalog: string | undefined, data: any) => {
      const key = getCacheKey("album", artist, album, label || "", catalog || "");
      setCache((prev) => ({
        ...prev,
        album: {
          ...prev.album,
          [key]: { data, timestamp: Date.now(), query: `${artist} - ${album}` },
        },
      }));
    },
    []
  );

  const getPriceCache = useCallback(
    (artist: string, album: string, catalogNumber: string) => {
      const key = getCacheKey("album", artist, album, catalogNumber);
      const entry = cache.prices[key];
      // Prices are valid for 24 hours
      if (entry && Date.now() - entry.timestamp < 24 * 60 * 60 * 1000) {
        return entry.data;
      }
      return null;
    },
    [cache.prices]
  );

  const setPriceCache = useCallback(
    (artist: string, album: string, catalogNumber: string, data: any) => {
      const key = getCacheKey("album", artist, album, catalogNumber);
      setCache((prev) => ({
        ...prev,
        prices: {
          ...prev.prices,
          [key]: { data, timestamp: Date.now(), query: catalogNumber },
        },
      }));
    },
    []
  );

  const getRecentSearches = useCallback(() => {
    const all = [
      ...Object.values(cache.artist).map((e) => ({
        type: "artist" as const,
        query: e.query,
        timestamp: e.timestamp,
      })),
      ...Object.values(cache.album).map((e) => ({
        type: "album" as const,
        query: e.query,
        timestamp: e.timestamp,
      })),
    ];
    return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [cache.artist, cache.album]);

  const clearCache = useCallback(() => {
    setCache({ artist: {}, album: {}, prices: {} });
    localStorage.removeItem(CACHE_KEY);
  }, []);

  const cacheStats = {
    artistCount: Object.keys(cache.artist).length,
    albumCount: Object.keys(cache.album).length,
    priceCount: Object.keys(cache.prices).length,
  };

  return {
    getArtistCache,
    setArtistCache,
    getAlbumCache,
    setAlbumCache,
    getPriceCache,
    setPriceCache,
    getRecentSearches,
    clearCache,
    cacheStats,
  };
}
