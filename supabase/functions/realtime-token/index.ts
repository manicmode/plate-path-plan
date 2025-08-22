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

    console.log('[realtime-token] Requesting ephemeral token from OpenAI');

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
        instructions: "You are Voyage, a friendly wellness coach. Always reply with speech. If you didn't clearly hear the user, say 'I didn't catch that—could you repeat?' Keep replies under 12 seconds. When the user asks to log food, exercise, or measurements, propose a short confirmation and await a 'yes' before executing a tool call."
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[realtime-token] OpenAI API error:', response.status, errorText);
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