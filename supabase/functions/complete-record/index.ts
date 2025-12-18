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
    const { artist, album, year, genre, label, coverArt } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context from provided fields
    const knownInfo: string[] = [];
    if (artist) knownInfo.push(`Artist: ${artist}`);
    if (album) knownInfo.push(`Album: ${album}`);
    if (year) knownInfo.push(`Year: ${year}`);
    if (genre && genre.length > 0) knownInfo.push(`Genres: ${genre.join(', ')}`);
    if (label) knownInfo.push(`Label: ${label}`);

    const contextInfo = knownInfo.length > 0 
      ? `Known information:\n${knownInfo.join('\n')}`
      : 'No information provided yet.';

    const systemPrompt = `You are a music expert assistant and audiophile helping to complete record/album information. 
You have extensive knowledge about music history, record labels, album releases, music genres, recording techniques, and sound quality.

Your task is to fill in missing information about a music album. Be accurate and use real data.
If you're not confident about specific details, indicate that with a confidence field.

IMPORTANT: Only provide information for fields that are missing or empty. Do not override provided data.
Return a JSON object with the following structure (only include fields you can fill):

{
  "artist": "string - only if not provided",
  "album": "string - only if not provided", 
  "year": number - release year,
  "genre": ["array", "of", "genres"],
  "label": "string - record label",
  "catalogNumber": "string - if known",
  "formatDetails": "string - vinyl details like weight, pressing info",
  "pressing": "string - pressing country/year",
  "tags": ["mood", "instruments", "themes"],
  "personalNotes": "string - interesting facts about this album",
  "coverArtUrl": "string - ALWAYS provide a real, working URL to the album cover from a reliable source like Wikipedia, MusicBrainz, or Discogs",
  "audiophileAssessment": "string - detailed audiophile assessment in German: recording quality, mastering quality, dynamic range, recommended pressing, sound stage, bass response, high frequency clarity. 2-4 sentences.",
  "artisticAssessment": "string - detailed artistic assessment in German: musical innovation, cultural significance, songwriting quality, performance quality, influence on music history. 2-4 sentences.",
  "recordingQuality": number 1-5 - technical recording quality,
  "masteringQuality": number 1-5 - mastering quality,
  "artisticRating": number 1-5 - artistic merit,
  "confidence": "high|medium|low"
}

Be concise and factual. Write assessments in German. Include interesting facts in personalNotes.`;

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

    if (!response.ok) {
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
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
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
