import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { image_b64, test_case } = await req.json();
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    const diagnostics = {
      stage: 'start',
      has_key: !!openAIApiKey,
      test_case,
      timestamp: new Date().toISOString()
    };

    if (!openAIApiKey) {
      return new Response(JSON.stringify({ 
        ...diagnostics, 
        stage: 'error',
        message: 'Missing OPENAI_API_KEY' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.info('[DIAG] Starting diagnostic test:', test_case);

    let requestBody: any;
    let startTime = Date.now();

    if (test_case === 'hello') {
      requestBody = {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: 'Return exactly {"ok":true} as JSON.' }
        ],
        response_format: { type: "json_object" },
        max_tokens: 50
      };
    } else if (test_case === 'image') {
      // Sanitize base64 input
      const content = (image_b64 || "").split(",").pop();
      if (!content) {
        throw new Error('Invalid image data');
      }

      const imageBytes = content.length;
      const imageMime = image_b64?.includes('data:image/') ? 
        image_b64.split(';')[0].split(':')[1] : 'unknown';

      requestBody = {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a food identification assistant. Return a JSON array of detected food items.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'What food items can you identify in this image? Return JSON array format.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${content}`,
                  detail: 'low'
                }
              }
            ]
          }
        ],
        max_tokens: 300,
        temperature: 0.1
      };

      diagnostics.image_bytes = imageBytes;
      diagnostics.image_mime = imageMime;
    } else {
      throw new Error('Invalid test_case. Use "hello" or "image"');
    }

    console.info('[DIAG] Calling OpenAI...', { 
      model: requestBody.model, 
      messages_count: requestBody.messages.length 
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const duration_ms = Date.now() - startTime;
    const data = await response.json();
    
    const result = {
      ...diagnostics,
      stage: 'openai_response',
      status: response.status,
      duration_ms,
      model: requestBody.model,
      usage: data.usage || null,
      raw_text: data.choices?.[0]?.message?.content?.substring(0, 2000) || null,
      error: !response.ok ? data : null
    };

    console.info('[DIAG] OpenAI response:', {
      status: response.status,
      duration_ms,
      content_length: result.raw_text?.length || 0
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[DIAG] Error:', error);
    
    const errorResult = {
      stage: 'error',
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 500) || null,
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(errorResult), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});