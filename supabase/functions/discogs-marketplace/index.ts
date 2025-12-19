import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DISCOGS_API_KEY = Deno.env.get('DISCOGS_API_KEY');
const DISCOGS_USER_AGENT = 'Sonorium/1.0';

interface MarketplaceListing {
  price: number;
  currency: string;
  condition: string;
  sleeveCondition: string;
  shipsFrom: string;
  seller: string;
  url: string;
}

interface MarketplaceResult {
  releaseId: number;
  releaseUrl: string;
  lowestPrice?: number;
  medianPrice?: number;
  highestPrice?: number;
  currency: string;
  numForSale: number;
  listings: MarketplaceListing[];
}

// Search Discogs by artist + album or catalog number
async function searchDiscogsRelease(query: { artist?: string; album?: string; catalogNumber?: string; barcode?: string }): Promise<number | null> {
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
      console.log('Found Discogs release:', data.results[0].id, data.results[0].title);
      return data.results[0].id;
    }

    return null;
  } catch (error) {
    console.error('Discogs search error:', error);
    return null;
  }
}

// Get marketplace listings for a release
async function getMarketplaceListings(releaseId: number, currency: string = 'EUR'): Promise<MarketplaceResult | null> {
  if (!DISCOGS_API_KEY) {
    console.log('Discogs API key not configured');
    return null;
  }

  try {
    const url = `https://api.discogs.com/marketplace/listings?release_id=${releaseId}&sort=price&sort_order=asc&per_page=10&currency=${currency}`;
    
    console.log('Fetching marketplace listings:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': DISCOGS_USER_AGENT,
        'Authorization': `Discogs token=${DISCOGS_API_KEY}`
      }
    });

    if (!response.ok) {
      console.log('Marketplace listings failed:', response.status);
      
      // Try alternative: get release stats
      return await getReleaseStats(releaseId, currency);
    }

    const data = await response.json();
    const listings = data.listings || [];

    if (listings.length === 0) {
      return await getReleaseStats(releaseId, currency);
    }

    const prices = listings.map((l: any) => l.price?.value || 0).filter((p: number) => p > 0);
    
    const result: MarketplaceResult = {
      releaseId,
      releaseUrl: `https://www.discogs.com/release/${releaseId}`,
      lowestPrice: prices.length > 0 ? Math.min(...prices) : undefined,
      highestPrice: prices.length > 0 ? Math.max(...prices) : undefined,
      medianPrice: prices.length > 0 ? prices[Math.floor(prices.length / 2)] : undefined,
      currency,
      numForSale: data.pagination?.items || listings.length,
      listings: listings.slice(0, 5).map((l: any) => ({
        price: l.price?.value || 0,
        currency: l.price?.currency || currency,
        condition: l.condition || 'Unknown',
        sleeveCondition: l.sleeve_condition || 'Unknown',
        shipsFrom: l.ships_from || 'Unknown',
        seller: l.seller?.username || 'Unknown',
        url: l.uri || ''
      }))
    };

    console.log('Found', result.numForSale, 'listings, lowest:', result.lowestPrice);
    return result;

  } catch (error) {
    console.error('Marketplace listings error:', error);
    return null;
  }
}

// Get release statistics (community data)
async function getReleaseStats(releaseId: number, currency: string = 'EUR'): Promise<MarketplaceResult | null> {
  try {
    const url = `https://api.discogs.com/releases/${releaseId}`;
    
    console.log('Fetching release stats:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': DISCOGS_USER_AGENT,
        'Authorization': `Discogs token=${DISCOGS_API_KEY}`
      }
    });

    if (!response.ok) {
      console.log('Release stats failed:', response.status);
      return null;
    }

    const data = await response.json();
    
    const result: MarketplaceResult = {
      releaseId,
      releaseUrl: `https://www.discogs.com/release/${releaseId}`,
      lowestPrice: data.lowest_price || undefined,
      numForSale: data.num_for_sale || 0,
      currency,
      listings: []
    };

    console.log('Release stats - num for sale:', result.numForSale, 'lowest:', result.lowestPrice);
    return result;

  } catch (error) {
    console.error('Release stats error:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { artist, album, catalogNumber, barcode, releaseId } = await req.json();
    
    console.log('Marketplace request:', { artist, album, catalogNumber, barcode, releaseId });

    let discogsReleaseId = releaseId;

    // If no release ID provided, search for it
    if (!discogsReleaseId) {
      discogsReleaseId = await searchDiscogsRelease({ artist, album, catalogNumber, barcode });
    }

    if (!discogsReleaseId) {
      return new Response(
        JSON.stringify({ error: 'Release not found on Discogs', data: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get marketplace data
    const marketplaceData = await getMarketplaceListings(discogsReleaseId, 'CHF');

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