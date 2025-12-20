import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AudiophileProfile {
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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { artist, profile } = await req.json() as { artist: string; profile: AudiophileProfile | null };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!artist?.trim()) {
      return new Response(JSON.stringify({ error: "Artist name is required" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Researching artist: ${artist}`);
    console.log(`Profile:`, profile);

    // Build personalized context
    let equipmentContext = "";
    if (profile?.equipment) {
      const eq = profile.equipment;
      const parts = [];
      if (eq.turntable) parts.push(`Plattenspieler: ${eq.turntable}`);
      if (eq.amplifier) parts.push(`Verstärker: ${eq.amplifier}`);
      if (eq.speakers) parts.push(`Lautsprecher: ${eq.speakers}`);
      if (eq.cdPlayer) parts.push(`CD-Player: ${eq.cdPlayer}`);
      if (eq.dac) parts.push(`DAC/Digitalvorstufe: ${eq.dac}`);
      if (eq.other) parts.push(`Sonstiges: ${eq.other}`);
      if (parts.length > 0) {
        equipmentContext = `\n\nDas Equipment des Nutzers:\n${parts.join('\n')}`;
      }
    }

    let preferencesContext = "";
    if (profile?.preferences) {
      const prefs = profile.preferences;
      const parts = [];
      if (prefs.genres?.length) parts.push(`Bevorzugte Genres: ${prefs.genres.join(', ')}`);
      if (prefs.favoriteLabels?.length) parts.push(`Bevorzugte Labels: ${prefs.favoriteLabels.join(', ')}`);
      if (prefs.avoidLabels?.length) parts.push(`Zu vermeidende Labels: ${prefs.avoidLabels.join(', ')}`);
      parts.push(`Klangvorliebe: ${prefs.soundPreference}`);
      parts.push(`Hörstil: ${prefs.listeningStyle}`);
      if (parts.length > 0) {
        preferencesContext = `\n\nVorlieben des Nutzers:\n${parts.join('\n')}`;
      }
    }

    const systemPrompt = `Du bist ein erfahrener Musikexperte und Vinyl-Spezialist mit tiefem Wissen über Vinyl-Pressungen, Labels und Klangqualität. 
Du gibst ausschliesslich Empfehlungen für VINYL/LP-Pressungen - keine CDs oder digitale Formate.${equipmentContext}${preferencesContext}

WICHTIG: Bewerte und empfehle NUR Vinyl-Pressungen. Gib für JEDES Album konkrete Katalognummern der besten Pressungen an.

Antworte IMMER im folgenden JSON-Format (ohne Markdown-Codeblöcke):
{
  "artist": "Künstlername",
  "overview": "Kurze Übersicht über den Künstler und seine Bedeutung für Vinyl-Sammler",
  "phases": [
    {
      "name": "Name der Phase",
      "period": "Zeitraum (z.B. 1959-1963)",
      "description": "Beschreibung der Phase",
      "audioQuality": "Beschreibung der typischen Vinyl-Klangqualität dieser Phase"
    }
  ],
  "topRecommendations": [
    {
      "rank": 1,
      "album": "Albumtitel",
      "artist": "Künstler",
      "year": "Erscheinungsjahr",
      "label": "Originallabel",
      "musicalRating": 5,
      "soundRating": 5,
      "description": "Kurze Beschreibung warum dieses Album wichtig ist",
      "phase": "Name der Phase (optional)",
      "notes": "Spezielle Hinweise für den Vinyl-Sammler",
      "bestPressings": [
        {
          "label": "Label der Pressung",
          "catalogNumber": "KONKRETE Katalognummer (z.B. BLP 4085, V6-8456, ABC-123)",
          "year": "Jahr der Pressung",
          "country": "Land (USA, Japan, UK, Deutschland, etc.)",
          "quality": "reference|excellent|good|acceptable",
          "notes": "Detaillierte Beschreibung der Vinyl-Pressung und warum sie empfohlen wird",
          "matrixInfo": "Matrix-/Runout-Informationen falls bekannt (z.B. RVG, Van Gelder)",
          "avoid": false
        }
      ]
    }
  ],
  "buyingTips": ["Vinyl-spezifische Kauftipps"],
  "avoidLabels": ["Zu vermeidende Labels/Pressungen für Vinyl"]
}

KRITISCH: Gib für JEDES Album mindestens 2-3 konkrete Vinyl-Pressungen mit echten Katalognummern an. 
Sortiere die Pressungen nach Klangqualität (beste zuerst).
Gib die TOP 3 bis 5 Alben, sortiert nach audiophiler Vinyl-Relevanz.`;

    const userPrompt = `Gib mir eine detaillierte Vinyl-Analyse und Kaufempfehlung für: ${artist}

Strukturiere die Antwort wie folgt:
1. Kurze Übersicht über den Künstler aus Vinyl-Sammler-Perspektive
2. Wichtige Schaffensphasen (falls zutreffend)
3. Die 3-5 wichtigsten Alben mit KONKRETEN VINYL-Pressungsempfehlungen inkl. Katalognummern
4. Kauftipps für Vinyl-Käufe und zu vermeidende Labels/Pressungen

WICHTIG: Gib für jedes Album echte Katalognummern an (z.B. Blue Note BLP 4085, Riverside RLP 12-269).
Fokussiere ausschliesslich auf Vinyl-Pressungen, keine CDs. Gib konkrete Matrix-Nummern und Runout-Infos wo bekannt.`;

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
        temperature: 0.7,
        max_tokens: 4000,
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
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI response received, parsing...");

    // Parse the JSON response
    let result;
    try {
      // Remove potential markdown code blocks
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.log("Raw content:", content);
      
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
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

    console.log(`Successfully parsed research for: ${result.artist}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in artist-research function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
