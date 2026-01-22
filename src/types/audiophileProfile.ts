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

export interface MoodCategory {
  id: string;
  name: string;
  icon: string; // emoji
  color?: string; // subtle accent color (HSL values only, e.g., "200 80% 60%")
  enabled: boolean;
  priority: number;
  isCustom?: boolean;
}

// Subtle color palette for moods (HSL format for Tailwind compatibility)
export const MOOD_COLORS = [
  { id: "slate", name: "Neutral", hsl: "215 16% 47%" },
  { id: "blue", name: "Blau", hsl: "217 91% 60%" },
  { id: "cyan", name: "Cyan", hsl: "189 94% 43%" },
  { id: "teal", name: "Petrol", hsl: "168 76% 36%" },
  { id: "emerald", name: "Smaragd", hsl: "160 84% 39%" },
  { id: "amber", name: "Bernstein", hsl: "38 92% 50%" },
  { id: "orange", name: "Orange", hsl: "25 95% 53%" },
  { id: "rose", name: "Rose", hsl: "350 89% 60%" },
  { id: "purple", name: "Violett", hsl: "271 81% 56%" },
  { id: "indigo", name: "Indigo", hsl: "239 84% 67%" },
];

export const DEFAULT_SHOPS: ShopPreference[] = [
  { id: "discogs", name: "Discogs", url: "https://www.discogs.com", country: "INT", enabled: true, priority: 1, searchUrlTemplate: "https://www.discogs.com/search/?q={query}&type=release" },
  { id: "recordsale", name: "recordsale.ch", url: "https://www.recordsale.ch", country: "CH", enabled: true, priority: 2, searchUrlTemplate: "https://www.recordsale.ch/search?q={query}" },
  { id: "cede", name: "cede.ch", url: "https://www.cede.ch", country: "CH", enabled: true, priority: 3, searchUrlTemplate: "https://www.cede.ch/de/?branch=ALL&q={query}" },
  { id: "jpc", name: "jpc.de", url: "https://www.jpc.de", country: "DE", enabled: true, priority: 4, searchUrlTemplate: "https://www.jpc.de/s/{query}" },
  { id: "imusic", name: "imusic.ch", url: "https://www.imusic.ch", country: "CH", enabled: false, priority: 5, searchUrlTemplate: "https://www.imusic.ch/search/?query={query}" },
  { id: "musikhug", name: "Musik Hug", url: "https://www.musikhug.ch", country: "CH", enabled: false, priority: 6, searchUrlTemplate: "https://www.musikhug.ch/suche?q={query}" },
];

export const DEFAULT_MOODS: MoodCategory[] = [
  { id: "entspannend", name: "Entspannend", icon: "🌙", color: "217 91% 60%", enabled: true, priority: 1 },
  { id: "energetisch", name: "Energetisch", icon: "⚡", color: "38 92% 50%", enabled: true, priority: 2 },
  { id: "melancholisch", name: "Melancholisch", icon: "💭", color: "271 81% 56%", enabled: true, priority: 3 },
  { id: "romantisch", name: "Romantisch", icon: "💫", color: "350 89% 60%", enabled: true, priority: 4 },
  { id: "party", name: "Party", icon: "🎉", color: "25 95% 53%", enabled: true, priority: 5 },
  { id: "fokus", name: "Fokus", icon: "🎯", color: "168 76% 36%", enabled: true, priority: 6 },
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
  moods?: MoodCategory[];
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
