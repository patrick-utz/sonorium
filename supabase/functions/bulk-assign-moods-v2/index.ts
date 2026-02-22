import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MoodAssignment {
  recordId: string;
  moods: string[];
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

    // Parse request body
    const body = await req.json();
    const recordIds: string[] = body.recordIds || [];
    const userMoods: string[] = body.userMoods || [];
    const maxMoodsPerAlbum: number = body.maxMoodsPerAlbum || 3;

    if (!recordIds || recordIds.length === 0) {
      throw new Error("No record IDs provided");
    }

    if (!userMoods || userMoods.length === 0) {
      throw new Error("No user moods provided");
    }

    // Fetch selected records
    const { data: records, error: fetchError } = await supabase
      .from("records")
      .select("id, artist, album, genre, moods")
      .in("id", recordIds);

    if (fetchError) {
      throw new Error(`Failed to fetch records: ${fetchError.message}`);
    }

    if (!records || records.length === 0) {
      throw new Error("No records found");
    }

    console.log(`Processing ${records.length} records for mood assignment`);

    // Process in batches to avoid timeout
    const batchSize = 10;
    const assignments: MoodAssignment[] = [];
    const errors: string[] = [];

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      // Build prompt for batch
      const albumDescriptions = batch.map((r, idx) =>
        `${idx + 1}. "${r.album}" von ${r.artist} (Genre: ${r.genre?.join(", ") || "unbekannt"})`
      ).join("\n");

      const prompt = `Du bist ein Musik-Experte. Ordne jedem Album ${maxMoodsPerAlbum}-${maxMoodsPerAlbum} passende Stimmungen aus dieser Liste zu:
${userMoods.join(", ")}

WICHTIG:
- Wähle genau ${maxMoodsPerAlbum} Stimmungen die den Charakter der Musik am besten beschreiben
- Nutze NUR Stimmungen aus der Liste oben
- Berücksichtige Genre, Artist-Stil und Album-Stimmung

Alben:
${albumDescriptions}

Antworte NUR im JSON-Format ohne zusätzlichen Text:
{
  "assignments": [
    { "index": 1, "moods": ["Entspannend", "Melancholisch"] },
    { "index": 2, "moods": ["Energetisch", "Party"] }
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
                content: "Du bist ein Musik-Stimmungs-Experte. Antworte immer mit gültigem JSON."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.4,
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
          parsed.assignments.forEach((assignment: { index: number; moods: string[] }) => {
            const batchIndex = assignment.index - 1;
            if (batchIndex >= 0 && batchIndex < batch.length) {
              const record = batch[batchIndex];
              // Validate moods are from user's enabled list
              const validMoods = assignment.moods.filter((m: string) =>
                userMoods.includes(m)
              );

              if (validMoods.length > 0) {
                // Merge with existing moods (don't replace)
                const existingMoods = record.moods || [];
                const mergedMoods = Array.from(new Set([...existingMoods, ...validMoods]));
                const finalMoods = mergedMoods.slice(0, maxMoodsPerAlbum);

                assignments.push({
                  recordId: record.id,
                  moods: finalMoods
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

    // Update records with new moods
    let successCount = 0;
    const updateErrors: string[] = [];

    for (const assignment of assignments) {
      const { error: updateError } = await supabase
        .from("records")
        .update({ moods: assignment.moods })
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
        message: `${successCount} Alben mit Stimmungen aktualisiert`,
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
