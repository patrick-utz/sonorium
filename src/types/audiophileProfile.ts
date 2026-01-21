export interface ShopPreference {
  id: string;
  name: string;
  url: string;
  country: string;
  enabled: boolean;
  priority: number;
  isCustom?: boolean;
  searchUrlTemplate?: string; // e.g., "https://shop.com/search?q={query}"
}

export const DEFAULT_SHOPS: ShopPreference[] = [
  { id: "discogs", name: "Discogs", url: "https://www.discogs.com", country: "INT", enabled: true, priority: 1, searchUrlTemplate: "https://www.discogs.com/search/?q={query}&type=release" },
  { id: "recordsale", name: "recordsale.ch", url: "https://www.recordsale.ch", country: "CH", enabled: true, priority: 2, searchUrlTemplate: "https://www.recordsale.ch/search?q={query}" },
  { id: "cede", name: "cede.ch", url: "https://www.cede.ch", country: "CH", enabled: true, priority: 3, searchUrlTemplate: "https://www.cede.ch/de/?branch=ALL&q={query}" },
  { id: "jpc", name: "jpc.de", url: "https://www.jpc.de", country: "DE", enabled: true, priority: 4, searchUrlTemplate: "https://www.jpc.de/s/{query}" },
  { id: "imusic", name: "imusic.ch", url: "https://www.imusic.ch", country: "CH", enabled: false, priority: 5, searchUrlTemplate: "https://www.imusic.ch/search/?query={query}" },
  { id: "musikhug", name: "Musik Hug", url: "https://www.musikhug.ch", country: "CH", enabled: false, priority: 6, searchUrlTemplate: "https://www.musikhug.ch/suche?q={query}" },
];

export interface AudiophileProfile {
  equipment: {
    turntable: string;
    amplifier: string;
    speakers: string;
    cdPlayer?: string;
    dac?: string;
    other?: string;
  };
  preferences: {
    genres: string[];
    favoriteLabels: string[];
    avoidLabels: string[];
    soundPreference: 'warm' | 'neutral' | 'analytical' | 'dynamic';
    listeningStyle: 'critical' | 'relaxed' | 'background' | 'mixed';
  };
  mediaFormat: 'vinyl' | 'cd' | 'both';
  shops?: ShopPreference[];
}

export interface AlbumRecommendation {
  rank: number;
  album: string;
  artist: string;
  year: string;
  label: string;
  musicalRating: number;
  soundRating: number;
  description: string;
  bestPressings: PressingRecommendation[];
  phase?: string;
  notes?: string;
}

export interface PressingRecommendation {
  label: string;
  catalogNumber?: string;
  year?: string;
  country?: string;
  quality: 'reference' | 'excellent' | 'good' | 'acceptable';
  notes: string;
  matrixInfo?: string;
  avoid?: boolean;
}

export interface ArtistResearchResult {
  artist: string;
  overview: string;
  phases?: {
    name: string;
    period: string;
    description: string;
    audioQuality: string;
  }[];
  topRecommendations: AlbumRecommendation[];
  buyingTips: string[];
  avoidLabels: string[];
}

export interface MarketplacePrice {
  shopId: string;
  shopName: string;
  shopUrl: string;
  country: string;
  price?: number;
  currency: string;
  shippingEstimate?: number;
  totalEstimate?: number;
  numForSale?: number;
  condition?: string;
  productUrl?: string;
  inStock?: boolean;
  loading: boolean;
  error?: string;
}
