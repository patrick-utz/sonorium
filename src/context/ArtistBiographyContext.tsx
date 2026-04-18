import React, { createContext, useContext, ReactNode, useEffect, useRef } from "react";
import { useArtistBiographies, ArtistBiography, normalizeArtistName } from "@/hooks/useArtistBiographies";
import { useRecords } from "@/context/RecordContext";

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
  const { records } = useRecords();
  const seenArtistsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  // Auto-create bios for new artists added to the collection.
  // After initial load (snapshot), watch for newly added artists and generate bios in background.
  useEffect(() => {
    if (value.loading) return;

    const currentArtists = new Set(
      records.map((r) => normalizeArtistName(r.artist)).filter(Boolean)
    );

    if (!initializedRef.current) {
      // Initial snapshot: don't auto-generate for everything, just remember what we have
      seenArtistsRef.current = currentArtists;
      initializedRef.current = true;
      return;
    }

    // Find newly added artists since last render
    const newArtists: string[] = [];
    currentArtists.forEach((normalized) => {
      if (!seenArtistsRef.current.has(normalized)) {
        // Find the original (non-normalized) name from records
        const original = records.find(
          (r) => normalizeArtistName(r.artist) === normalized
        )?.artist;
        if (original && !value.getByArtist(original)) {
          newArtists.push(original);
        }
      }
    });
    seenArtistsRef.current = currentArtists;

    // Generate sequentially in background with small delay to avoid rate limiting
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
