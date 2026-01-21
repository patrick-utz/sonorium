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

  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getUser(token);
  
  if (error || !data?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return { userId: data.user.id };
}

interface ShopResult {
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
  error?: string;
}

// Discogs marketplace search
async function searchDiscogs(artist: string, album: string, catalogNumber?: string): Promise<ShopResult> {
  const DISCOGS_API_KEY = Deno.env.get("DISCOGS_API_KEY");
  const baseResult: ShopResult = {
    shopId: "discogs",
    shopName: "Discogs",
    shopUrl: "https://www.discogs.com",
    country: "INT",
    currency: "CHF",
  };

  if (!DISCOGS_API_KEY) {
    return { ...baseResult, error: "API nicht konfiguriert" };
  }

  try {
    // Search for release
    let searchQuery = catalogNumber || `${artist} ${album}`;
    const searchUrl = `https://api.discogs.com/database/search?q=${encodeURIComponent(searchQuery)}&type=release&format=vinyl`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Discogs token=${DISCOGS_API_KEY}`,
        'User-Agent': 'SONORIUM/1.0',
      },
    });

    if (!searchResponse.ok) {
      return { ...baseResult, error: "Suche fehlgeschlagen" };
    }

    const searchData = await searchResponse.json();
    const release = searchData.results?.[0];

    if (!release) {
      return { ...baseResult, error: "Nicht gefunden" };
    }

    // Get marketplace stats
    const statsUrl = `https://api.discogs.com/marketplace/stats/${release.id}?curr_abbr=CHF`;
    const statsResponse = await fetch(statsUrl, {
      headers: {
        'Authorization': `Discogs token=${DISCOGS_API_KEY}`,
        'User-Agent': 'SONORIUM/1.0',
      },
    });

    if (!statsResponse.ok) {
      return {
        ...baseResult,
        productUrl: `https://www.discogs.com/sell/release/${release.id}`,
        inStock: true,
      };
    }

    const stats = await statsResponse.json();

    return {
      ...baseResult,
      price: stats.lowest_price?.value,
      currency: stats.lowest_price?.currency || "CHF",
      shippingEstimate: 8, // Estimated shipping to CH
      totalEstimate: stats.lowest_price?.value ? stats.lowest_price.value + 8 : undefined,
      numForSale: stats.num_for_sale || 0,
      productUrl: `https://www.discogs.com/sell/release/${release.id}`,
      inStock: (stats.num_for_sale || 0) > 0,
    };
  } catch (err) {
    console.error("Discogs error:", err);
    return { ...baseResult, error: "Verbindungsfehler" };
  }
}

// Generic web search for Swiss/German shops
// Note: These would need proper API integrations or web scraping
// For now, we generate search URLs that users can visit
function generateShopSearchUrl(shopId: string, artist: string, album: string): ShopResult {
  const searchTerm = encodeURIComponent(`${artist} ${album}`);
  
  const shopConfigs: Record<string, { name: string; url: string; searchUrl: string; country: string }> = {
    recordsale: {
      name: "recordsale.ch",
      url: "https://www.recordsale.ch",
      searchUrl: `https://www.recordsale.ch/search?q=${searchTerm}`,
      country: "CH",
    },
    cede: {
      name: "cede.ch", 
      url: "https://www.cede.ch",
      searchUrl: `https://www.cede.ch/de/Music/?branch=1&view=tiled&q=${searchTerm}`,
      country: "CH",
    },
    jpc: {
      name: "jpc.de",
      url: "https://www.jpc.de",
      searchUrl: `https://www.jpc.de/s/${searchTerm}`,
      country: "DE",
    },
    imusic: {
      name: "imusic.ch",
      url: "https://www.imusic.ch",
      searchUrl: `https://www.imusic.ch/search/?searchstring=${searchTerm}`,
      country: "CH",
    },
    musikhug: {
      name: "Musik Hug",
      url: "https://www.musikhug.ch",
      searchUrl: `https://www.musikhug.ch/de/catalogsearch/result/?q=${searchTerm}`,
      country: "CH",
    },
  };

  const config = shopConfigs[shopId];
  if (!config) {
    return {
      shopId,
      shopName: shopId,
      shopUrl: "",
      country: "?",
      currency: "CHF",
      error: "Shop nicht konfiguriert",
    };
  }

  return {
    shopId,
    shopName: config.name,
    shopUrl: config.url,
    country: config.country,
    currency: config.country === "DE" ? "EUR" : "CHF",
    productUrl: config.searchUrl,
    // For these shops, we can't get actual prices via API
    // User needs to check manually
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await validateAuth(req);
    if (authResult instanceof Response) {
      return authResult;
    }

    const { artist, album, catalogNumber, shops } = await req.json();

    if (!artist && !album) {
      return new Response(JSON.stringify({ error: "Artist oder Album erforderlich" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const enabledShops = shops || ["discogs", "recordsale", "cede", "jpc"];
    const results: ShopResult[] = [];

    // Search each enabled shop
    for (const shopId of enabledShops) {
      if (shopId === "discogs") {
        const discogsResult = await searchDiscogs(artist, album, catalogNumber);
        results.push(discogsResult);
      } else {
        const shopResult = generateShopSearchUrl(shopId, artist, album);
        results.push(shopResult);
      }
    }

    // Sort by price (Discogs first since it has actual prices)
    results.sort((a, b) => {
      if (a.price && !b.price) return -1;
      if (!a.price && b.price) return 1;
      if (a.price && b.price) return a.price - b.price;
      return 0;
    });

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in marketplace-search:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
