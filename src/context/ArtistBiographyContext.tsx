import React, { createContext, useContext, ReactNode } from "react";
import { useArtistBiographies, ArtistBiography } from "@/hooks/useArtistBiographies";

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
