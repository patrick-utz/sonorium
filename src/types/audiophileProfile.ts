export interface AudiophileProfile {
  equipment: {
    turntable: string;
    amplifier: string;
    speakers: string;
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
