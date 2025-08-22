import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎤 Voice turn request started');
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const contentType = req.headers.get('content-type') || '';
    
    // Handle FormData upload (audio files)
    if (contentType.includes('multipart/form-data')) {
      console.log('📊 Processing audio data...');
      
      const formData = await req.formData();
      const audioFile = formData.get('audio') as File;
      
      if (!audioFile) {
        return new Response(JSON.stringify({ 
          ok: false, 
          code: 'MISSING_AUDIO',
          message: 'No audio file provided' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check file size (max 20MB)
      if (audioFile.size > 20 * 1024 * 1024) {
        return new Response(JSON.stringify({ 
          ok: false, 
          code: 'FILE_TOO_LARGE',
          message: 'Audio file exceeds 20MB limit',
          details: { size: audioFile.size, limit: 20 * 1024 * 1024 }
        }), {
          status: 413,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('🎤 Starting ASR transcription...');
      const startTime = performance.now();

      // Send to OpenAI Whisper
      const whisperFormData = new FormData();
      whisperFormData.append('file', audioFile);
      whisperFormData.append('model', 'whisper-1');

      const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
        },
        body: whisperFormData,
      });

      if (!whisperResponse.ok) {
        const errorText = await whisperResponse.text();
        console.error('❌ Whisper API error:', errorText);
        return new Response(JSON.stringify({ 
          ok: false, 
          code: 'WHISPER_ERROR',
          message: 'Speech-to-text failed',
          details: errorText
        }), {
          status: whisperResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const whisperResult = await whisperResponse.json();
      const transcriptionTime = performance.now() - startTime;
      
      console.log(`✅ ASR completed in ${transcriptionTime.toFixed(0)}ms`);
      console.log('📝 Transcript:', whisperResult.text);

      return new Response(JSON.stringify({ 
        ok: true, 
        text: whisperResult.text,
        durationMs: transcriptionTime.toFixed(0)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle JSON requests (chat mode)
    const body = await req.json();
    
    if (body.mode === 'chat' && body.transcript) {
      console.log('🧠 Starting LLM generation...');
      const startTime = performance.now();

      const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14', // Use reliable GPT-4.1 model
          messages: [
            { 
              role: 'system', 
              content: 'You are a helpful voice coach AI assistant. Provide concise, encouraging responses to help users improve their communication skills. Keep responses brief and actionable.' 
            },
            { role: 'user', content: body.transcript }
          ],
          max_tokens: 150,
          temperature: 0.7
        }),
      });

      if (!chatResponse.ok) {
        const errorText = await chatResponse.text();
        console.error('❌ OpenAI chat error:', errorText);
        return new Response(JSON.stringify({ 
          ok: false, 
          code: 'CHAT_ERROR',
          message: 'Failed to generate response',
          details: errorText
        }), {
          status: chatResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const chatResult = await chatResponse.json();
      const generationTime = performance.now() - startTime;
      
      console.log(`✅ LLM completed in ${generationTime.toFixed(0)}ms`);

      return new Response(JSON.stringify({ 
        ok: true, 
        text: chatResult.choices[0].message.content,
        durationMs: generationTime.toFixed(0)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Invalid request
    return new Response(JSON.stringify({ 
      ok: false, 
      code: 'INVALID_REQUEST',
      message: 'Invalid request format' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Voice turn error:', error);
    return new Response(JSON.stringify({ 
      ok: false, 
      code: 'INTERNAL_ERROR',
      message: error.message,
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});