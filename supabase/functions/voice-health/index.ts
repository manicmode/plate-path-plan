import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

// Ping OpenAI services to check health
const pingOpenAIServices = async (): Promise<{
  openai_asr: boolean;
  openai_tts: boolean;
  openai_llm: boolean;
}> => {
  const results = {
    openai_asr: false,
    openai_tts: false,
    openai_llm: false
  };

  // Test LLM endpoint
  try {
    const llmResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [{ role: 'user', content: 'test' }],
        max_completion_tokens: 1
      }),
    });
    results.openai_llm = llmResponse.status === 200;
  } catch (error) {
    console.log('LLM health check failed:', error.message);
  }

  // Test TTS endpoint with minimal request
  try {
    const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: 'alloy',
        input: 'test'
      }),
    });
    results.openai_tts = ttsResponse.status === 200;
  } catch (error) {
    console.log('TTS health check failed:', error.message);
  }

  // ASR requires audio file, so we'll just check if the endpoint is reachable
  try {
    const asrResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
      },
      body: new FormData() // Empty form data will return 400, but means endpoint is reachable
    });
    // 400 is expected without proper form data, but means service is up
    results.openai_asr = asrResponse.status === 400;
  } catch (error) {
    console.log('ASR health check failed:', error.message);
  }

  return results;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🏥 Voice health check started');

    // Check kill switch
    const voiceCoachEnabled = Deno.env.get('VOICE_COACH_ENABLED') !== 'false';
    
    // Ping external services
    const providerPings = await pingOpenAIServices();

    const health = {
      enabled: voiceCoachEnabled,
      provider_pings: providerPings,
      timestamp: new Date().toISOString(),
      // Add any recent error info if needed
      last_error: null
    };

    console.log('✅ Voice health check completed:', health);
    return new Response(
      JSON.stringify(health),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Voice health check error:', error);
    return new Response(
      JSON.stringify({ 
        enabled: false,
        provider_pings: {
          openai_asr: false,
          openai_tts: false,
          openai_llm: false
        },
        last_error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});