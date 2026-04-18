import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface ArtistBiography {
  id: string;
  artist_name: string;
  artist_name_normalized: string;
  artist_image?: string | null;
  origin?: string | null;
  active_years?: string | null;
  genres?: string[];
  short_bio?: string | null;
  history?: string | null;
  key_facts?: string[];
  influences?: string[];
  legacy?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BioPayload {
  artist?: string;
  origin?: string;
  activeYears?: string;
  genres?: string[];
  shortBio?: string;
  history?: string;
  keyFacts?: string[];
  influences?: string[];
  legacy?: string;
}

const STALE_DAYS = 90;

export function normalizeArtistName(name: string) {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

export function isStale(updatedAt: string) {
  const ageMs = Date.now() - new Date(updatedAt).getTime();
  return ageMs > STALE_DAYS * 24 * 60 * 60 * 1000;
}

export function useArtistBiographies() {
  const { user } = useAuth();
  const [bios, setBios] = useState<ArtistBiography[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setBios([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("artist_biographies")
      .select("*")
      .order("artist_name", { ascending: true });
    if (error) {
      console.error("Bios fetch error:", error);
    } else {
      setBios((data || []) as ArtistBiography[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const getByArtist = useCallback(
    (artistName: string) => {
      const normalized = normalizeArtistName(artistName);
      return bios.find((b) => b.artist_name_normalized === normalized);
    },
    [bios]
  );

  const generateBio = useCallback(
    async (artistName: string, force = false): Promise<ArtistBiography | null> => {
      if (!user) return null;

      // Check if bio already exists and is fresh
      const existing = getByArtist(artistName);
      if (existing && !force && !isStale(existing.updated_at)) {
        return existing;
      }

      // Call edge function
      const { data, error } = await supabase.functions.invoke("artist-biography", {
        body: { artist: artistName },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.artist) throw new Error("Keine Biografie erhalten");

      const payload: BioPayload = data;
      const normalized = normalizeArtistName(artistName);

      const row = {
        user_id: user.id,
        artist_name: payload.artist || artistName,
        artist_name_normalized: normalized,
        origin: payload.origin || null,
        active_years: payload.activeYears || null,
        genres: payload.genres || [],
        short_bio: payload.shortBio || null,
        history: payload.history || null,
        key_facts: payload.keyFacts || [],
        influences: payload.influences || [],
        legacy: payload.legacy || null,
        updated_at: new Date().toISOString(),
      };

      const { data: saved, error: upsertError } = await supabase
        .from("artist_biographies")
        .upsert(row, { onConflict: "user_id,artist_name_normalized" })
        .select()
        .single();

      if (upsertError) throw new Error(upsertError.message);

      const savedBio = saved as ArtistBiography;
      setBios((prev) => {
        const others = prev.filter((b) => b.artist_name_normalized !== normalized);
        return [...others, savedBio].sort((a, b) =>
          a.artist_name.localeCompare(b.artist_name)
        );
      });
      return savedBio;
    },
    [user, getByArtist]
  );

  const ensureBio = useCallback(
    async (artistName: string): Promise<ArtistBiography | null> => {
      if (!user || !artistName?.trim()) return null;
      const existing = getByArtist(artistName);
      if (existing && !isStale(existing.updated_at)) return existing;
      try {
        return await generateBio(artistName, false);
      } catch (e) {
        console.warn("ensureBio failed:", e);
        return existing || null;
      }
    },
    [user, getByArtist, generateBio]
  );

  const deleteBio = useCallback(async (id: string) => {
    const { error } = await supabase.from("artist_biographies").delete().eq("id", id);
    if (error) throw new Error(error.message);
    setBios((prev) => prev.filter((b) => b.id !== id));
  }, []);

  return {
    bios,
    loading,
    fetchAll,
    getByArtist,
    generateBio,
    ensureBio,
    deleteBio,
  };
}
