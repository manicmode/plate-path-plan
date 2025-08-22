import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[realtime-token] Request received');
    
    // Get OpenAI API key from environment
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('[realtime-token] OPENAI_API_KEY not found in environment');
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: 'OpenAI API key not configured' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[realtime-token] Requesting session from OpenAI API');

    // Request ephemeral token from OpenAI Realtime API
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "alloy",
        modalities: ["text", "audio"],
        instructions: "You are Voyage, a friendly wellness coach. Always reply with speech. If you didn't clearly hear the user, say 'I didn't catch that—could you repeat?' Keep replies under 12 seconds. When the user mentions logging food, exercise, or opening pages, propose a confirmation like 'Should I log that apple with 95 calories?' and wait for 'yes' or similar confirmation. When the user confirms, call the appropriate tool with concise parameters. After a tool call succeeds, speak a 1-sentence confirmation and ask a short follow-up question.",
        tools: [
          {
            type: "function",
            name: "log_food",
            description: "Log a food item to the user's nutrition diary. Always ask for confirmation before calling this tool.",
            parameters: {
              type: "object",
              properties: {
                description: {
                  type: "string",
                  description: "Description of the food item (e.g., '1 medium apple', 'chicken breast salad')"
                },
                calories: {
                  type: "number",
                  description: "Estimated calories for the food item"
                },
                when: {
                  type: "string",
                  description: "When the food was consumed (optional, defaults to now)"
                }
              },
              required: ["description"]
            }
          },
          {
            type: "function", 
            name: "log_exercise",
            description: "Log an exercise activity to the user's fitness diary. Always ask for confirmation before calling this tool.",
            parameters: {
              type: "object",
              properties: {
                activity: {
                  type: "string",
                  description: "Type of exercise activity (e.g., 'running', 'yoga', 'weight training')"
                },
                minutes: {
                  type: "number", 
                  description: "Duration in minutes (optional, defaults to 30)"
                },
                intensity: {
                  type: "string",
                  enum: ["low", "moderate", "high"],
                  description: "Exercise intensity level (optional, defaults to moderate)"
                },
                when: {
                  type: "string",
                  description: "When the exercise was performed (optional, defaults to now)"
                }
              },
              required: ["activity"]
            }
          },
          {
            type: "function",
            name: "open_page", 
            description: "Navigate to a specific page in the app (e.g., analytics, camera, coach)",
            parameters: {
              type: "object",
              properties: {
                path: {
                  type: "string",
                  description: "The page path to navigate to (e.g., '/analytics', '/camera', '/coach')"
                }
              },
              required: ["path"]
            }
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[realtime-token] Session creation failed:', response.status);
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: `OpenAI API error: ${response.status}` 
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const sessionData = await response.json();
    console.log('[realtime-token] Session created successfully');

    return new Response(
      JSON.stringify({ 
        ok: true, 
        session: sessionData 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[realtime-token] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});