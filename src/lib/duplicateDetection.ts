import { Record } from "@/types/record";

export interface DuplicateMatch {
  recordId: string;
  artist: string;
  album: string;
  year?: number;
  label?: string;
  catalogNumber?: string;
  matchType: "exact" | "same-album-different-pressing" | "potential";
  matchReason: string;
  dateAdded?: string;
}

/**
 * Detect potential duplicates in collection
 * Helps prevent adding the same album multiple times
 */
export function detectDuplicates(
  existingRecords: Record[],
  newArtist: string,
  newAlbum: string,
  newYear?: number,
  newLabel?: string,
  newCatalogNumber?: string
): DuplicateMatch[] {
  if (!existingRecords.length) return [];

  const matches: DuplicateMatch[] = [];
  const normalizeStr = (str?: string) => str?.toLowerCase().trim().replace(/[^\w\s]/g, "") || "";

  const newArtistNorm = normalizeStr(newArtist);
  const newAlbumNorm = normalizeStr(newAlbum);
  const newLabelNorm = normalizeStr(newLabel);
  const newCatalogNorm = normalizeStr(newCatalogNumber);

  existingRecords.forEach((record) => {
    const existingArtistNorm = normalizeStr(record.artist);
    const existingAlbumNorm = normalizeStr(record.album);
    const existingLabelNorm = normalizeStr(record.label);
    const existingCatalogNorm = normalizeStr(record.catalogNumber);

    // Exact match: same artist + album + year + label + catalog
    if (
      newArtistNorm === existingArtistNorm &&
      newAlbumNorm === existingAlbumNorm &&
      newYear === record.year &&
      newLabelNorm === existingLabelNorm &&
      newCatalogNorm === existingCatalogNorm &&
      newCatalogNumber && record.catalogNumber // both must have catalog number for exact match
    ) {
      matches.push({
        recordId: record.id,
        artist: record.artist,
        album: record.album,
        year: record.year,
        label: record.label,
        catalogNumber: record.catalogNumber,
        matchType: "exact",
        matchReason: "Identisches Album, Label und Katalognummer",
        dateAdded: record.dateAdded,
      });
      return;
    }

    // Same album, different pressing: same artist + album + year, but different label/catalog
    if (
      newArtistNorm === existingArtistNorm &&
      newAlbumNorm === existingAlbumNorm &&
      newYear === record.year &&
      (newLabelNorm !== existingLabelNorm || newCatalogNorm !== existingCatalogNorm)
    ) {
      matches.push({
        recordId: record.id,
        artist: record.artist,
        album: record.album,
        year: record.year,
        label: record.label,
        catalogNumber: record.catalogNumber,
        matchType: "same-album-different-pressing",
        matchReason: `Anderer Release: ${record.label || "Unbekannt"} (${record.catalogNumber || "N/A"})`,
        dateAdded: record.dateAdded,
      });
      return;
    }

    // Potential match: same artist + album (different year or missing year)
    if (
      newArtistNorm === existingArtistNorm &&
      newAlbumNorm === existingAlbumNorm &&
      (!newYear || !record.year || newYear !== record.year)
    ) {
      matches.push({
        recordId: record.id,
        artist: record.artist,
        album: record.album,
        year: record.year,
        label: record.label,
        catalogNumber: record.catalogNumber,
        matchType: "potential",
        matchReason: "Ähnliches Album (Jahr könnte unterschiedlich sein)",
        dateAdded: record.dateAdded,
      });
    }
  });

  return matches;
}

/**
 * Format duplicate match for user display
 */
export function formatDuplicateMessage(match: DuplicateMatch): string {
  switch (match.matchType) {
    case "exact":
      return `Du besitzt dieses Album bereits (hinzugefügt am ${
        match.dateAdded ? new Date(match.dateAdded).toLocaleDateString("de-DE") : "unbekannt"
      })`;
    case "same-album-different-pressing":
      return `Du besitzt diese Album in einer anderen Pressung: ${match.label || "Unbekannt"} (${
        match.catalogNumber || "N/A"
      })`;
    case "potential":
      return `Ähnliches Album gefunden: ${match.artist} - ${match.album} (${match.year || "Jahr unbekannt"})`;
    default:
      return "Mögliches Duplikat gefunden";
  }
}
