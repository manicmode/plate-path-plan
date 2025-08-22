import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

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

    // Get user info and display name
    let userName = 'friend'; // fallback
    
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const jwt = authHeader.split(' ')[1];
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: { Authorization: authHeader },
          },
        });
        
        const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
        if (user && !authError) {
          // Get user profile for display name
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('first_name, last_name')
            .eq('user_id', user.id)
            .single();
            
          if (profile?.first_name) {
            userName = profile.first_name;
          } else if (profile?.last_name) {
            userName = profile.last_name;
          }
        }
      }
    } catch (error) {
      console.log('[realtime-token] Could not get user name, using fallback');
    }

    console.log(`[realtime-token] Requesting session for user: ${userName}`);

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
        instructions: `You are Voyage, a warm and encouraging wellness coach. Your user's name is ${userName}.

PERSONA & BEHAVIOR:
- Greet ${userName} by name once per conversation turn (not every sentence)
- Be warm, encouraging, concise, and lightly witty (max one small quip per turn), never cheesy
- Keep responses to 15-25 seconds of speech; if more detail is needed, summarize then offer to go deeper
- When unclear: say "I didn't catch that, ${userName}—could you repeat?"

DATA & RECOMMENDATIONS:
- When questions need data, call the appropriate tool first, then speak a brief summary of findings and your recommendation
- Use actual data to give personalized insights (e.g., "Last week you hit 1,850 calories average, ${userName}")
- End with a tiny next-step offer (e.g., "Want me to log that?" or "Should I set a reminder?")
- Do not write/log anything unless the user confirms

LEGACY TOOL CONFIRMATIONS (still required):
- For logging food/exercise, still ask confirmation like 'Should I log that apple with 95 calories?' and wait for 'yes'
- After tool call succeeds, speak 1-sentence confirmation and ask short follow-up`,
        tools: [
          {
            type: "function",
            name: "get_week_summary",
            description: "Get a summary of user's nutrition, exercise, or recovery data for a specified period",
            parameters: {
              type: "object",
              properties: {
                domain: {
                  type: "string",
                  enum: ["nutrition", "exercise", "recovery"],
                  description: "The domain to get summary for"
                },
                days: {
                  type: "number",
                  description: "Number of days to look back (default: 7)"
                }
              },
              required: ["domain"]
            }
          },
          {
            type: "function",
            name: "get_trends",
            description: "Get trend data for a specific metric over time",
            parameters: {
              type: "object",
              properties: {
                metric: {
                  type: "string",
                  enum: ["calories_in", "hydration_ml", "weight", "exercise_calories"],
                  description: "The metric to analyze trends for"
                },
                days: {
                  type: "number",
                  description: "Number of days to analyze (default: 30)"
                }
              },
              required: ["metric"]
            }
          },
          {
            type: "function",
            name: "get_last_meal",
            description: "Get details about the user's most recent logged meal",
            parameters: {
              type: "object",
              properties: {}
            }
          },
          {
            type: "function",
            name: "get_last_workout",
            description: "Get details about the user's most recent workout",
            parameters: {
              type: "object",
              properties: {}
            }
          },
          {
            type: "function",
            name: "get_goals",
            description: "Get the user's current nutrition and wellness goals",
            parameters: {
              type: "object",
              properties: {}
            }
          },
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