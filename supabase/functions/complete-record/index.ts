import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.88.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validate authentication
async function validateAuth(req: Request): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  // IMPORTANT: Pass JWT explicitly in edge runtimes.
  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getUser(token);
  
  if (error || !data?.user?.id) {
    console.error('Auth validation failed:', error?.message);
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return { userId: data.user.id };
}

// Safe Base64 conversion for large arrays (avoids stack overflow with spread operator)
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32KB chunks to avoid stack overflow
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

// MusicBrainz User-Agent (required by their API)
const MB_USER_AGENT = 'VinylCollector/1.0 (contact@vinylcollector.app)';

// Search MusicBrainz by catalog number (e.g., "LITA 197")
async function searchByCatalogNumber(
  catalogNumber: string,
  context?: { artist?: string; album?: string; label?: string }
): Promise<{ mbid: string; artist: string; album: string; year: number; label: string; catalogNumber: string } | null> {
  try {
    console.log('Searching MusicBrainz by catalog number:', catalogNumber);
    const query = encodeURIComponent(`catno:${catalogNumber}`);
    const url = `https://musicbrainz.org/ws/2/release/?query=${query}&fmt=json&limit=10`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': MB_USER_AGENT }
    });
    
    if (!response.ok) {
      console.log('MusicBrainz catalog number search failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    const releases: any[] = data.releases || [];

    if (releases.length === 0) return null;

    // If we have context (artist/album/label from user input), score candidates.
    if (context?.artist || context?.album || context?.label) {
      const scored = releases
        .map((release) => {
          const candidateArtist =
            release?.['artist-credit']
              ?.map((a: any) => a?.name)
              .filter(Boolean)
              .join(', ') ||
            release?.['artist-credit']?.[0]?.name ||
            '';
          const candidateAlbum = release?.title || '';
          const candidateLabel = release?.['label-info']?.[0]?.label?.name || '';
          const candidateCatno = release?.['label-info']?.[0]?.['catalog-number'] || '';

          const artistSim = context.artist ? stringSimilarity(candidateArtist, context.artist) : 0.5;
          const albumSim = context.album ? stringSimilarity(candidateAlbum, context.album) : 0.5;
          const labelSim = context.label ? stringSimilarity(candidateLabel, context.label) : 0.5;

          // Catalog number may contain spaces/dashes; consider a loose match.
          const catNoSim = candidateCatno
            ? stringSimilarity(candidateCatno, catalogNumber)
            : 0.5;

          // Album match is most important, then artist, then label, then catno.
          const score = albumSim * 0.55 + artistSim * 0.30 + labelSim * 0.10 + catNoSim * 0.05;
          return { release, score, artistSim, albumSim, labelSim, catNoSim, candidateArtist, candidateAlbum, candidateLabel, candidateCatno };
        })
        .sort((a, b) => b.score - a.score);

      const best = scored[0];
      console.log(
        'MusicBrainz catalog candidates (top 3):',
        scored.slice(0, 3).map((s) => ({
          score: Number(s.score.toFixed(3)),
          artistSim: Number(s.artistSim.toFixed(3)),
          albumSim: Number(s.albumSim.toFixed(3)),
          labelSim: Number(s.labelSim.toFixed(3)),
          catNoSim: Number(s.catNoSim.toFixed(3)),
          artist: s.candidateArtist,
          album: s.candidateAlbum,
          label: s.candidateLabel,
          catno: s.candidateCatno,
        }))
      );

      // If the best match is still very weak, treat as not found to avoid poisoning the AI prompt.
      // Threshold is intentionally permissive (multi-artist strings can reduce similarity).
      if ((context.album && best.albumSim < 0.45) || (context.artist && best.artistSim < 0.35)) {
        console.log('MusicBrainz catalog match too weak for provided context; ignoring result.');
        return null;
      }

      const release = best.release;
      console.log('Selected MusicBrainz release by catalog number:', release.title, 'by', release['artist-credit']?.[0]?.name);
      return {
        mbid: release.id,
        artist:
          release?.['artist-credit']
            ?.map((a: any) => a?.name)
            .filter(Boolean)
            .join(', ') ||
          release['artist-credit']?.[0]?.name ||
          '',
        album: release.title || '',
        year: release.date ? parseInt(release.date.substring(0, 4)) : 0,
        label: release['label-info']?.[0]?.label?.name || '',
        catalogNumber: release['label-info']?.[0]?.['catalog-number'] || catalogNumber,
      };
    }

    // No context: keep old behavior (first release)
    const release = releases[0];
    console.log('Found release by catalog number:', release.title, 'by', release['artist-credit']?.[0]?.name);
    return {
      mbid: release.id,
      artist:
        release?.['artist-credit']
          ?.map((a: any) => a?.name)
          .filter(Boolean)
          .join(', ') ||
        release['artist-credit']?.[0]?.name ||
        '',
      album: release.title || '',
      year: release.date ? parseInt(release.date.substring(0, 4)) : 0,
      label: release['label-info']?.[0]?.label?.name || '',
      catalogNumber: release['label-info']?.[0]?.['catalog-number'] || catalogNumber,
    };
    
    return null;
  } catch (error) {
    console.error('MusicBrainz catalog number search error:', error);
    return null;
  }
}

// Search MusicBrainz by barcode
async function searchByBarcode(barcode: string): Promise<{ mbid: string; artist: string; album: string; year: number; label: string } | null> {
  try {
    console.log('Searching MusicBrainz by barcode:', barcode);
    const url = `https://musicbrainz.org/ws/2/release/?query=barcode:${barcode}&fmt=json`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': MB_USER_AGENT }
    });
    
    if (!response.ok) {
      console.log('MusicBrainz barcode search failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    const release = data.releases?.[0];
    
    if (release) {
      console.log('Found release:', release.title, 'by', release['artist-credit']?.[0]?.name);
      return {
        mbid: release.id,
        artist: release['artist-credit']?.[0]?.name || '',
        album: release.title || '',
        year: release.date ? parseInt(release.date.substring(0, 4)) : 0,
        label: release['label-info']?.[0]?.label?.name || ''
      };
    }
    
    return null;
  } catch (error) {
    console.error('MusicBrainz barcode search error:', error);
    return null;
  }
}

// Search MusicBrainz by artist and album
async function searchByArtistAlbum(artist: string, album: string): Promise<string | null> {
  try {
    console.log('Searching MusicBrainz by artist/album:', artist, album);
    const query = encodeURIComponent(`release:"${album}" AND artist:"${artist}"`);
    const url = `https://musicbrainz.org/ws/2/release/?query=${query}&fmt=json&limit=1`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': MB_USER_AGENT }
    });
    
    if (!response.ok) {
      console.log('MusicBrainz artist/album search failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    const release = data.releases?.[0];
    
    if (release) {
      console.log('Found release MBID:', release.id);
      return release.id;
    }
    
    return null;
  } catch (error) {
    console.error('MusicBrainz artist/album search error:', error);
    return null;
  }
}

interface AlternativeRelease {
  mbid: string;
  title: string;
  artist: string;
  year?: number;
  label?: string;
  catalogNumber?: string;
  country?: string;
  format?: string;
  qualityType?: "original" | "remaster" | "reissue" | "audiophile" | "unknown";
  qualityRating?: number;
  qualityNotes?: string;
}

// Get release group ID from a release
async function getReleaseGroupId(mbid: string): Promise<string | null> {
  try {
    console.log('Getting release group for MBID:', mbid);
    const url = `https://musicbrainz.org/ws/2/release/${mbid}?inc=release-groups&fmt=json`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': MB_USER_AGENT }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data['release-group']?.id || null;
  } catch (error) {
    console.error('Error getting release group:', error);
    return null;
  }
}

// Determine quality type from release info
function determineQualityType(release: any): { type: "original" | "remaster" | "reissue" | "audiophile" | "unknown"; rating: number; notes: string } {
  const disambiguation = (release.disambiguation || '').toLowerCase();
  const labelName = (release['label-info']?.[0]?.label?.name || '').toLowerCase();
  const title = (release.title || '').toLowerCase();
  const format = release.media?.[0]?.format || '';
  
  // Check for audiophile labels
  const audiophileLabels = ['mobile fidelity', 'mofi', 'analogue productions', 'acoustic sounds', 'impex', 'music matters', 'blue note tone poet', 'speakers corner', 'original recordings group', 'dcc compact classics'];
  const isAudiophile = audiophileLabels.some(l => labelName.includes(l) || disambiguation.includes(l));
  
  if (isAudiophile) {
    return { 
      type: 'audiophile', 
      rating: 5, 
      notes: `Audiophile Pressung von ${release['label-info']?.[0]?.label?.name || 'Speziallabel'}. Höchste Klangqualität erwartet.`
    };
  }
  
  // Check for remaster
  if (disambiguation.includes('remaster') || title.includes('remaster')) {
    return { 
      type: 'remaster', 
      rating: 4, 
      notes: 'Remastered Version mit verbesserter Klangqualität.'
    };
  }
  
  // Check for original pressing
  const releaseYear = release.date ? parseInt(release.date.substring(0, 4)) : null;
  const releaseGroupYear = release['release-group']?.['first-release-date'] ? 
    parseInt(release['release-group']['first-release-date'].substring(0, 4)) : null;
  
  if (releaseYear && releaseGroupYear && Math.abs(releaseYear - releaseGroupYear) <= 1) {
    return { 
      type: 'original', 
      rating: 5, 
      notes: `Originalpressung von ${releaseYear}. Oft die beste Klangqualität (Masterbänder).`
    };
  }
  
  // Check for reissue
  if (disambiguation.includes('reissue') || disambiguation.includes('re-issue')) {
    return { 
      type: 'reissue', 
      rating: 3, 
      notes: 'Wiederveröffentlichung. Klangqualität variiert je nach Quelle.'
    };
  }
  
  // Default to unknown
  return { 
    type: 'unknown', 
    rating: 3, 
    notes: 'Keine spezifischen Qualitätsinformationen verfügbar.'
  };
}

// Fetch alternative releases for a release group
async function getAlternativeReleases(releaseGroupId: string, limit: number = 10): Promise<AlternativeRelease[]> {
  try {
    console.log('Fetching alternative releases for release group:', releaseGroupId);
    const url = `https://musicbrainz.org/ws/2/release?release-group=${releaseGroupId}&inc=labels+media&fmt=json&limit=${limit}`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': MB_USER_AGENT }
    });
    
    if (!response.ok) {
      console.log('Failed to fetch alternative releases:', response.status);
      return [];
    }
    
    const data = await response.json();
    const releases = data.releases || [];
    
    const alternatives: AlternativeRelease[] = releases.map((release: any) => {
      const quality = determineQualityType(release);
      const formats = release.media?.map((m: any) => m.format).filter(Boolean).join(', ') || '';
      
      return {
        mbid: release.id,
        title: release.title,
        artist: release['artist-credit']?.[0]?.name || '',
        year: release.date ? parseInt(release.date.substring(0, 4)) : undefined,
        label: release['label-info']?.[0]?.label?.name || undefined,
        catalogNumber: release['label-info']?.[0]?.['catalog-number'] || undefined,
        country: release.country || undefined,
        format: formats || undefined,
        qualityType: quality.type,
        qualityRating: quality.rating,
        qualityNotes: quality.notes
      };
    });
    
    // Sort by quality rating (highest first), then by year (oldest first for originals)
    alternatives.sort((a, b) => {
      if (b.qualityRating !== a.qualityRating) {
        return (b.qualityRating || 0) - (a.qualityRating || 0);
      }
      return (a.year || 9999) - (b.year || 9999);
    });
    
    console.log(`Found ${alternatives.length} alternative releases`);
    return alternatives;
  } catch (error) {
    console.error('Error fetching alternative releases:', error);
    return [];
  }
}

// Get cover art from Cover Art Archive
async function getCoverArt(mbid: string): Promise<string | null> {
  try {
    console.log('Fetching cover art for MBID:', mbid);
    
    // First, check if cover art exists
    const infoUrl = `https://coverartarchive.org/release/${mbid}`;
    const infoResponse = await fetch(infoUrl, {
      headers: { 'User-Agent': MB_USER_AGENT }
    });
    
    if (!infoResponse.ok) {
      console.log('No cover art found in Cover Art Archive');
      return null;
    }
    
    const info = await infoResponse.json();
    const frontImage = info.images?.find((img: any) => img.front) || info.images?.[0];
    
    if (!frontImage) {
      return null;
    }
    
    // Use the 500px thumbnail for reasonable file size
    const imageUrl = frontImage.thumbnails?.['500'] || frontImage.thumbnails?.large || frontImage.image;
    
    if (!imageUrl) {
      return null;
    }
    
    console.log('Downloading cover image from:', imageUrl);
    
    // Download and convert to base64
    const imageResponse = await fetch(imageUrl, {
      headers: { 'User-Agent': MB_USER_AGENT }
    });
    
    if (!imageResponse.ok) {
      console.log('Failed to download cover image:', imageResponse.status);
      return null;
    }
    
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);
    
    console.log('Cover art converted to base64 successfully');
    return `data:${contentType};base64,${base64}`;
    
  } catch (error) {
    console.error('Cover Art Archive error:', error);
    return null;
  }
}

// Normalize search string for better matching
function normalizeSearchString(str: string): string {
  return str
    .toLowerCase()
    .replace(/^the\s+/i, '') // Remove leading "The"
    .replace(/[''`´]/g, "'") // Normalize apostrophes
    .replace(/[^\w\s'-]/g, '') // Remove special chars except apostrophe and hyphen
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Calculate similarity between two strings (0-1)
function stringSimilarity(s1: string, s2: string): number {
  const n1 = normalizeSearchString(s1);
  const n2 = normalizeSearchString(s2);
  
  if (n1 === n2) return 1;
  if (n1.includes(n2) || n2.includes(n1)) return 0.9;
  
  // Simple word overlap scoring
  const words1 = new Set(n1.split(' '));
  const words2 = new Set(n2.split(' '));
  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;
  
  return union > 0 ? intersection / union : 0;
}

// Search iTunes for cover art with improved matching
async function searchITunesCover(artist: string, album: string): Promise<string | null> {
  const searchVariants = [
    `${artist} ${album}`,
    `${normalizeSearchString(artist)} ${normalizeSearchString(album)}`,
    album, // Sometimes just album name works better
  ];
  
  for (const searchTerm of searchVariants) {
    try {
      console.log('Searching iTunes for cover:', searchTerm);
      const query = encodeURIComponent(searchTerm);
      const url = `https://itunes.apple.com/search?term=${query}&media=music&entity=album&limit=10`;
      
      const response = await fetch(url);
      if (!response.ok) {
        console.log('iTunes search failed:', response.status);
        continue;
      }
      
      const data = await response.json();
      const results = data.results || [];
      
      if (results.length === 0) continue;
      
      // Score all results and find best match
      const artistNorm = normalizeSearchString(artist);
      const albumNorm = normalizeSearchString(album);
      
      let bestMatch: any = null;
      let bestScore = 0;
      
      for (const r of results) {
        const artistSim = stringSimilarity(r.artistName || '', artist);
        const albumSim = stringSimilarity(r.collectionName || '', album);
        const score = (artistSim * 0.4) + (albumSim * 0.6); // Album match is more important
        
        if (score > bestScore && score > 0.5) {
          bestScore = score;
          bestMatch = r;
        }
      }
      
      // If no good match, take first result if album name is somewhat similar
      if (!bestMatch && results.length > 0) {
        const firstAlbumSim = stringSimilarity(results[0].collectionName || '', album);
        if (firstAlbumSim > 0.4) {
          bestMatch = results[0];
        }
      }
      
      if (bestMatch?.artworkUrl100) {
        // Get higher resolution (600x600)
        const artworkUrl = bestMatch.artworkUrl100.replace('100x100', '600x600');
        console.log('Found iTunes artwork:', artworkUrl, 'score:', bestScore);
        
        const imageResponse = await fetch(artworkUrl);
        if (!imageResponse.ok) continue;
        
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
        const arrayBuffer = await imageResponse.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);
        
        console.log('iTunes cover converted to base64');
        return `data:${contentType};base64,${base64}`;
      }
    } catch (error) {
      console.error('iTunes search error:', error);
    }
  }
  
  return null;
}

// Search Deezer for cover art with improved matching
async function searchDeezerCover(artist: string, album: string): Promise<string | null> {
  const searchQueries = [
    `artist:"${artist}" album:"${album}"`,
    `${artist} ${album}`,
    `${normalizeSearchString(artist)} ${normalizeSearchString(album)}`,
    album, // Sometimes just album works
  ];
  
  for (const searchQuery of searchQueries) {
    try {
      console.log('Searching Deezer for cover:', searchQuery);
      const query = encodeURIComponent(searchQuery);
      const url = `https://api.deezer.com/search/album?q=${query}&limit=10`;
      
      const response = await fetch(url);
      if (!response.ok) {
        console.log('Deezer search failed:', response.status);
        continue;
      }
      
      const data = await response.json();
      const results = data.data || [];
      
      if (results.length === 0) continue;
      
      // Score results
      let bestMatch: any = null;
      let bestScore = 0;
      
      for (const r of results) {
        const artistSim = stringSimilarity(r.artist?.name || '', artist);
        const albumSim = stringSimilarity(r.title || '', album);
        const score = (artistSim * 0.4) + (albumSim * 0.6);
        
        if (score > bestScore && score > 0.5) {
          bestScore = score;
          bestMatch = r;
        }
      }
      
      // Fallback to first result if album similar
      if (!bestMatch && results.length > 0) {
        const firstAlbumSim = stringSimilarity(results[0].title || '', album);
        if (firstAlbumSim > 0.4) {
          bestMatch = results[0];
        }
      }
      
      if (bestMatch?.cover_xl) {
        const artworkUrl = bestMatch.cover_xl; // 1000x1000
        console.log('Found Deezer artwork:', artworkUrl, 'score:', bestScore);
        
        const imageResponse = await fetch(artworkUrl);
        if (!imageResponse.ok) continue;
        
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
        const arrayBuffer = await imageResponse.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);
        
        console.log('Deezer cover converted to base64');
        return `data:${contentType};base64,${base64}`;
      }
    } catch (error) {
      console.error('Deezer search error:', error);
    }
  }
  
  return null;
}

// Discogs API configuration
const DISCOGS_API_KEY = Deno.env.get('DISCOGS_API_KEY');
const DISCOGS_USER_AGENT = 'VinylCollector/1.0';

interface DiscogsRelease {
  id: number;
  title: string;
  year?: number;
  country?: string;
  format?: string[];
  label?: string[];
  catno?: string;
  cover_image?: string;
  thumb?: string;
  master_id?: number;
}

interface DiscogsSearchResult {
  results: DiscogsRelease[];
}

interface DiscogsReleaseDetail {
  id: number;
  title: string;
  artists?: { name: string }[];
  year?: number;
  country?: string;
  labels?: { name: string; catno: string }[];
  formats?: { name: string; descriptions?: string[]; qty?: string }[];
  images?: { type: string; uri: string; uri150: string }[];
  notes?: string;
  tracklist?: { position: string; title: string; duration: string }[];
  master_id?: number;
  released?: string;
  genres?: string[];
  styles?: string[];
}

// Search Discogs by barcode
async function searchDiscogsByBarcode(barcode: string): Promise<DiscogsRelease | null> {
  if (!DISCOGS_API_KEY) {
    console.log('Discogs API key not configured');
    return null;
  }
  
  try {
    console.log('Searching Discogs by barcode:', barcode);
    const url = `https://api.discogs.com/database/search?barcode=${barcode}&type=release`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': DISCOGS_USER_AGENT,
        'Authorization': `Discogs token=${DISCOGS_API_KEY}`
      }
    });
    
    if (!response.ok) {
      console.log('Discogs barcode search failed:', response.status);
      return null;
    }
    
    const data: DiscogsSearchResult = await response.json();
    
    if (data.results && data.results.length > 0) {
      console.log('Found Discogs release by barcode:', data.results[0].title);
      return data.results[0];
    }
    
    return null;
  } catch (error) {
    console.error('Discogs barcode search error:', error);
    return null;
  }
}

// Search Discogs by catalog number
async function searchDiscogsByCatalogNumber(catalogNumber: string): Promise<DiscogsRelease | null> {
  if (!DISCOGS_API_KEY) {
    console.log('Discogs API key not configured');
    return null;
  }
  
  try {
    console.log('Searching Discogs by catalog number:', catalogNumber);
    const url = `https://api.discogs.com/database/search?catno=${encodeURIComponent(catalogNumber)}&type=release`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': DISCOGS_USER_AGENT,
        'Authorization': `Discogs token=${DISCOGS_API_KEY}`
      }
    });
    
    if (!response.ok) {
      console.log('Discogs catalog number search failed:', response.status);
      return null;
    }
    
    const data: DiscogsSearchResult = await response.json();
    
    if (data.results && data.results.length > 0) {
      console.log('Found Discogs release by catalog number:', data.results[0].title);
      return data.results[0];
    }
    
    return null;
  } catch (error) {
    console.error('Discogs catalog number search error:', error);
    return null;
  }
}

// Search Discogs by label and catalog number combined
async function searchDiscogsByLabelAndCatalog(label: string, catalogNumber: string): Promise<DiscogsRelease | null> {
  if (!DISCOGS_API_KEY) {
    return null;
  }
  
  try {
    console.log('Searching Discogs by label + catalog:', label, catalogNumber);
    const url = `https://api.discogs.com/database/search?label=${encodeURIComponent(label)}&catno=${encodeURIComponent(catalogNumber)}&type=release`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': DISCOGS_USER_AGENT,
        'Authorization': `Discogs token=${DISCOGS_API_KEY}`
      }
    });
    
    if (!response.ok) {
      console.log('Discogs label+catalog search failed:', response.status);
      return null;
    }
    
    const data: DiscogsSearchResult = await response.json();
    
    if (data.results && data.results.length > 0) {
      console.log('Found Discogs release by label+catalog:', data.results[0].title);
      return data.results[0];
    }
    
    return null;
  } catch (error) {
    console.error('Discogs label+catalog search error:', error);
    return null;
  }
}

// Search Discogs by artist and album
async function searchDiscogsByArtistAlbum(artist: string, album: string): Promise<DiscogsRelease | null> {
  if (!DISCOGS_API_KEY) {
    console.log('Discogs API key not configured');
    return null;
  }
  
  try {
    console.log('Searching Discogs by artist/album:', artist, album);
    const url = `https://api.discogs.com/database/search?artist=${encodeURIComponent(artist)}&release_title=${encodeURIComponent(album)}&type=release&format=vinyl`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': DISCOGS_USER_AGENT,
        'Authorization': `Discogs token=${DISCOGS_API_KEY}`
      }
    });
    
    if (!response.ok) {
      console.log('Discogs artist/album search failed:', response.status);
      return null;
    }
    
    const data: DiscogsSearchResult = await response.json();
    
    if (data.results && data.results.length > 0) {
      console.log('Found Discogs release by artist/album:', data.results[0].title);
      return data.results[0];
    }
    
    // Try without vinyl format restriction
    const url2 = `https://api.discogs.com/database/search?artist=${encodeURIComponent(artist)}&release_title=${encodeURIComponent(album)}&type=release`;
    
    const response2 = await fetch(url2, {
      headers: {
        'User-Agent': DISCOGS_USER_AGENT,
        'Authorization': `Discogs token=${DISCOGS_API_KEY}`
      }
    });
    
    if (response2.ok) {
      const data2: DiscogsSearchResult = await response2.json();
      if (data2.results && data2.results.length > 0) {
        console.log('Found Discogs release (any format):', data2.results[0].title);
        return data2.results[0];
      }
    }
    
    return null;
  } catch (error) {
    console.error('Discogs artist/album search error:', error);
    return null;
  }
}

// Generic Discogs query search
async function searchDiscogsQuery(query: string): Promise<DiscogsRelease | null> {
  if (!DISCOGS_API_KEY) {
    return null;
  }
  
  try {
    console.log('Searching Discogs with query:', query);
    const url = `https://api.discogs.com/database/search?q=${encodeURIComponent(query)}&type=release`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': DISCOGS_USER_AGENT,
        'Authorization': `Discogs token=${DISCOGS_API_KEY}`
      }
    });
    
    if (!response.ok) {
      console.log('Discogs query search failed:', response.status);
      return null;
    }
    
    const data: DiscogsSearchResult = await response.json();
    
    if (data.results && data.results.length > 0) {
      console.log('Found Discogs release by query:', data.results[0].title);
      return data.results[0];
    }
    
    return null;
  } catch (error) {
    console.error('Discogs query search error:', error);
    return null;
  }
}

// Get detailed release info from Discogs
async function getDiscogsReleaseDetails(releaseId: number): Promise<DiscogsReleaseDetail | null> {
  if (!DISCOGS_API_KEY) {
    return null;
  }
  
  try {
    console.log('Fetching Discogs release details for ID:', releaseId);
    const url = `https://api.discogs.com/releases/${releaseId}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': DISCOGS_USER_AGENT,
        'Authorization': `Discogs token=${DISCOGS_API_KEY}`
      }
    });
    
    if (!response.ok) {
      console.log('Discogs release details failed:', response.status);
      return null;
    }
    
    const data: DiscogsReleaseDetail = await response.json();
    console.log('Got Discogs release details:', data.title);
    return data;
  } catch (error) {
    console.error('Discogs release details error:', error);
    return null;
  }
}

// Get cover art from Discogs with improved multi-strategy search
async function searchDiscogsCover(artist: string, album: string, barcode?: string, catalogNumber?: string, label?: string): Promise<string | null> {
  if (!DISCOGS_API_KEY) {
    console.log('Discogs API key not configured, skipping Discogs cover search');
    return null;
  }
  
  try {
    let release: DiscogsRelease | null = null;
    
    // Strategy 1: Try barcode first (most precise)
    if (barcode) {
      console.log('Strategy 1: Searching by barcode:', barcode);
      release = await searchDiscogsByBarcode(barcode);
      if (release) {
        console.log('Found release via barcode');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Strategy 2: Try label + catalog number combined (very precise for vinyl)
    if (!release && label && catalogNumber) {
      console.log('Strategy 2: Searching by label + catalog:', label, catalogNumber);
      await new Promise(resolve => setTimeout(resolve, 1000));
      release = await searchDiscogsByLabelAndCatalog(label, catalogNumber);
      if (release) {
        console.log('Found release via label+catalog');
      }
    }
    
    // Strategy 3: Try catalog number alone
    if (!release && catalogNumber) {
      console.log('Strategy 3: Searching by catalog number:', catalogNumber);
      await new Promise(resolve => setTimeout(resolve, 1000));
      release = await searchDiscogsByCatalogNumber(catalogNumber);
      if (release) {
        console.log('Found release via catalog number');
      }
    }
    
    // Strategy 4: Try artist + album
    if (!release && artist && album) {
      console.log('Strategy 4: Searching by artist/album:', artist, album);
      await new Promise(resolve => setTimeout(resolve, 1000));
      release = await searchDiscogsByArtistAlbum(artist, album);
      if (release) {
        console.log('Found release via artist/album');
      }
    }
    
    // Strategy 5: Try combined query search (album + label or catalog)
    if (!release && album && (label || catalogNumber)) {
      const queryTerms = [album, label, catalogNumber].filter(Boolean).join(' ');
      console.log('Strategy 5: Searching with combined query:', queryTerms);
      await new Promise(resolve => setTimeout(resolve, 1000));
      release = await searchDiscogsQuery(queryTerms);
      if (release) {
        console.log('Found release via combined query');
      }
    }
    
    // Strategy 6: Try just album name if still nothing
    if (!release && album) {
      console.log('Strategy 6: Searching with album name only:', album);
      await new Promise(resolve => setTimeout(resolve, 1000));
      release = await searchDiscogsQuery(album);
      if (release) {
        // Validate that artist matches (if we have one)
        if (artist) {
          const releaseArtist = release.title?.split(' - ')[0] || '';
          const similarity = stringSimilarity(releaseArtist, artist);
          if (similarity < 0.4) {
            console.log('Artist mismatch, skipping result. Expected:', artist, 'Got:', releaseArtist);
            release = null;
          }
        }
      }
    }
    
    if (!release) {
      console.log('No Discogs release found after all strategies');
      return null;
    }
    
    // Get detailed release info for high-res images
    await new Promise(resolve => setTimeout(resolve, 1000));
    const details = await getDiscogsReleaseDetails(release.id);
    
    let imageUrl: string | null = null;
    
    if (details?.images && details.images.length > 0) {
      // Find primary image (type: 'primary') or use first image
      const primaryImage = details.images.find(img => img.type === 'primary') || details.images[0];
      imageUrl = primaryImage.uri;
    } else if (release.cover_image) {
      imageUrl = release.cover_image;
    }
    
    if (!imageUrl) {
      console.log('No Discogs cover image found');
      return null;
    }
    
    console.log('Downloading Discogs cover from:', imageUrl);
    
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': DISCOGS_USER_AGENT,
        'Authorization': `Discogs token=${DISCOGS_API_KEY}`
      }
    });
    
    if (!imageResponse.ok) {
      console.log('Failed to download Discogs cover:', imageResponse.status);
      return null;
    }
    
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);
    
    console.log('Discogs cover converted to base64');
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Discogs cover search error:', error);
    return null;
  }
}

// Get pressing information from Discogs
async function getDiscogsPressInfo(artist: string, album: string, barcode?: string, catalogNumber?: string): Promise<{
  label?: string;
  catalogNumber?: string;
  country?: string;
  year?: number;
  format?: string;
  pressInfo?: string;
  notes?: string;
  genres?: string[];
  styles?: string[];
} | null> {
  if (!DISCOGS_API_KEY) {
    return null;
  }
  
  try {
    let release: DiscogsRelease | null = null;
    
    // Try barcode first
    if (barcode) {
      release = await searchDiscogsByBarcode(barcode);
      if (release) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Try catalog number
    if (!release && catalogNumber) {
      release = await searchDiscogsByCatalogNumber(catalogNumber);
      if (release) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Try artist/album
    if (!release && artist && album) {
      release = await searchDiscogsByArtistAlbum(artist, album);
    }
    
    if (!release) {
      return null;
    }
    
    // Get detailed info
    await new Promise(resolve => setTimeout(resolve, 1000));
    const details = await getDiscogsReleaseDetails(release.id);
    
    if (!details) {
      return {
        label: release.label?.[0],
        catalogNumber: release.catno,
        country: release.country,
        year: release.year,
        format: release.format?.join(', ')
      };
    }
    
    // Build format string
    const formatParts: string[] = [];
    if (details.formats) {
      for (const format of details.formats) {
        let formatStr = format.name;
        if (format.descriptions && format.descriptions.length > 0) {
          formatStr += ` (${format.descriptions.join(', ')})`;
        }
        if (format.qty && parseInt(format.qty) > 1) {
          formatStr = `${format.qty}x ${formatStr}`;
        }
        formatParts.push(formatStr);
      }
    }
    
    return {
      label: details.labels?.[0]?.name,
      catalogNumber: details.labels?.[0]?.catno,
      country: details.country,
      year: details.year,
      format: formatParts.join(' + '),
      pressInfo: formatParts.join(' + '),
      notes: details.notes,
      genres: details.genres,
      styles: details.styles
    };
  } catch (error) {
    console.error('Discogs press info error:', error);
    return null;
  }
}

// Multi-source cover art search (parallel with fallbacks)
async function searchCoverArtMultiSource(artist: string, album: string, mbid?: string, barcode?: string, catalogNumber?: string, label?: string): Promise<string | null> {
  console.log('Starting multi-source cover art search for:', artist, album, 'label:', label, 'catalog:', catalogNumber);
  
  // Strategy: Try Discogs first (most reliable for vinyl), then try others in parallel
  
  // Try Discogs first if we have specific identifiers (barcode, catalog, or label)
  if (DISCOGS_API_KEY && (barcode || catalogNumber || label)) {
    const discogsCover = await searchDiscogsCover(artist, album, barcode, catalogNumber, label);
    if (discogsCover) {
      console.log('Found cover via Discogs (with identifiers)');
      return discogsCover;
    }
  }
  
  // Try multiple sources in parallel for better success rate
  const searchPromises: Promise<{ source: string; cover: string | null }>[] = [];
  
  // Discogs by artist/album (if not tried above)
  if (DISCOGS_API_KEY && !barcode && !catalogNumber && !label) {
    searchPromises.push(
      searchDiscogsCover(artist, album).then(cover => ({ source: 'Discogs', cover }))
    );
  }
  
  // Cover Art Archive (if we have MBID)
  if (mbid) {
    searchPromises.push(
      getCoverArt(mbid).then(cover => ({ source: 'CoverArtArchive', cover }))
    );
  }
  
  // iTunes
  searchPromises.push(
    searchITunesCover(artist, album).then(cover => ({ source: 'iTunes', cover }))
  );
  
  // Deezer
  searchPromises.push(
    searchDeezerCover(artist, album).then(cover => ({ source: 'Deezer', cover }))
  );
  
  // Wait for all and take first successful result (prioritize by order)
  const results = await Promise.allSettled(searchPromises);
  
  // Priority order: Discogs > CoverArtArchive > iTunes > Deezer
  const priorityOrder = ['Discogs', 'CoverArtArchive', 'iTunes', 'Deezer'];
  
  for (const source of priorityOrder) {
    const result = results.find(r => 
      r.status === 'fulfilled' && r.value.source === source && r.value.cover
    );
    if (result && result.status === 'fulfilled' && result.value.cover) {
      console.log(`Found cover via ${result.value.source}`);
      return result.value.cover;
    }
  }
  
  // If still nothing, try with normalized/simplified search terms
  console.log('No cover found with exact match, trying simplified search...');
  
  const simplifiedAlbum = normalizeSearchString(album);
  const simplifiedArtist = normalizeSearchString(artist);
  
  // Try iTunes and Deezer with simplified terms
  const fallbackPromises = [
    searchITunesCover(simplifiedArtist, simplifiedAlbum).then(cover => ({ source: 'iTunes-fallback', cover })),
    searchDeezerCover(simplifiedArtist, simplifiedAlbum).then(cover => ({ source: 'Deezer-fallback', cover })),
  ];
  
  const fallbackResults = await Promise.allSettled(fallbackPromises);
  
  for (const result of fallbackResults) {
    if (result.status === 'fulfilled' && result.value.cover) {
      console.log(`Found cover via ${result.value.source} (simplified search)`);
      return result.value.cover;
    }
  }
  
  console.log('No cover found in any source');
  return null;
}

// Search for artist image on Wikipedia/Wikimedia
async function getArtistImage(artist: string): Promise<string | null> {
  try {
    console.log('Searching for artist image:', artist);
    
    // Search Wikipedia for artist
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(artist)}&prop=pageimages&format=json&pithumbsize=500&origin=*`;
    
    const response = await fetch(searchUrl, {
      headers: { 'User-Agent': MB_USER_AGENT }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    const pages = data.query?.pages;
    
    if (!pages) return null;
    
    const page = Object.values(pages)[0] as any;
    const thumbnailUrl = page?.thumbnail?.source;
    
    if (!thumbnailUrl) {
      console.log('No artist image found on Wikipedia');
      return null;
    }
    
    console.log('Found artist image:', thumbnailUrl);
    
    // Download and convert to base64
    const imageResponse = await fetch(thumbnailUrl, {
      headers: { 'User-Agent': MB_USER_AGENT }
    });
    
    if (!imageResponse.ok) {
      return null;
    }
    
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);
    
    console.log('Artist image converted to base64');
    return `data:${contentType};base64,${base64}`;
    
  } catch (error) {
    console.error('Artist image search error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authResult = await validateAuth(req);
    if (authResult instanceof Response) {
      return authResult;
    }

    const { artist: inputArtist, album: inputAlbum, year, genre, label, coverArt, barcode, catalogNumber, labelImage } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let artist = inputArtist;
    let album = inputAlbum;
    let extractedBarcode: string | undefined;
    let extractedCatalogNumber: string | undefined;

    // Step 0a: If labelImage is provided, use AI to extract album information
    if (labelImage) {
      console.log('Analyzing label image with AI...');
      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `Du bist ein Experte für Schallplatten und CDs. Analysiere das Bild eines Album-Labels oder Covers und extrahiere die folgenden Informationen. Antworte NUR mit einem JSON-Objekt, ohne zusätzlichen Text.

Das JSON muss diese Struktur haben:
{
  "artist": "Künstlername",
  "album": "Albumtitel",
  "label": "Plattenlabel (z.B. ECM, Blue Note, Deutsche Grammophon)",
  "catalogNumber": "Katalognummer (z.B. ECM 1234, BN-LA456-G)",
  "barcode": "EAN/Barcode falls sichtbar (nur Zahlen)",
  "year": Jahr als Zahl oder null,
  "confidence": "high" | "medium" | "low"
}

Wichtige Hinweise:
- Extrahiere alle sichtbaren Informationen
- Katalognummern haben oft ein Format wie "ECM 1234" oder "2LP-567"
- Wenn du dir nicht sicher bist, setze das Feld auf null
- Suche nach Hinweisen auf Label, Katalognummer, EAN-Code`
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Analysiere dieses Bild eines Album-Labels oder Covers und extrahiere die Informationen.'
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: labelImage
                    }
                  }
                ]
              }
            ],
            max_tokens: 500
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          console.log('AI response:', content);
          
          // Parse JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              artist = artist || parsed.artist || undefined;
              album = album || parsed.album || undefined;
              extractedBarcode = parsed.barcode || undefined;
              extractedCatalogNumber = parsed.catalogNumber || undefined;
              console.log('Extracted from image:', { artist, album, barcode: extractedBarcode, catalogNumber: extractedCatalogNumber });
            } catch (parseErr) {
              console.error('Failed to parse AI JSON response:', parseErr);
            }
          }
        } else {
          console.error('AI analysis failed:', aiResponse.status, await aiResponse.text());
        }
      } catch (aiErr) {
        console.error('AI image analysis error:', aiErr);
      }
    }

    let foundCoverArt: string | null = null;
    let mbData: { mbid: string; artist: string; album: string; year: number; label: string; catalogNumber?: string } | null = null;
    let alternativeReleases: AlternativeRelease[] = [];
    let discogsPressInfo: {
      label?: string;
      catalogNumber?: string;
      country?: string;
      year?: number;
      format?: string;
      pressInfo?: string;
      notes?: string;
      genres?: string[];
      styles?: string[];
    } | null = null;

    // Use extracted values if not provided directly
    const effectiveBarcode = barcode || extractedBarcode;
    const effectiveCatalogNumber = catalogNumber || extractedCatalogNumber;

    // Step 0: Get Discogs pressing information first (if API key is configured)
    if (DISCOGS_API_KEY) {
      console.log('Fetching Discogs pressing information...');
      discogsPressInfo = await getDiscogsPressInfo(artist || '', album || '', effectiveBarcode, effectiveCatalogNumber);
      if (discogsPressInfo) {
        console.log('Got Discogs press info:', discogsPressInfo);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Step 1: Try catalog number first (most reliable for vinyl)
    if (effectiveCatalogNumber || effectiveBarcode) {
      console.log('Searching by catalog/barcode:', effectiveCatalogNumber || effectiveBarcode);

      // IMPORTANT: Only query "catno" when we actually have a catalog number.
      if (effectiveCatalogNumber) {
        const effectiveLabel = label || discogsPressInfo?.label;
        mbData = await searchByCatalogNumber(effectiveCatalogNumber, {
          artist,
          album,
          label: effectiveLabel,
        });
      } else if (effectiveBarcode) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        mbData = await searchByBarcode(effectiveBarcode);
      }

      // If we have user-provided artist/album and the MB candidate clearly doesn't match,
      // ignore it so it can't poison downstream prompts.
      if (mbData && artist && album) {
        const artistSim = stringSimilarity(mbData.artist, artist);
        const albumSim = stringSimilarity(mbData.album, album);
        if (artistSim < 0.35 || albumSim < 0.45) {
          console.log('MusicBrainz result does not match provided artist/album; ignoring.', {
            artistSim,
            albumSim,
            providedArtist: artist,
            providedAlbum: album,
            mbArtist: mbData.artist,
            mbAlbum: mbData.album,
          });
          mbData = null;
        }
      }
      
      if (mbData?.mbid) {
        // Fetch alternative releases
        await new Promise(resolve => setTimeout(resolve, 1000));
        const releaseGroupId = await getReleaseGroupId(mbData.mbid);
        if (releaseGroupId) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          alternativeReleases = await getAlternativeReleases(releaseGroupId, 15);
        }
        
        // Multi-source cover art search (with Discogs priority, including label)
        await new Promise(resolve => setTimeout(resolve, 500));
        const effectiveLabel = label || discogsPressInfo?.label || mbData.label;
        foundCoverArt = await searchCoverArtMultiSource(mbData.artist, mbData.album, mbData.mbid, effectiveBarcode, effectiveCatalogNumber, effectiveLabel);
      }
    }
    
    // Step 2: If no MusicBrainz match by catalog/barcode, try artist + album search
    if (!mbData && artist && album) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mbid = await searchByArtistAlbum(artist, album);
      
      if (mbid) {
        // Fetch alternative releases if we haven't already
        if (alternativeReleases.length === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const releaseGroupId = await getReleaseGroupId(mbid);
          if (releaseGroupId) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            alternativeReleases = await getAlternativeReleases(releaseGroupId, 15);
          }
        }
        
        // Multi-source cover art search (with Discogs priority, including label)
        await new Promise(resolve => setTimeout(resolve, 500));
        const effectiveLabel = label || discogsPressInfo?.label;
        foundCoverArt = await searchCoverArtMultiSource(artist, album, mbid, effectiveBarcode, effectiveCatalogNumber, effectiveLabel);
      } else {
        // No MusicBrainz match, still try cover art sources
        const effectiveLabel = label || discogsPressInfo?.label;
        foundCoverArt = await searchCoverArtMultiSource(artist, album, undefined, effectiveBarcode, effectiveCatalogNumber, effectiveLabel);
      }
    }
    
    // Step 3: If still no cover but we have artist/album info, try multi-source without MBID
    if (!foundCoverArt && (artist || mbData?.artist) && (album || mbData?.album)) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const effectiveLabel = label || discogsPressInfo?.label || mbData?.label;
      foundCoverArt = await searchCoverArtMultiSource(
        artist || mbData?.artist || '', 
        album || mbData?.album || '',
        undefined,
        effectiveBarcode,
        effectiveCatalogNumber,
        effectiveLabel
      );
    }
    
    // Step 4: Fallback to artist image if no cover found
    if (!foundCoverArt && (artist || mbData?.artist)) {
      await new Promise(resolve => setTimeout(resolve, 500));
      foundCoverArt = await getArtistImage(artist || mbData?.artist || '');
    }

    // Build context from provided fields (use MusicBrainz and Discogs data if found)
    const knownInfo: string[] = [];
    if (catalogNumber) knownInfo.push(`Katalognummer: ${catalogNumber}`);
    if (barcode) knownInfo.push(`EAN/Barcode: ${barcode}`);
    if (mbData) {
      knownInfo.push(`Artist (from MusicBrainz): ${mbData.artist}`);
      knownInfo.push(`Album (from MusicBrainz): ${mbData.album}`);
      if (mbData.year) knownInfo.push(`Year (from MusicBrainz): ${mbData.year}`);
      if (mbData.label) knownInfo.push(`Label (from MusicBrainz): ${mbData.label}`);
      if (mbData.catalogNumber) knownInfo.push(`Catalog# (from MusicBrainz): ${mbData.catalogNumber}`);
    } else {
      if (artist) knownInfo.push(`Artist: ${artist}`);
      if (album) knownInfo.push(`Album: ${album}`);
      if (year) knownInfo.push(`Year: ${year}`);
      if (label) knownInfo.push(`Label: ${label}`);
    }
    if (genre && genre.length > 0) knownInfo.push(`Genres: ${genre.join(', ')}`);
    
    // Add Discogs pressing information to context
    if (discogsPressInfo) {
      knownInfo.push(`\n--- Discogs Pressing Info ---`);
      if (discogsPressInfo.label) knownInfo.push(`Label (from Discogs): ${discogsPressInfo.label}`);
      if (discogsPressInfo.catalogNumber) knownInfo.push(`Catalog# (from Discogs): ${discogsPressInfo.catalogNumber}`);
      if (discogsPressInfo.country) knownInfo.push(`Pressland (from Discogs): ${discogsPressInfo.country}`);
      if (discogsPressInfo.year) knownInfo.push(`Jahr (from Discogs): ${discogsPressInfo.year}`);
      if (discogsPressInfo.format) knownInfo.push(`Format (from Discogs): ${discogsPressInfo.format}`);
      if (discogsPressInfo.genres) knownInfo.push(`Genres (from Discogs): ${discogsPressInfo.genres.join(', ')}`);
      if (discogsPressInfo.styles) knownInfo.push(`Styles (from Discogs): ${discogsPressInfo.styles.join(', ')}`);
      if (discogsPressInfo.notes) knownInfo.push(`Notes (from Discogs): ${discogsPressInfo.notes.substring(0, 500)}...`);
    }

    const contextInfo = knownInfo.length > 0 
      ? `Known information:\n${knownInfo.join('\n')}`
      : 'No information provided yet.';

    // Different prompt for catalog number/barcode lookup
    const searchIdentifier = catalogNumber || barcode;
    const hasExplicitArtistAlbum = Boolean(artist && album);
    const searchInstruction = searchIdentifier
      ? hasExplicitArtistAlbum
        ? `\n\nWICHTIG: Der Nutzer hat "${searchIdentifier}" eingegeben (${catalogNumber ? 'Katalognummer' : 'Barcode'}) **für das Album** "${album}" von "${artist}". Nutze die Nummer nur zur Pressungs-/Label-Validierung und für Details (Land, Jahr, Format, Varianten) – **ändere Artist/Album niemals** und bewerte nur dieses Album.`
        : `\n\nWICHTIG: Der Nutzer hat "${searchIdentifier}" eingegeben (${catalogNumber ? 'Katalognummer' : 'Barcode'}). ${mbData ? `MusicBrainz hat identifiziert: "${mbData.album}" von "${mbData.artist}" (${mbData.year}, Label: ${mbData.label}).` : 'MusicBrainz konnte keine Übereinstimmung finden. Versuche das Album anhand dieser Nummer zu identifizieren.'}`
      : '';

    const systemPrompt = `Du bist ein Musik-Experte, Audiophiler und Historiker mit tiefem Wissen über Jazz, Klassik, Rock und alle Genres. 
Du kennst die Geschichte von Aufnahmetechnik, Pressungen, Labels und Mastering-Ingenieuren.
Du kennst auch Katalognummern von Plattenlabels (z.B. "LITA 197" für Light in the Attic Records).

Deine Aufgabe ist es, Album-Informationen zu vervollständigen und AUSFÜHRLICHE Bewertungen zu liefern.

    WICHTIG: Schreibe ALLES auf Deutsch. Sei ausführlich und detailliert wie ein Musik-Magazin.${searchInstruction}

    KRITISCH:
    - Wenn im Kontext bereits "Artist:" und/oder "Album:" genannt werden, dann übernimm diese Werte EXAKT in den Feldern "artist" und "album".
    - Erfinde niemals einen anderen Künstler/Albumnamen und bewerte nur das im Kontext genannte Album.
    - Wenn du dir nicht sicher bist (z.B. widersprüchliche Quellen), setze "confidence" auf "low" statt etwas zu halluzinieren.

Liefere ein JSON-Objekt mit folgender Struktur:

{
      "artist": "string - wenn Artist bekannt ist, MUSS er exakt übernommen werden (nicht überschreiben)",
      "album": "string - wenn Album bekannt ist, MUSS es exakt übernommen werden (nicht überschreiben)", 
  "year": number - Erscheinungsjahr,
  "genre": ["array", "der", "genres"],
  "label": "string - Plattenlabel",
  "catalogNumber": "string - falls bekannt",
  "formatDetails": "string - Vinyl-Details wie Gewicht, Pressung",
  "pressing": "string - Pressland/Jahr",
  "tags": ["string", "array"] - Technische Stichworte wie Instrumente (Klavier, Gitarre), Stile (Live, Studio), Anlässe (Party, Arbeit). 3-6 Stichworte.,
  "moods": ["string", "array"] - PFLICHTFELD! Emotionale Stimmungen des Albums. Wähle 2-5 aus: entspannend, energiegeladen, melancholisch, fröhlich, euphorisch, nachdenklich, romantisch, düster, verträumt, aufwühlend, beruhigend, nostalgisch, ekstatisch, sehnsüchtig, tröstend, atmosphärisch, intim, episch, minimalistisch, hypnotisch, groovend, tanzbar, meditativ, kraftvoll, sanft. IMMER als Array zurückgeben!,
  "personalNotes": "string - interessante Fakten über dieses Album",
  
  "audiophileAssessment": "AUSFÜHRLICHE audiophile Beurteilung (mindestens 150 Wörter): Beschreibe die Aufnahmequalität, Räumlichkeit, Transparenz, Dynamik, Basswiedergabe, Höhenauflösung. Erwähne spezifische Toningenieure, Studios, Aufnahmetechnik. Nenne die besten Pressungen (Original, Reissues wie MoFi, Acoustic Sounds, Analogue Productions). Beschreibe die Klangbühne und Instrumententrennung. Nutze audiophile Fachbegriffe.",
  
  "artisticAssessment": "AUSFÜHRLICHE künstlerische Beurteilung (mindestens 150 Wörter): Beschreibe die historische Bedeutung, musikalische Innovation, Kompositionsqualität, Arrangements, Musiker-Besetzung, Einfluss auf das Genre. Setze es in den Kontext der Karriere des Künstlers. Erwähne besondere Tracks und ihre Bedeutung. Beschreibe die emotionale Wirkung und das künstlerische Statement.",
  
  "recordingQuality": number 1-5,
  "masteringQuality": number 1-5,
  "artisticRating": number 1-5,
  "criticScore": number 0-100 - Kritiker-Score basierend auf Rezensionen und historischer Bedeutung (z.B. 95 für ein Meisterwerk, 70-80 für ein gutes Album),
  
  "criticReviews": [
    {
      "source": "string - Name des Magazins/Portals (z.B. Rolling Stone, Pitchfork, AllMusic, NME, Mojo, Q Magazine, Musikexpress, Laut.de)",
      "score": number - Bewertung in der Skala des Magazins (z.B. 9.2 für Pitchfork, 4.5 für AllMusic, 4 für Rolling Stone),
      "maxScore": number - Maximale Punktzahl des Magazins (z.B. 10 für Pitchfork, 5 für AllMusic, 5 für Rolling Stone),
      "quote": "string - Kurzes, prägnantes Zitat aus der Kritik (1-2 Sätze, auf Deutsch übersetzen falls nötig)",
      "year": number - Jahr der Kritik (falls bekannt)
    }
  ] - Array mit 2-5 echten oder plausiblen Kritiken von renommierten Musik-Magazinen. Priorisiere bekannte Quellen wie Rolling Stone, Pitchfork, AllMusic, NME, Mojo. Bei deutschsprachigen Alben auch Musikexpress, Laut.de, Spex erwähnen.,
  
  "vinylRecommendation": "must-have" | "nice-to-have" | "stream-instead" - Empfehlung ob sich die Vinyl-Anschaffung lohnt,
  "recommendationReason": "Begründung für die Vinyl-Empfehlung (2-3 Sätze): Erkläre warum sich Vinyl lohnt oder nicht, basierend auf Aufnahmequalität, verfügbaren Pressungen und klanglichem Mehrwert gegenüber Digital",
  
  "recommendations": [
    {
      "artist": "string",
      "album": "string", 
      "year": number,
      "reason": "Warum dieses Album ähnlich klingt oder künstlerisch verwandt ist (2-3 Sätze)",
      "qualityScore": number 1-5
    }
  ],
  
  "confidence": "high|medium|low"
}

Sei ein echter Experte. Liefere fundierte, detaillierte Analysen wie ein professionelles Musik-Magazin.`;

    const userPrompt = coverArt && coverArt.startsWith('data:')
      ? `Please analyze this album cover image and complete the record information.\n\n${contextInfo}`
      : `Please complete the following record information:\n\n${contextInfo}\n\nFill in any missing fields based on your knowledge.`;

    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    // If we have a cover image, include it in the message
    if (coverArt && coverArt.startsWith('data:')) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          { type: "image_url", image_url: { url: coverArt } }
        ]
      });
    } else {
      messages.push({ role: "user", content: userPrompt });
    }

    console.log('Calling Lovable AI for record completion...');

    // Retry logic for transient errors (503, 502, etc.)
    const maxRetries = 3;
    let response: Response | null = null;
    let lastError: string = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`AI request attempt ${attempt}/${maxRetries}`);
        
        response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages,
            response_format: { type: "json_object" }
          }),
        });

        if (response.ok) {
          break; // Success, exit retry loop
        }

        // Handle specific error codes
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted. Please add more credits." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Retry on 502, 503, 504 (gateway errors)
        if ([502, 503, 504].includes(response.status) && attempt < maxRetries) {
          lastError = `Gateway error: ${response.status}`;
          console.log(`Retrying due to ${response.status}... waiting ${attempt * 2}s`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
          continue;
        }

        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error(`AI gateway error: ${response.status}`);

      } catch (fetchError) {
        lastError = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error';
        console.error(`Attempt ${attempt} failed:`, lastError);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        } else {
          throw new Error(`AI gateway failed after ${maxRetries} attempts: ${lastError}`);
        }
      }
    }

    if (!response || !response.ok) {
      throw new Error(`AI gateway failed: ${lastError}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No response from AI");
    }

    console.log('AI response received:', content);

    // Parse the JSON response
    const parseJsonStrict = (raw: string) => {
      const cleaned = raw
        .replace(/```json\s*/gi, "")
        .replace(/```/g, "")
        .trim();

      try {
        return JSON.parse(cleaned);
      } catch {
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new Error("Could not parse AI response as JSON");
      }
    };

    let completedData;
    try {
      completedData = parseJsonStrict(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);

      // Last resort: ask AI to repair its own JSON (prevents 500 loops on rare formatting glitches)
      const repairSystem =
        "You are a strict JSON repair tool. You receive invalid JSON and must output ONLY valid JSON (no markdown, no explanations). Preserve the original structure and values as much as possible. Ensure all strings are properly escaped.";
      const repairUser =
        `Fix this JSON so it is valid. Return only JSON.\n\nInvalid JSON:\n${content}`;

      const repairResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: repairSystem },
            { role: "user", content: repairUser },
          ],
          response_format: { type: "json_object" },
          temperature: 0,
          max_tokens: 8000,
        }),
      });

      if (!repairResponse.ok) {
        const t = await repairResponse.text();
        console.error("JSON repair failed:", repairResponse.status, t);
        throw new Error("AI response was invalid JSON and could not be repaired");
      }

      const repairData = await repairResponse.json();
      const repairedContent = repairData.choices?.[0]?.message?.content;
      if (!repairedContent) {
        throw new Error("AI response was invalid JSON and repair returned no content");
      }

      // Re-parse repaired JSON
      completedData = parseJsonStrict(repairedContent);
    }

    // Enforce user-provided fields (prevents drift/hallucinated mismatches)
    if (artist) completedData.artist = artist;
    if (album) completedData.album = album;
    if (label) completedData.label = label;
    if (catalogNumber) completedData.catalogNumber = catalogNumber;

    // Use MusicBrainz data if available (only to fill missing secondary fields)
    if (mbData) {
      if (!completedData.year && mbData.year) completedData.year = mbData.year;
      if (!completedData.label && mbData.label) completedData.label = mbData.label;
      if (!completedData.catalogNumber && mbData.catalogNumber) completedData.catalogNumber = mbData.catalogNumber;
    }

    // Use Discogs data if available (as enhancement/fallback)
    if (discogsPressInfo) {
      if (!completedData.label && discogsPressInfo.label) completedData.label = discogsPressInfo.label;
      if (!completedData.year && discogsPressInfo.year) completedData.year = discogsPressInfo.year;
      if (!completedData.catalogNumber && discogsPressInfo.catalogNumber) completedData.catalogNumber = discogsPressInfo.catalogNumber;
      if (discogsPressInfo.format) completedData.formatDetails = discogsPressInfo.format;
      if (discogsPressInfo.country) completedData.pressing = `${discogsPressInfo.country}${discogsPressInfo.year ? ` (${discogsPressInfo.year})` : ''}`;
      if (discogsPressInfo.genres && discogsPressInfo.genres.length > 0 && (!completedData.genre || completedData.genre.length === 0)) {
        completedData.genre = discogsPressInfo.genres;
      }
      // Add Discogs styles as additional tags
      if (discogsPressInfo.styles && discogsPressInfo.styles.length > 0) {
        const existingTags = completedData.tags || [];
        completedData.tags = [...new Set([...existingTags, ...discogsPressInfo.styles])];
      }
      // Add Discogs notes to personal notes
      if (discogsPressInfo.notes && !completedData.personalNotes) {
        completedData.personalNotes = discogsPressInfo.notes.substring(0, 500);
      }
    }

    // Add the cover art we found
    if (foundCoverArt) {
      completedData.coverArtBase64 = foundCoverArt;
      console.log('Added cover art from search sources');
    }

    // Add alternative releases
    completedData.alternativeReleases = alternativeReleases;
    console.log(`Returning ${alternativeReleases.length} alternative releases`);

    return new Response(
      JSON.stringify({ success: true, data: completedData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Error in complete-record function:', error);
    const errorMessage = error instanceof Error ? error.message : "Failed to complete record";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
