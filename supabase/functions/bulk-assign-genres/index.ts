import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Standard genre list (from GenreStandardizationUI)
const STANDARD_GENRES = [
  "Rock",
  "Pop",
  "Jazz",
  "Jazz Fusion",
  "Jazz Latin",
  "Classical",
  "Electronic",
  "Hip-Hop",
  "Reggae",
  "Soul",
  "Country",
  "Folk",
  "Latin",
  "World"
];

interface GenreAssignment {
  recordId: string;
  genres: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Invalid user token");
    }

    // Parse request body to get record IDs
    const body = await req.json();
    const recordIds: string[] = body.recordIds || [];

    if (!recordIds || recordIds.length === 0) {
      throw new Error("No record IDs provided");
    }

    // Fetch selected records
    const { data: records, error: fetchError } = await supabase
      .from("records")
      .select("id, artist, album, genre")
      .in("id", recordIds);

    if (fetchError) {
      throw new Error(`Failed to fetch records: ${fetchError.message}`);
    }

    if (!records || records.length === 0) {
      throw new Error("No records found");
    }

    console.log(`Processing ${records.length} records for genre assignment`);

    // Process in batches to avoid timeout
    const batchSize = 10;
    const assignments: GenreAssignment[] = [];
    const errors: string[] = [];

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      // Build prompt for batch
      const albumDescriptions = batch.map((r, idx) =>
        `${idx + 1}. "${r.album}" von ${r.artist} (Aktuelle Genres: ${r.genre?.join(", ") || "unbekannt"})`
      ).join("\n");

      const prompt = `Du bist ein Musik-Experte und spezialisiert auf Musik-Kategorisierung. Ordne jedes Album GENAU 1-2 passende Standard-Genres zu.

ERLAUBTE GENRES (EXAKT nutzen, keine Variationen):
${STANDARD_GENRES.join(" | ")}

WICHTIG:
- Nutze NUR die Genres aus der Liste oben
- Speziell für Jazz: Unterscheide zwischen "Jazz", "Jazz Fusion", "Jazz Latin"
- Wähle 1-2 Genres die den Musikstil am besten beschreiben
- Bevorzuge Hauptgenre (z.B. "Rock" statt "Electronic Rock")
- Nur bei sehr gemischten Alben 2 Genres verwenden

Alben:
${albumDescriptions}

Antworte NUR im JSON-Format ohne zusätzlichen Text:
{
  "assignments": [
    { "index": 1, "genres": ["Rock"] },
    { "index": 2, "genres": ["Jazz", "Jazz Fusion"] }
  ]
}`;

      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "Du bist ein Musik-Kategorisierungsexperte. Antworte immer mit gültigem JSON."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.3,
            response_format: { type: "json_object" }
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.status}`);
        }

        const aiResponse = await response.json();
        const content = aiResponse.choices[0]?.message?.content;

        if (!content) {
          throw new Error("Empty AI response");
        }

        // Parse AI response
        const parsed = JSON.parse(content);

        // Map assignments to records
        if (parsed.assignments && Array.isArray(parsed.assignments)) {
          parsed.assignments.forEach((assignment: { index: number; genres: string[] }) => {
            const batchIndex = assignment.index - 1;
            if (batchIndex >= 0 && batchIndex < batch.length) {
              const record = batch[batchIndex];
              // Validate genres are from standard list
              const validGenres = assignment.genres.filter((g: string) =>
                STANDARD_GENRES.includes(g)
              );

              if (validGenres.length > 0) {
                assignments.push({
                  recordId: record.id,
                  genres: validGenres.slice(0, 2) // Max 2 genres
                });
              }
            }
          });
        }
      } catch (error) {
        console.error(`Batch ${i / batchSize + 1} error:`, error.message);
        errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
      }
    }

    // Update records with new genres
    let successCount = 0;
    const updateErrors: string[] = [];

    for (const assignment of assignments) {
      const { error: updateError } = await supabase
        .from("records")
        .update({ genre: assignment.genres })
        .eq("id", assignment.recordId)
        .eq("user_id", user.id);

      if (updateError) {
        updateErrors.push(`${assignment.recordId}: ${updateError.message}`);
      } else {
        successCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${successCount} Alben mit Genres aktualisiert`,
        updated: successCount,
        total: records.length,
        assignments: assignments,
        errors: [...errors, ...updateErrors]
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: errors.length > 0 || updateErrors.length > 0 ? 207 : 200
      }
    );
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      }
    );
  }
});
