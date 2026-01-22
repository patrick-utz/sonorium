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

  // Use getUser() which validates the token against the auth server
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user?.id) {
    console.error('Auth validation failed:', error?.message);
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return { userId: user.id };
}

const DISCOGS_API_KEY = Deno.env.get('DISCOGS_API_KEY');
const DISCOGS_USER_AGENT = 'Sonorium/1.0';

interface MarketplaceListing {
  price: number;
  totalPrice: number; // price + shipping
  shippingPrice: number;
  currency: string;
  condition: string;
  sleeveCondition: string;
  shipsFrom: string;
  seller: string;
  url: string;
}

interface ReleaseVerification {
  verified: boolean;
  confidence: 'high' | 'medium' | 'low';
  foundArtist: string;
  foundTitle: string;
  foundYear?: number;
  foundLabel?: string;
  foundCatno?: string;
  matchReasons: string[];
  warnings: string[];
}

interface MarketplaceResult {
  releaseId: number;
  releaseUrl: string;
  lowestPrice?: number;
  lowestTotalPrice?: number; // including shipping
  medianPrice?: number;
  highestPrice?: number;
  currency: string;
  numForSale: number;
  listings: MarketplaceListing[];
  verification: ReleaseVerification;
}

interface DiscogsSearchResult {
  id: number;
  title: string;
  artist: string;
  year?: number;
  label?: string;
  catno?: string;
  country?: string;
  format?: string;
  thumb?: string;
}

// Calculate string similarity (Levenshtein-based)
function similarity(s1: string, s2: string): number {
  const a = s1.toLowerCase().trim();
  const b = s2.toLowerCase().trim();
  
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  
  // Check if one contains the other
  if (a.includes(b) || b.includes(a)) return 0.9;
  
  // Simple word overlap
  const wordsA = a.split(/\s+/);
  const wordsB = b.split(/\s+/);
  const commonWords = wordsA.filter(w => wordsB.some(w2 => w2.includes(w) || w.includes(w2)));
  const overlap = commonWords.length / Math.max(wordsA.length, wordsB.length);
  
  return overlap;
}

// Verify if the found release matches what we're looking for
function verifyRelease(
  searchParams: { artist?: string; album?: string; year?: number; catalogNumber?: string; barcode?: string },
  releaseData: { artists: string; title: string; year?: number; labels?: { name: string; catno: string }[] }
): ReleaseVerification {
  const matchReasons: string[] = [];
  const warnings: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'low';
  
  // Check artist match
  const artistSim = searchParams.artist ? similarity(searchParams.artist, releaseData.artists) : 0;
  if (artistSim >= 0.9) {
    matchReasons.push('Künstler stimmt überein');
  } else if (artistSim >= 0.5) {
    matchReasons.push('Künstler ähnlich');
    warnings.push(`Gefundener Künstler: "${releaseData.artists}" (erwartet: "${searchParams.artist}")`);
  } else if (searchParams.artist) {
    warnings.push(`Künstler unterschiedlich: "${releaseData.artists}" vs "${searchParams.artist}"`);
  }
  
  // Check album/title match
  const titleSim = searchParams.album ? similarity(searchParams.album, releaseData.title) : 0;
  if (titleSim >= 0.9) {
    matchReasons.push('Album stimmt überein');
  } else if (titleSim >= 0.5) {
    matchReasons.push('Album ähnlich');
    warnings.push(`Gefundenes Album: "${releaseData.title}" (erwartet: "${searchParams.album}")`);
  } else if (searchParams.album) {
    warnings.push(`Album unterschiedlich: "${releaseData.title}" vs "${searchParams.album}"`);
  }
  
  // Check year match
  if (searchParams.year && releaseData.year) {
    if (searchParams.year === releaseData.year) {
      matchReasons.push('Jahr stimmt überein');
    } else if (Math.abs(searchParams.year - releaseData.year) <= 1) {
      matchReasons.push('Jahr ungefähr passend');
    } else {
      warnings.push(`Jahr unterschiedlich: ${releaseData.year} vs ${searchParams.year}`);
    }
  }
  
  // Check catalog number match
  if (searchParams.catalogNumber && releaseData.labels) {
    const catnoMatch = releaseData.labels.some(l => 
      l.catno && similarity(l.catno, searchParams.catalogNumber!) >= 0.9
    );
    if (catnoMatch) {
      matchReasons.push('Katalognummer stimmt überein');
    }
  }
  
  // Determine confidence
  if (matchReasons.length >= 3 || (artistSim >= 0.9 && titleSim >= 0.9)) {
    confidence = 'high';
  } else if (matchReasons.length >= 2 || (artistSim >= 0.7 && titleSim >= 0.7)) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }
  
  // Verified if we have at least medium confidence and no critical warnings
  const verified = confidence !== 'low' && warnings.length <= 1;
  
  return {
    verified,
    confidence,
    foundArtist: releaseData.artists,
    foundTitle: releaseData.title,
    foundYear: releaseData.year,
    foundLabel: releaseData.labels?.[0]?.name,
    foundCatno: releaseData.labels?.[0]?.catno,
    matchReasons,
    warnings
  };
}

// Search Discogs by artist + album or catalog number
async function searchDiscogsRelease(query: { artist?: string; album?: string; catalogNumber?: string; barcode?: string; year?: number }): Promise<{ releaseId: number; verification: ReleaseVerification } | null> {
  if (!DISCOGS_API_KEY) {
    console.log('Discogs API key not configured');
    return null;
  }

  try {
    let searchUrl = 'https://api.discogs.com/database/search?type=release';
    
    if (query.barcode) {
      searchUrl += `&barcode=${encodeURIComponent(query.barcode)}`;
    } else if (query.catalogNumber) {
      searchUrl += `&catno=${encodeURIComponent(query.catalogNumber)}`;
    } else if (query.artist && query.album) {
      searchUrl += `&artist=${encodeURIComponent(query.artist)}&release_title=${encodeURIComponent(query.album)}`;
    } else {
      return null;
    }

    console.log('Searching Discogs:', searchUrl);

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': DISCOGS_USER_AGENT,
        'Authorization': `Discogs token=${DISCOGS_API_KEY}`
      }
    });

    if (!response.ok) {
      console.log('Discogs search failed:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      console.log('Found Discogs release:', result.id, result.title);
      
      // Parse artist and title from the result
      const [artists, title] = (result.title || '').split(' - ');
      
      const verification = verifyRelease(
        { artist: query.artist, album: query.album, year: query.year, catalogNumber: query.catalogNumber, barcode: query.barcode },
        { 
          artists: artists?.trim() || '', 
          title: title?.trim() || result.title || '',
          year: result.year,
          labels: result.label?.map((l: string) => ({ name: l, catno: result.catno || '' })) || []
        }
      );
      
      return { releaseId: result.id, verification };
    }

    return null;
  } catch (error) {
    console.error('Discogs search error:', error);
    return null;
  }
}

// Search for alternative releases on Discogs
async function searchAlternativeReleases(query: { artist?: string; album?: string }): Promise<DiscogsSearchResult[]> {
  if (!DISCOGS_API_KEY || !query.artist || !query.album) {
    return [];
  }

  try {
    const searchUrl = `https://api.discogs.com/database/search?type=release&artist=${encodeURIComponent(query.artist)}&release_title=${encodeURIComponent(query.album)}&per_page=15`;
    
    console.log('Searching alternative releases:', searchUrl);

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': DISCOGS_USER_AGENT,
        'Authorization': `Discogs token=${DISCOGS_API_KEY}`
      }
    });

    if (!response.ok) {
      console.log('Alternative search failed:', response.status);
      return [];
    }

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return [];
    }

    return data.results.map((r: any) => {
      const [artist, title] = (r.title || '').split(' - ');
      return {
        id: r.id,
        title: title?.trim() || r.title,
        artist: artist?.trim() || '',
        year: r.year,
        label: r.label?.[0] || undefined,
        catno: r.catno || undefined,
        country: r.country || undefined,
        format: r.format?.join(', ') || undefined,
        thumb: r.thumb || undefined
      };
    });
  } catch (error) {
    console.error('Alternative search error:', error);
    return [];
  }
}

// Get marketplace listings for a release with shipping costs
async function getMarketplaceListings(releaseId: number, currency: string = 'EUR', verification: ReleaseVerification): Promise<MarketplaceResult | null> {
  if (!DISCOGS_API_KEY) {
    console.log('Discogs API key not configured');
    return null;
  }

  try {
    // First get release details for more info
    const releaseUrl = `https://api.discogs.com/releases/${releaseId}`;
    console.log('Fetching release details:', releaseUrl);
    
    const releaseResponse = await fetch(releaseUrl, {
      headers: {
        'User-Agent': DISCOGS_USER_AGENT,
        'Authorization': `Discogs token=${DISCOGS_API_KEY}`
      }
    });

    let releaseStats = { lowestPrice: undefined as number | undefined, numForSale: 0 };
    
    if (releaseResponse.ok) {
      const releaseData = await releaseResponse.json();
      releaseStats = {
        lowestPrice: releaseData.lowest_price,
        numForSale: releaseData.num_for_sale || 0
      };
      
      // Update verification with more accurate data
      if (releaseData.artists && releaseData.title) {
        const artistNames = releaseData.artists.map((a: any) => a.name).join(', ');
        verification.foundArtist = artistNames;
        verification.foundTitle = releaseData.title;
        verification.foundYear = releaseData.year;
        if (releaseData.labels?.[0]) {
          verification.foundLabel = releaseData.labels[0].name;
          verification.foundCatno = releaseData.labels[0].catno;
        }
      }
    }

    // Try to get individual listings for shipping info
    // Note: The marketplace/listings endpoint requires OAuth, so we use release stats
    // For now, we estimate shipping based on location (this could be improved with actual API data)
    
    // Estimated shipping costs to Switzerland
    const estimatedShipping: Record<string, number> = {
      'Switzerland': 5,
      'Germany': 8,
      'Austria': 9,
      'France': 10,
      'Italy': 10,
      'Netherlands': 10,
      'Belgium': 10,
      'UK': 12,
      'United Kingdom': 12,
      'Europe': 12,
      'USA': 20,
      'US': 20,
      'Japan': 25,
      'default': 15
    };

    // Since we can't get individual listings easily, we'll provide estimates
    const avgShipping = 12; // Average EU shipping to Switzerland
    
    const result: MarketplaceResult = {
      releaseId,
      releaseUrl: `https://www.discogs.com/release/${releaseId}`,
      lowestPrice: releaseStats.lowestPrice,
      lowestTotalPrice: releaseStats.lowestPrice ? releaseStats.lowestPrice + avgShipping : undefined,
      numForSale: releaseStats.numForSale,
      currency,
      listings: [],
      verification
    };

    console.log('Release stats - num for sale:', result.numForSale, 'lowest:', result.lowestPrice, 'lowest total (est.):', result.lowestTotalPrice);
    return result;

  } catch (error) {
    console.error('Marketplace listings error:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authResult = await validateAuth(req);
    if (authResult instanceof Response) {
      return authResult;
    }

    const { artist, album, catalogNumber, barcode, releaseId, year, action } = await req.json();
    
    console.log('Marketplace request:', { artist, album, catalogNumber, barcode, releaseId, year, action });

    // Handle search for alternative releases
    if (action === 'search-alternatives') {
      const alternatives = await searchAlternativeReleases({ artist, album });
      return new Response(
        JSON.stringify({ data: { alternatives } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let discogsReleaseId = releaseId;
    let verification: ReleaseVerification = {
      verified: false,
      confidence: 'low',
      foundArtist: '',
      foundTitle: '',
      matchReasons: [],
      warnings: ['Keine Verifizierung möglich']
    };

    // If no release ID provided, search for it
    if (!discogsReleaseId) {
      const searchResult = await searchDiscogsRelease({ artist, album, catalogNumber, barcode, year });
      if (searchResult) {
        discogsReleaseId = searchResult.releaseId;
        verification = searchResult.verification;
      }
    } else {
      // If release ID is provided, we assume it's already verified (manually selected)
      verification = {
        verified: true,
        confidence: 'high',
        foundArtist: artist || '',
        foundTitle: album || '',
        matchReasons: ['Manuell ausgewählt'],
        warnings: []
      };
    }

    if (!discogsReleaseId) {
      return new Response(
        JSON.stringify({ error: 'Release not found on Discogs', data: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get marketplace data
    const marketplaceData = await getMarketplaceListings(discogsReleaseId, 'CHF', verification);

    if (!marketplaceData) {
      return new Response(
        JSON.stringify({ error: 'No marketplace data available', data: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data: marketplaceData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});