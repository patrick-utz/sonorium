export type RecordFormat = "vinyl" | "cd";
export type RecordStatus = "owned" | "wishlist" | "checked-not-bought";
export type VinylRecommendation = "must-have" | "nice-to-have" | "stream-instead";

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
  
  // Status
  status: RecordStatus;
  dateAdded: string;
  purchasePrice?: number;
  purchaseLocation?: string;
  
  // Vinyl-spezifisch
  vinylRecommendation?: VinylRecommendation;
  recommendationReason?: string;
  
  // Notizen
  personalNotes?: string;
  
  // Empfehlungen
  recommendations?: RecordRecommendation[];
}

export interface CollectionStats {
  totalRecords: number;
  vinylCount: number;
  cdCount: number;
  genreDistribution: { genre: string; count: number }[];
  decadeDistribution: { decade: string; count: number }[];
  recentlyAdded: Record[];
}
