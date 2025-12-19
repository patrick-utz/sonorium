export type RecordFormat = "vinyl" | "cd";
export type RecordStatus = "owned" | "wishlist" | "checked-not-bought";
export type VinylRecommendation = "must-have" | "nice-to-have" | "stream-instead";

export interface AlternativeRelease {
  mbid: string;
  title: string;
  artist: string;
  year?: number;
  label?: string;
  catalogNumber?: string;
  country?: string;
  format?: string;
  qualityType?: "original" | "remaster" | "reissue" | "audiophile" | "unknown";
  qualityRating?: number; // 1-5
  qualityNotes?: string;
}

export interface RecordRecommendation {
  artist: string;
  album: string;
  year: number;
  coverArt?: string;
  reason: string;
  qualityScore?: number;
  discogsId?: string;
}

export interface Record {
  id: string;
  
  // Basis-Infos
  artist: string;
  album: string;
  year: number;
  genre: string[];
  label: string;
  catalogNumber?: string;
  barcode?: string;
  
  // Format
  format: RecordFormat;
  formatDetails?: string;
  pressing?: string;
  
  // Medien
  coverArt?: string;
  labelPhoto?: string;
  
  // Bewertungen
  myRating: number; // 1-5
  recordingQuality?: number; // 1-5
  masteringQuality?: number; // 1-5
  artisticRating?: number; // 1-5
  criticScore?: number; // 0-100
  
  // KI-Bewertungen
  audiophileAssessment?: string; // Audiophile Beurteilung
  artisticAssessment?: string; // Künstlerische Beurteilung
  
  // Status
  status: RecordStatus;
  dateAdded: string;
  purchaseDate?: string;
  purchasePrice?: number;
  purchaseLocation?: string;
  
  // Vinyl-spezifisch
  vinylRecommendation?: VinylRecommendation;
  recommendationReason?: string;
  
  // Notizen & Tags
  personalNotes?: string;
  tags?: string[]; // Stichworte für Stimmung, Instrumente, etc.
  moods?: string[]; // Stimmungen wie "entspannend", "energiegeladen", etc.
  
  // Favorit
  isFavorite?: boolean;
  
  // Empfehlungen
  recommendations?: RecordRecommendation[];
  
  // Discogs-Verknüpfung
  discogsReleaseId?: number;
}

export interface CollectionStats {
  totalRecords: number;
  vinylCount: number;
  cdCount: number;
  genreDistribution: { genre: string; count: number }[];
  decadeDistribution: { decade: string; count: number }[];
  recentlyAdded: Record[];
}
