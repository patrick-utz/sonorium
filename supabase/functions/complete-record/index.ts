import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { artist, album, year, genre, label, coverArt, barcode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context from provided fields
    const knownInfo: string[] = [];
    if (barcode) knownInfo.push(`EAN/Barcode: ${barcode}`);
    if (artist) knownInfo.push(`Artist: ${artist}`);
    if (album) knownInfo.push(`Album: ${album}`);
    if (year) knownInfo.push(`Year: ${year}`);
    if (genre && genre.length > 0) knownInfo.push(`Genres: ${genre.join(', ')}`);
    if (label) knownInfo.push(`Label: ${label}`);

    const contextInfo = knownInfo.length > 0 
      ? `Known information:\n${knownInfo.join('\n')}`
      : 'No information provided yet.';

    // Different prompt for barcode lookup
    const barcodeInstruction = barcode 
      ? `\n\nWICHTIG: Der Nutzer hat den Barcode/EAN "${barcode}" gescannt. Identifiziere das Album anhand dieses EAN-Codes. EAN-Codes sind eindeutige Produktidentifikatoren für CDs und Vinyl-Schallplatten. Suche in deinem Wissen nach dem Album mit diesem EAN.`
      : '';

    const systemPrompt = `Du bist ein Musik-Experte, Audiophiler und Historiker mit tiefem Wissen über Jazz, Klassik, Rock und alle Genres. 
Du kennst die Geschichte von Aufnahmetechnik, Pressungen, Labels und Mastering-Ingenieuren.

Deine Aufgabe ist es, Album-Informationen zu vervollständigen und AUSFÜHRLICHE Bewertungen zu liefern.

WICHTIG: Schreibe ALLES auf Deutsch. Sei ausführlich und detailliert wie ein Musik-Magazin.${barcodeInstruction}

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
  "coverArtUrl": "string - echte URL zum Album-Cover von Wikipedia, MusicBrainz oder Discogs",
  
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

    // If we have a cover URL from AI, try to fetch and convert to base64
    if (completedData.coverArtUrl && !completedData.coverArtUrl.startsWith('data:')) {
      try {
        console.log('Fetching cover image from:', completedData.coverArtUrl);
        const imageResponse = await fetch(completedData.coverArtUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; VinylCollector/1.0)',
            'Accept': 'image/*'
          }
        });
        
        if (imageResponse.ok) {
          const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
          const arrayBuffer = await imageResponse.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          completedData.coverArtBase64 = `data:${contentType};base64,${base64}`;
          console.log('Cover image converted to base64 successfully');
        } else {
          console.log('Failed to fetch cover image:', imageResponse.status);
        }
      } catch (imgError) {
        console.error('Error fetching cover image:', imgError);
      }
    }

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
