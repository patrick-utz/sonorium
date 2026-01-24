import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AVAILABLE_MOODS = [
  "Entspannend",
  "Energetisch", 
  "Melancholisch",
  "Romantisch",
  "Party",
  "Fokus",
  "Live"
];

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
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Invalid user token");
    }

    // Fetch all records for the user that need moods
    const { data: records, error: fetchError } = await supabase
      .from("records")
      .select("id, artist, album, genre, moods")
      .eq("user_id", user.id);

    if (fetchError) {
      throw new Error(`Failed to fetch records: ${fetchError.message}`);
    }

    // Filter records that need mood assignment (empty or no moods)
    const recordsNeedingMoods = records?.filter(r => 
      !r.moods || r.moods.length === 0
    ) || [];

    console.log(`Found ${recordsNeedingMoods.length} records needing mood assignment`);

    if (recordsNeedingMoods.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Alle Alben haben bereits Stimmungen zugewiesen.",
          updated: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process in batches to avoid timeout
    const batchSize = 10;
    let updatedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < recordsNeedingMoods.length; i += batchSize) {
      const batch = recordsNeedingMoods.slice(i, i + batchSize);
      
      // Build prompt for batch
      const albumDescriptions = batch.map((r, idx) => 
        `${idx + 1}. "${r.album}" von ${r.artist} (Genre: ${r.genre?.join(", ") || "unbekannt"})`
      ).join("\n");

      const prompt = `Du bist ein Musik-Experte. Ordne jedem Album GENAU 2 passende Stimmungen aus dieser Liste zu:
${AVAILABLE_MOODS.join(", ")}

WICHTIG:
- "Live" NUR für Alben die explizit Live-Aufnahmen sind (z.B. "Live at...", "In Concert", "Unplugged")
- Wähle die 2 Stimmungen die den Charakter der Musik am besten beschreiben

Alben:
${albumDescriptions}

Antworte NUR im JSON-Format, ohne zusätzlichen Text:
[
  {"index": 1, "moods": ["Stimmung1", "Stimmung2"]},
  ...
]`;

      try {
        const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${Deno.env.get("OPENROUTER_API_KEY")}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://sonorium.lovable.app",
            "X-Title": "SONORIUM Mood Assignment",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error("AI API error:", errorText);
          errors.push(`Batch ${i / batchSize + 1}: AI API error`);
          continue;
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || "";
        
        // Parse JSON from response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          console.error("Could not parse AI response:", content);
          errors.push(`Batch ${i / batchSize + 1}: Parse error`);
          continue;
        }

        const moodAssignments = JSON.parse(jsonMatch[0]);

        // Update each record in the batch
        for (const assignment of moodAssignments) {
          const recordIndex = assignment.index - 1;
          const record = batch[recordIndex];
          
          if (!record) continue;

          // Validate moods are from the allowed list
          const validMoods = assignment.moods
            .filter((m: string) => AVAILABLE_MOODS.includes(m))
            .slice(0, 2);

          if (validMoods.length === 0) {
            // Fallback: assign based on simple genre heuristics
            validMoods.push("Entspannend", "Fokus");
          }

          const { error: updateError } = await supabase
            .from("records")
            .update({ moods: validMoods })
            .eq("id", record.id)
            .eq("user_id", user.id);

          if (updateError) {
            console.error(`Failed to update record ${record.id}:`, updateError);
            errors.push(`Album "${record.album}": Update fehlgeschlagen`);
          } else {
            updatedCount++;
          }
        }
      } catch (batchError: unknown) {
        console.error("Batch processing error:", batchError);
        const errMsg = batchError instanceof Error ? batchError.message : "Unknown error";
        errors.push(`Batch ${i / batchSize + 1}: ${errMsg}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${updatedCount} von ${recordsNeedingMoods.length} Alben wurden Stimmungen zugewiesen.`,
        updated: updatedCount,
        total: recordsNeedingMoods.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in bulk-assign-moods:", error);
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
