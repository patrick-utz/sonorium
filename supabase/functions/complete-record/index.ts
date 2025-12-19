import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// MusicBrainz User-Agent (required by their API)
const MB_USER_AGENT = 'VinylCollector/1.0 (contact@vinylcollector.app)';

// Search MusicBrainz by catalog number (e.g., "LITA 197")
async function searchByCatalogNumber(catalogNumber: string): Promise<{ mbid: string; artist: string; album: string; year: number; label: string; catalogNumber: string } | null> {
  try {
    console.log('Searching MusicBrainz by catalog number:', catalogNumber);
    const query = encodeURIComponent(`catno:${catalogNumber}`);
    const url = `https://musicbrainz.org/ws/2/release/?query=${query}&fmt=json&limit=5`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': MB_USER_AGENT }
    });
    
    if (!response.ok) {
      console.log('MusicBrainz catalog number search failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    const release = data.releases?.[0];
    
    if (release) {
      console.log('Found release by catalog number:', release.title, 'by', release['artist-credit']?.[0]?.name);
      return {
        mbid: release.id,
        artist: release['artist-credit']?.[0]?.name || '',
        album: release.title || '',
        year: release.date ? parseInt(release.date.substring(0, 4)) : 0,
        label: release['label-info']?.[0]?.label?.name || '',
        catalogNumber: release['label-info']?.[0]?.['catalog-number'] || catalogNumber
      };
    }
    
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
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    console.log('Cover art converted to base64 successfully');
    return `data:${contentType};base64,${base64}`;
    
  } catch (error) {
    console.error('Cover Art Archive error:', error);
    return null;
  }
}

// Search iTunes for cover art
async function searchITunesCover(artist: string, album: string): Promise<string | null> {
  try {
    console.log('Searching iTunes for cover:', artist, album);
    const query = encodeURIComponent(`${artist} ${album}`);
    const url = `https://itunes.apple.com/search?term=${query}&media=music&entity=album&limit=5`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.log('iTunes search failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    const results = data.results || [];
    
    // Find best match
    const artistLower = artist.toLowerCase();
    const albumLower = album.toLowerCase();
    
    let bestMatch = results.find((r: any) => 
      r.artistName?.toLowerCase().includes(artistLower) && 
      r.collectionName?.toLowerCase().includes(albumLower)
    );
    
    if (!bestMatch && results.length > 0) {
      bestMatch = results[0];
    }
    
    if (bestMatch?.artworkUrl100) {
      // Get higher resolution (600x600)
      const artworkUrl = bestMatch.artworkUrl100.replace('100x100', '600x600');
      console.log('Found iTunes artwork:', artworkUrl);
      
      const imageResponse = await fetch(artworkUrl);
      if (!imageResponse.ok) return null;
      
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await imageResponse.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      console.log('iTunes cover converted to base64');
      return `data:${contentType};base64,${base64}`;
    }
    
    return null;
  } catch (error) {
    console.error('iTunes search error:', error);
    return null;
  }
}

// Search Deezer for cover art
async function searchDeezerCover(artist: string, album: string): Promise<string | null> {
  try {
    console.log('Searching Deezer for cover:', artist, album);
    const query = encodeURIComponent(`artist:"${artist}" album:"${album}"`);
    const url = `https://api.deezer.com/search/album?q=${query}&limit=5`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.log('Deezer search failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    const results = data.data || [];
    
    if (results.length > 0 && results[0].cover_xl) {
      const artworkUrl = results[0].cover_xl; // 1000x1000
      console.log('Found Deezer artwork:', artworkUrl);
      
      const imageResponse = await fetch(artworkUrl);
      if (!imageResponse.ok) return null;
      
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await imageResponse.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      console.log('Deezer cover converted to base64');
      return `data:${contentType};base64,${base64}`;
    }
    
    return null;
  } catch (error) {
    console.error('Deezer search error:', error);
    return null;
  }
}

// Multi-source cover art search
async function searchCoverArtMultiSource(artist: string, album: string, mbid?: string): Promise<string | null> {
  console.log('Starting multi-source cover art search for:', artist, album);
  
  // Try Cover Art Archive first (if we have MBID)
  if (mbid) {
    const coverArt = await getCoverArt(mbid);
    if (coverArt) {
      console.log('Found cover via Cover Art Archive');
      return coverArt;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Try iTunes
  const itunesCover = await searchITunesCover(artist, album);
  if (itunesCover) {
    console.log('Found cover via iTunes');
    return itunesCover;
  }
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Try Deezer
  const deezerCover = await searchDeezerCover(artist, album);
  if (deezerCover) {
    console.log('Found cover via Deezer');
    return deezerCover;
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
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
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
    const { artist, album, year, genre, label, coverArt, barcode, catalogNumber } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let foundCoverArt: string | null = null;
    let mbData: { mbid: string; artist: string; album: string; year: number; label: string; catalogNumber?: string } | null = null;
    let alternativeReleases: AlternativeRelease[] = [];

    // Step 1: Try catalog number first (most reliable for vinyl)
    if (catalogNumber || barcode) {
      const searchTerm = catalogNumber || barcode;
      console.log('Searching by catalog/barcode:', searchTerm);
      
      // Try catalog number search first
      mbData = await searchByCatalogNumber(searchTerm);
      
      // If catalog number didn't work, try barcode search
      if (!mbData && barcode) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        mbData = await searchByBarcode(barcode);
      }
      
      if (mbData?.mbid) {
        // Fetch alternative releases
        await new Promise(resolve => setTimeout(resolve, 1000));
        const releaseGroupId = await getReleaseGroupId(mbData.mbid);
        if (releaseGroupId) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          alternativeReleases = await getAlternativeReleases(releaseGroupId, 15);
        }
        
        // Multi-source cover art search
        await new Promise(resolve => setTimeout(resolve, 500));
        foundCoverArt = await searchCoverArtMultiSource(mbData.artist, mbData.album, mbData.mbid);
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
        
        // Multi-source cover art search
        await new Promise(resolve => setTimeout(resolve, 500));
        foundCoverArt = await searchCoverArtMultiSource(artist, album, mbid);
      } else {
        // No MusicBrainz match, still try iTunes/Deezer directly
        foundCoverArt = await searchCoverArtMultiSource(artist, album);
      }
    }
    
    // Step 3: If still no cover but we have artist/album info, try multi-source without MBID
    if (!foundCoverArt && (artist || mbData?.artist) && (album || mbData?.album)) {
      await new Promise(resolve => setTimeout(resolve, 500));
      foundCoverArt = await searchCoverArtMultiSource(
        artist || mbData?.artist || '', 
        album || mbData?.album || ''
      );
    }
    
    // Step 4: Fallback to artist image if no cover found
    if (!foundCoverArt && (artist || mbData?.artist)) {
      await new Promise(resolve => setTimeout(resolve, 500));
      foundCoverArt = await getArtistImage(artist || mbData?.artist || '');
    }

    // Build context from provided fields (use MusicBrainz data if found)
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

    const contextInfo = knownInfo.length > 0 
      ? `Known information:\n${knownInfo.join('\n')}`
      : 'No information provided yet.';

    // Different prompt for catalog number/barcode lookup
    const searchIdentifier = catalogNumber || barcode;
    const searchInstruction = searchIdentifier 
      ? `\n\nWICHTIG: Der Nutzer hat "${searchIdentifier}" eingegeben (${catalogNumber ? 'Katalognummer' : 'Barcode'}). ${mbData ? `MusicBrainz hat identifiziert: "${mbData.album}" von "${mbData.artist}" (${mbData.year}, Label: ${mbData.label}).` : 'MusicBrainz konnte keine Übereinstimmung finden. Versuche das Album anhand dieser Nummer zu identifizieren.'}`
      : '';

    const systemPrompt = `Du bist ein Musik-Experte, Audiophiler und Historiker mit tiefem Wissen über Jazz, Klassik, Rock und alle Genres. 
Du kennst die Geschichte von Aufnahmetechnik, Pressungen, Labels und Mastering-Ingenieuren.
Du kennst auch Katalognummern von Plattenlabels (z.B. "LITA 197" für Light in the Attic Records).

Deine Aufgabe ist es, Album-Informationen zu vervollständigen und AUSFÜHRLICHE Bewertungen zu liefern.

WICHTIG: Schreibe ALLES auf Deutsch. Sei ausführlich und detailliert wie ein Musik-Magazin.${searchInstruction}

Liefere ein JSON-Objekt mit folgender Struktur:

{
  "artist": "string - nur wenn nicht angegeben",
  "album": "string - nur wenn nicht angegeben", 
  "year": number - Erscheinungsjahr,
  "genre": ["array", "der", "genres"],
  "label": "string - Plattenlabel",
  "catalogNumber": "string - falls bekannt",
  "formatDetails": "string - Vinyl-Details wie Gewicht, Pressung",
  "pressing": "string - Pressland/Jahr",
  "tags": ["stimmung", "instrumente", "themen"],
  "personalNotes": "string - interessante Fakten über dieses Album",
  
  "audiophileAssessment": "AUSFÜHRLICHE audiophile Beurteilung (mindestens 150 Wörter): Beschreibe die Aufnahmequalität, Räumlichkeit, Transparenz, Dynamik, Basswiedergabe, Höhenauflösung. Erwähne spezifische Toningenieure, Studios, Aufnahmetechnik. Nenne die besten Pressungen (Original, Reissues wie MoFi, Acoustic Sounds, Analogue Productions). Beschreibe die Klangbühne und Instrumententrennung. Nutze audiophile Fachbegriffe.",
  
  "artisticAssessment": "AUSFÜHRLICHE künstlerische Beurteilung (mindestens 150 Wörter): Beschreibe die historische Bedeutung, musikalische Innovation, Kompositionsqualität, Arrangements, Musiker-Besetzung, Einfluss auf das Genre. Setze es in den Kontext der Karriere des Künstlers. Erwähne besondere Tracks und ihre Bedeutung. Beschreibe die emotionale Wirkung und das künstlerische Statement.",
  
  "recordingQuality": number 1-5,
  "masteringQuality": number 1-5,
  "artisticRating": number 1-5,
  
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
    let completedData;
    try {
      completedData = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        completedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse AI response as JSON");
      }
    }

    // Use MusicBrainz data if available
    if (mbData) {
      if (!completedData.artist) completedData.artist = mbData.artist;
      if (!completedData.album) completedData.album = mbData.album;
      if (!completedData.year && mbData.year) completedData.year = mbData.year;
      if (!completedData.label && mbData.label) completedData.label = mbData.label;
    }

    // Add the cover art we found
    if (foundCoverArt) {
      completedData.coverArtBase64 = foundCoverArt;
      console.log('Added cover art from MusicBrainz/Wikipedia');
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
