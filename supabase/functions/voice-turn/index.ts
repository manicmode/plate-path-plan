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
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.error('[voice-turn] Missing OPENAI_API_KEY');
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: 'OpenAI API key not configured',
          code: 'missing_openai_key'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const contentType = req.headers.get('content-type') || '';
    
    // Handle FormData (audio upload)
    if (contentType.includes('multipart/form-data')) {
      console.log('[voice-turn] Processing audio upload');
      
      const formData = await req.formData();
      const audioFile = formData.get('audio') as File;
      
      if (!audioFile) {
        throw new Error('No audio file provided');
      }

      // Check file size (20MB limit)
      if (audioFile.size > 20 * 1024 * 1024) {
        throw new Error('Audio file too large (max 20MB)');
      }

      console.log('[voice-turn] Audio file received:', audioFile.size, 'bytes, type:', audioFile.type);

      // Transcribe with OpenAI Whisper
      const transcriptionFormData = new FormData();
      transcriptionFormData.append('file', audioFile);
      transcriptionFormData.append('model', 'whisper-1');
      transcriptionFormData.append('response_format', 'json');

      const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: transcriptionFormData,
      });

      if (!transcriptionResponse.ok) {
        const errorText = await transcriptionResponse.text();
        console.error('[voice-turn] Transcription error:', errorText);
        throw new Error(`Transcription failed: ${transcriptionResponse.status} ${transcriptionResponse.statusText}`);
      }

      const transcriptionResult = await transcriptionResponse.json();
      const transcriptionText = transcriptionResult.text?.trim();
      
      // Check for empty transcription, but allow very short valid words
      if (!transcriptionText || transcriptionText.length === 0) {
        console.log('[voice-turn] No speech detected, transcript:', transcriptionText);
        return new Response(
          JSON.stringify({ 
            ok: false, 
            code: 'no_speech',
            error: 'No speech detected in audio'
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      console.log('[voice-turn] Transcription successful:', { 
        text: transcriptionText, 
        length: transcriptionText.length 
      });

      // Generate AI response
      const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            {
              role: 'system',
              content: `You are a helpful wellness coach AI assistant. Provide brief, encouraging, and actionable wellness advice. Keep responses conversational and under 100 words. Focus on nutrition, fitness, mental health, and healthy habits.`
            },
            {
              role: 'user',
              content: transcriptionText
            }
          ],
          max_tokens: 150,
          temperature: 0.7,
        }),
      });

      if (!chatResponse.ok) {
        const chatError = await chatResponse.text();
        console.error('[voice-turn] Chat completion error:', chatError);
        throw new Error(`Chat completion failed: ${chatResponse.status}`);
      }

      const chatResult = await chatResponse.json();
      const aiReply = chatResult.choices?.[0]?.message?.content?.trim() || 'I hear you! How can I help with your wellness journey?';

      console.log('[voice-turn] AI response generated:', aiReply);

      return new Response(
        JSON.stringify({
          ok: true,
          text: transcriptionText,
          reply: aiReply,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle JSON (chat mode)
    const { transcript, mode } = await req.json();
    
    if (mode === 'chat' && transcript) {
      console.log('[voice-turn] Processing chat mode for transcript:', transcript);
      
      // Generate AI response for existing transcript
      const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            {
              role: 'system',
              content: `You are a helpful wellness coach AI assistant. Provide brief, encouraging, and actionable wellness advice. Keep responses conversational and under 100 words. Focus on nutrition, fitness, mental health, and healthy habits.`
            },
            {
              role: 'user',
              content: transcript
            }
          ],
          max_tokens: 150,
          temperature: 0.7,
        }),
      });

      if (!chatResponse.ok) {
        const chatError = await chatResponse.text();
        console.error('[voice-turn] Chat completion error:', chatError);
        throw new Error(`Chat completion failed: ${chatResponse.status}`);
      }

      const chatResult = await chatResponse.json();
      const aiReply = chatResult.choices?.[0]?.message?.content?.trim() || 'I hear you! How can I help with your wellness journey?';

      return new Response(
        JSON.stringify({
          ok: true,
          text: aiReply,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    throw new Error('Invalid request format');

  } catch (error) {
    console.error('[voice-turn] Error:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message || 'Unknown error',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});