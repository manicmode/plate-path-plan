
// Redeploy triggered for voice debugging at 2025-01-29T13:30:00Z - Enhanced error handling

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[Voice-to-Text] Function called, checking request...');
    console.log('[Voice-to-Text] Request method:', req.method);
    console.log('[Voice-to-Text] Request headers:', JSON.stringify(Object.fromEntries(req.headers.entries())));
    
    // Log all available environment variables for debugging
    console.log('[Voice-to-Text] Available env vars:', Object.keys(Deno.env.toObject()));
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    console.log('[Voice-to-Text] OPENAI_API_KEY exists:', !!OPENAI_API_KEY);
    console.log('[Voice-to-Text] OPENAI_API_KEY length:', OPENAI_API_KEY?.length || 0);
    console.log('[Voice-to-Text] OPENAI_API_KEY starts with sk-:', OPENAI_API_KEY?.startsWith('sk-') || false);
    
    if (!OPENAI_API_KEY) {
      console.error('[Voice-to-Text] OpenAI API key not configured in environment');
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key not configured', 
          details: 'OPENAI_API_KEY environment variable is missing' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const requestBody = await req.json();
    const { audio } = requestBody;
    
    if (!audio) {
      console.error('[Voice-to-Text] No audio data provided in request body');
      console.log('[Voice-to-Text] Request body keys:', Object.keys(requestBody));
      return new Response(
        JSON.stringify({ 
          error: 'No audio data provided', 
          details: 'Audio field is missing from request body' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[Voice-to-Text] Audio data received, length:', audio.length);
    console.log('[Voice-to-Text] Audio data preview (first 50 chars):', audio.substring(0, 50));

    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio);
    
    // Prepare form data
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');

    console.log('[Voice-to-Text] Sending to OpenAI Whisper...');
    console.log('[Voice-to-Text] Blob size:', blob.size);
    console.log('[Voice-to-Text] Blob type:', blob.type);

    // Send to OpenAI Whisper with enhanced error handling
    let response;
    try {
      response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      });
      
      console.log('[Voice-to-Text] OpenAI response received');
      console.log('[Voice-to-Text] OpenAI response status:', response.status);
      console.log('[Voice-to-Text] OpenAI response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));
      
    } catch (fetchError) {
      console.error('[Voice-to-Text] Fetch error when calling OpenAI:', fetchError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to connect to OpenAI', 
          details: fetchError.message 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Voice-to-Text] OpenAI API error response:', errorText);
      
      // Parse error for better debugging
      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = errorJson.error?.message || errorText;
        console.error('[Voice-to-Text] Parsed OpenAI error:', errorJson);
      } catch (parseError) {
        console.error('[Voice-to-Text] Could not parse OpenAI error response');
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI Whisper call failed', 
          details: errorDetails,
          status: response.status 
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const result = await response.json();
    console.log('[Voice-to-Text] Transcription successful');
    console.log('[Voice-to-Text] Transcription result:', result);

    if (!result.text) {
      console.error('[Voice-to-Text] No text in transcription result');
      return new Response(
        JSON.stringify({ 
          error: 'No transcription text returned', 
          details: 'OpenAI returned empty transcription' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ text: result.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Voice-to-Text] Unexpected error in function:', error);
    console.error('[Voice-to-Text] Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: 'Voice transcription failed', 
        details: error.message,
        type: error.name || 'UnknownError'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
