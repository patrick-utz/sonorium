import React, { createContext, useContext, ReactNode, useEffect, useRef } from "react";
import { useArtistBiographies, ArtistBiography, normalizeArtistName } from "@/hooks/useArtistBiographies";
import { useRecords } from "@/context/RecordContext";
import { supabase } from "@/integrations/supabase/client";

interface ArtistBiographyContextType {
  bios: ArtistBiography[];
  loading: boolean;
  fetchAll: () => Promise<void>;
  getByArtist: (artistName: string) => ArtistBiography | undefined;
  generateBio: (artistName: string, force?: boolean) => Promise<ArtistBiography | null>;
  ensureBio: (artistName: string) => Promise<ArtistBiography | null>;
  deleteBio: (id: string) => Promise<void>;
}

const ArtistBiographyContext = createContext<ArtistBiographyContextType | undefined>(undefined);

export function ArtistBiographyProvider({ children }: { children: ReactNode }) {
  const value = useArtistBiographies();
  const { records, loading: recordsLoading } = useRecords();
  const seenArtistsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const cleanupRanRef = useRef(false);

  // Auto-create bios for new artists added to the collection.
  useEffect(() => {
    if (value.loading) return;

    const currentArtists = new Set(
      records.map((r) => normalizeArtistName(r.artist)).filter(Boolean)
    );

    if (!initializedRef.current) {
      seenArtistsRef.current = currentArtists;
      initializedRef.current = true;
      return;
    }

    const newArtists: string[] = [];
    currentArtists.forEach((normalized) => {
      if (!seenArtistsRef.current.has(normalized)) {
        const original = records.find(
          (r) => normalizeArtistName(r.artist) === normalized
        )?.artist;
        if (original && !value.getByArtist(original)) {
          newArtists.push(original);
        }
      }
    });
    seenArtistsRef.current = currentArtists;

    if (newArtists.length > 0) {
      (async () => {
        for (const artist of newArtists) {
          try {
            await value.ensureBio(artist);
            await new Promise((r) => setTimeout(r, 1500));
          } catch (e) {
            console.warn("Background bio creation failed for", artist, e);
          }
        }
      })();
    }
  }, [records, value]);

  // Cleanup: Remove bios for artists no longer in the user's records
  // (collection or wishlist). Runs once after records + bios are loaded.
  useEffect(() => {
    if (cleanupRanRef.current) return;
    if (value.loading || recordsLoading) return;
    if (value.bios.length === 0) return;
    // Safety: if records are empty (could be a transient state), skip.
    if (records.length === 0) return;
    cleanupRanRef.current = true;

    const currentArtists = new Set(
      records.map((r) => normalizeArtistName(r.artist)).filter(Boolean)
    );

    const orphaned = value.bios.filter(
      (b) => !currentArtists.has(b.artist_name_normalized)
    );

    if (orphaned.length === 0) return;

    (async () => {
      const ids = orphaned.map((b) => b.id);
      const { error } = await supabase
        .from("artist_biographies")
        .delete()
        .in("id", ids);
      if (error) {
        console.warn("Orphan bio cleanup failed:", error);
        return;
      }
      console.log(`Removed ${orphaned.length} orphaned artist bio(s)`);
      await value.fetchAll();
    })();
  }, [records, recordsLoading, value]);

  return (
    <ArtistBiographyContext.Provider value={value}>
      {children}
    </ArtistBiographyContext.Provider>
  );
}

export function useArtistBios() {
  const ctx = useContext(ArtistBiographyContext);
  if (!ctx) throw new Error("useArtistBios must be used within an ArtistBiographyProvider");
  return ctx;
}
