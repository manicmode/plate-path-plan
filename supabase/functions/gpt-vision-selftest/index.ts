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
    // Only allow in non-production environments
    const isProduction = Deno.env.get('NODE_ENV') === 'production';
    if (isProduction) {
      return new Response(JSON.stringify({
        error: 'Self-test endpoint disabled in production'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('Missing OPENAI_API_KEY');
    }

    console.info('[SELFTEST] Starting GPT vision self-test...');

    // Use a known test image (salmon and asparagus plate)
    // This is a public domain test image for diagnostic purposes
    const testImageUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAoACgDASIAAhEBAxEB/8QAGwAAAQUBAQAAAAAAAAAAAAAAAAIDBAUGB//EAC0QAAIBAgUCBAYDAAAAAAAAAAECEQADBBIhMQVBBhMiUWFxgZGhscHwFDLR/8QAGAEAAwEBAAAAAAAAAAAAAAAAAAECAwT/xAAeEQACAgIDAQEAAAAAAAAAAAABAgARAyESMUFhIv/aAAwDAQACEQMRAD8A6NieoYfCdY6b01cVnxTlC2jW7TXCJJCqI1J9KPxx1aeIPs+IHlx9pd8N9Pw1y6xsKGCJvW3l1Y/cjfvRI6lZRyLVtB9K2ct8WeFcFjGAu2hcKBFxDqI3+3PrqtrD4bDeGLN+3h7aWrbXDGQaaHnU+hr';

    const systemPrompt = `You are a food identification assistant. Return a JSON array of detected food items with name, category, and confidence fields.`;
    
    const userPrompt = 'What food items can you identify in this image? Return JSON array format.';

    const startTime = Date.now();
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: userPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: testImageUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 300,
        temperature: 0.1
      }),
    });

    const elapsed_ms = Date.now() - startTime;
    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    
    let parsedNames = [];
    try {
      const parsed = JSON.parse(rawContent);
      parsedNames = Array.isArray(parsed) ? parsed.map(item => item.name || item) : [];
    } catch (parseError) {
      // Try to extract food names from text if JSON parsing fails
      const foodKeywords = ['salmon', 'asparagus', 'fish', 'vegetable', 'lemon', 'plate'];
      parsedNames = foodKeywords.filter(keyword => 
        rawContent.toLowerCase().includes(keyword)
      );
    }

    const result = {
      ok: response.ok,
      status: response.status,
      t_ms: elapsed_ms,
      raw_first300: rawContent.substring(0, 300),
      parsed_names: parsedNames,
      usage: data.usage || null,
      model: 'gpt-4o'
    };

    console.info('[SELFTEST]', {
      status: response.status,
      t_ms: elapsed_ms,
      names: parsedNames,
      raw_length: rawContent.length
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[SELFTEST] Error:', error);
    return new Response(JSON.stringify({
      ok: false,
      error: error.message,
      t_ms: 0,
      raw_first300: '',
      parsed_names: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});