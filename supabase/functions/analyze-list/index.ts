import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.88.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validate authentication and return user data
async function validateAuth(req: Request): Promise<{ userId: string; supabase: any } | Response> {
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
    console.error('Auth validation failed:', error?.message);
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return { userId: data.user.id, supabase };
}

interface ExtractedAlbum {
  artist: string;
  album: string;
  year?: number;
  label?: string;
  catalogNumber?: string;
  price?: number;
  currency?: string;
  condition?: string;
  shopName?: string;
}

interface PortfolioAlbum {
  artist: string;
  album: string;
  genre: string[];
  myRating: number;
}

interface MatchedAlbum extends ExtractedAlbum {
  relevanceScore: number;
  matchReason: string;
  inCollection: boolean;
  inWishlist: boolean;
  recommendedPressing?: string;
  discogsPrice?: number;
  priceAssessment?: 'sehr gut' | 'gut' | 'fair' | 'teuer' | 'sehr teuer';
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
    const { userId, supabase } = authResult;

    const { content, contentType, sourceUrl, shopName } = await req.json() as {
      content: string;        // Base64 encoded PDF or raw text/markdown
      contentType: 'pdf' | 'url' | 'text';
      sourceUrl?: string;     // URL if contentType is 'url'
      shopName?: string;      // Optional shop name override
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!content?.trim() && !sourceUrl?.trim()) {
      return new Response(JSON.stringify({ error: "Content or URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Analyzing list: type=${contentType}, shop=${shopName || 'auto-detect'}`);

    // Fetch user's collection (4-5 star rated albums) for portfolio matching
    const { data: collectionData } = await supabase
      .from('records')
      .select('artist, album, genre, my_rating')
      .eq('user_id', userId)
      .in('my_rating', [4, 5])
      .eq('status', 'owned');

    const portfolio: PortfolioAlbum[] = (collectionData || []).map((r: any) => ({
      artist: r.artist,
      album: r.album,
      genre: r.genre || [],
      myRating: r.my_rating,
    }));

    // Fetch existing collection and wishlist to mark duplicates
    const { data: allRecords } = await supabase
      .from('records')
      .select('artist, album, status')
      .eq('user_id', userId);

    const existingRecords = (allRecords || []).map((r: any) => ({
      artist: r.artist.toLowerCase().trim(),
      album: r.album.toLowerCase().trim(),
      status: r.status,
    }));

    // Fetch user's audiophile profile for context
    const { data: profileData } = await supabase
      .from('audiophile_profiles')
      .select('profile')
      .eq('user_id', userId)
      .maybeSingle();

    const profile = profileData?.profile || null;

    // Build portfolio context
    let portfolioContext = "";
    if (portfolio.length > 0) {
      const topAlbums = portfolio.slice(0, 20).map(a => 
        `${a.artist} - "${a.album}" (${a.myRating}★, ${a.genre.slice(0, 2).join(', ') || 'Genre unbekannt'})`
      ).join('\n');
      portfolioContext = `\n\nDIE FAVORITEN DES NUTZERS (4-5 Sterne):\n${topAlbums}`;
    }

    let equipmentContext = "";
    if (profile?.equipment) {
      const eq = profile.equipment;
      const parts = [];
      if (eq.turntable) parts.push(`Plattenspieler: ${eq.turntable}`);
      if (eq.amplifier) parts.push(`Verstärker: ${eq.amplifier}`);
      if (eq.speakers) parts.push(`Lautsprecher: ${eq.speakers}`);
      if (parts.length > 0) {
        equipmentContext = `\n\nEQUIPMENT DES NUTZERS:\n${parts.join('\n')}`;
      }
    }

    let preferencesContext = "";
    if (profile?.preferences) {
      const prefs = profile.preferences;
      const parts = [];
      if (prefs.genres?.length) parts.push(`Bevorzugte Genres: ${prefs.genres.join(', ')}`);
      if (prefs.favoriteLabels?.length) parts.push(`Bevorzugte Labels: ${prefs.favoriteLabels.join(', ')}`);
      if (parts.length > 0) {
        preferencesContext = `\n\nVORLIEBEN DES NUTZERS:\n${parts.join('\n')}`;
      }
    }

    // Prepare content for analysis
    let textContent = content;
    
    if (contentType === 'url' && sourceUrl) {
      // For URLs, we pass the URL directly to the AI
      textContent = `URL zum Analysieren: ${sourceUrl}\n\nBitte extrahiere alle Vinyl-/Schallplatten-Angebote von dieser URL.`;
    }

    const systemPrompt = `Du bist ein Vinyl-Experte und analysierst Listen von Schallplatten-Angeboten.${portfolioContext}${equipmentContext}${preferencesContext}

DEINE AUFGABE:
1. Extrahiere ALLE Vinyl-Alben aus dem Inhalt (Text, PDF oder URL)
2. Identifiziere automatisch den Shop-Namen aus dem Inhalt (z.B. HHV, JPC, Discogs, etc.) falls nicht angegeben
3. Bewerte jedes Album basierend auf dem Nutzer-Portfolio (Ähnlichkeit zu Favoriten, Genre-Match)
4. Empfehle die beste Pressung falls bekannt
5. Bewerte ob der Preis attraktiv ist (basierend auf typischen Discogs-Preisen)

PREIS-BEWERTUNG:
- "sehr gut": Deutlich unter Marktwert (>20% günstiger)
- "gut": Unter Marktwert (10-20% günstiger)
- "fair": Im Bereich des Marktwerts (±10%)
- "teuer": Über Marktwert (10-30% teurer)
- "sehr teuer": Weit über Marktwert (>30% teurer)

RELEVANZ-SCORE (0-100):
- 90-100: Perfekter Match (gleicher Künstler wie Favorit, oder Top-Label des Nutzers)
- 70-89: Sehr gut (ähnliches Genre, empfohlene Pressung)
- 50-69: Interessant (passt zum Profil)
- 30-49: Evtl. relevant (teilweise Match)
- 0-29: Weniger relevant

Antworte NUR mit validem JSON (ohne Markdown):
{
  "shopName": "Erkannter Shop-Name oder 'Unbekannt'",
  "totalAlbumsFound": 42,
  "albums": [
    {
      "artist": "Künstler",
      "album": "Album-Titel",
      "year": 1969,
      "label": "Label",
      "catalogNumber": "ABC-123",
      "price": 29.99,
      "currency": "EUR",
      "condition": "M/VG+",
      "relevanceScore": 85,
      "matchReason": "Gleicher Künstler wie dein Favorit 'Kind of Blue'",
      "recommendedPressing": "Original Blue Note (besser als Reissue)",
      "discogsPrice": 35,
      "priceAssessment": "gut"
    }
  ],
  "summary": "Kurze Zusammenfassung der Liste und Top-Empfehlungen"
}

WICHTIG: 
- Sortiere nach relevanceScore (höchste zuerst)
- Zeige maximal 50 Alben (die relevantesten)
- Behalte Originalpreise aus der Quelle
- Bei URLs: Analysiere die verlinkte Seite vollständig`;

    const userPrompt = shopName 
      ? `Shop: ${shopName}\n\nInhalt:\n${textContent}`
      : `Inhalt:\n${textContent}`;

    console.log('Sending to AI for analysis...');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 16000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error("No content in AI response");
    }

    console.log("AI response received, parsing...");

    // Parse the JSON response
    let result;
    try {
      const cleanedContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.log("Raw content:", aiContent.substring(0, 500));
      
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[0]);
        } catch {
          throw new Error("Could not parse AI response as JSON");
        }
      } else {
        throw new Error("No JSON found in AI response");
      }
    }

    // Mark albums that are already in collection or wishlist
    if (result.albums && Array.isArray(result.albums)) {
      result.albums = result.albums.map((album: ExtractedAlbum) => {
        const artistNorm = album.artist?.toLowerCase().trim() || '';
        const albumNorm = album.album?.toLowerCase().trim() || '';
        
        const existing = existingRecords.find(
          (r: { artist: string; album: string; status: string }) => r.artist === artistNorm && r.album === albumNorm
        );
        
        return {
          ...album,
          inCollection: existing?.status === 'owned',
          inWishlist: existing?.status === 'wishlist',
        };
      });
    }

    console.log(`Successfully analyzed list: ${result.totalAlbumsFound} albums found`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-list function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
