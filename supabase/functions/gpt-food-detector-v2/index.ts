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
    const { image_base64 } = await req.json();
    
    if (!image_base64) {
      throw new Error('image_base64 is required');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    console.log('[GPT-V2] Starting food detection with structured output...');

    // Enhanced system prompt for structured food detection
    const systemPrompt = `You are a nutrition vision assistant. Identify edible food items visible on the plate(s).

Rules:
- Never include containers or table settings (plate, bowl, dish, tray, table, tableware, cutlery, fork, knife, spoon, chopsticks, napkin, placemat, glass, cup)
- Use generic food names only (no brands, no SKUs)  
- Prefer specific mains/proteins (e.g., "grilled salmon", "chicken breast")
- Include obvious meal components: protein, vegetables, carbs, fruits, fats
- Avoid condiments unless they dominate the plate
- For mixed salad, return "salad" as a single item (not lettuce/tomato separately) unless a single veg clearly dominates
- If unsure about an item, omit it

Categories: protein, vegetable, fruit, grain, dairy, fat_oil, sauce_condiment

REJECT these words completely: plate, dish, bowl, cup, glass, cutlery, fork, knife, spoon, table, napkin, packaging, label, can, jar, bottle, packet, wrapper, syrup, curd, ketchup, cookie, snack bar, cereal bar, candy

Return strict JSON only:
{
  "items": [
    {
      "name": "string-lowercase", 
      "category": "protein|vegetable|fruit|grain|dairy|fat_oil|sauce_condiment",
      "confidence": 0.0_to_1.0,
      "portion_hint": "string|null"
    }
  ]
}

Example for salmon plate:
{
  "items": [
    {"name": "salmon", "category": "protein", "confidence": 0.95, "portion_hint": "palm-sized filet"},
    {"name": "asparagus", "category": "vegetable", "confidence": 0.92, "portion_hint": "~6 spears"},
    {"name": "salad", "category": "vegetable", "confidence": 0.88, "portion_hint": "side salad"},
    {"name": "lemon wedge", "category": "fruit", "confidence": 0.8, "portion_hint": "1 wedge"}
  ]
}

1-6 items max. No duplicates. No containers. Omit uncertain items.`;

    const userPrompt = "Return strict JSON with detected food items:";

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
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
                  url: image_base64.startsWith('data:') ? image_base64 : `data:image/jpeg;base64,${image_base64}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        temperature: 0,
        max_tokens: 200,
        top_p: 1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GPT-V2] OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('[GPT-V2] No content in OpenAI response');
      return new Response(JSON.stringify({
        items: [],
        _debug: { from: 'gpt-v2', error: 'no_content' }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse JSON response
    let parsedResult;
    try {
      parsedResult = JSON.parse(content);
    } catch (parseError) {
      console.error('[GPT-V2] Failed to parse JSON:', content);
      return new Response(JSON.stringify({
        items: [],
        _debug: { from: 'gpt-v2', error: 'json_parse_error', raw_content: content }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const items = parsedResult.items || [];
    
    console.log(`[GPT-V2] Detected ${items.length} items:`, items.map(i => i.name));

    return new Response(JSON.stringify({
      items,
      model: 'gpt-4o',
      _debug: { 
        from: 'gpt-v2', 
        count: items.length,
        raw_tokens: data.usage?.total_tokens || 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[GPT-V2] Error:', error);
    
    return new Response(JSON.stringify({
      items: [],
      error: error.message,
      _debug: { from: 'gpt-v2', error: 'exception' }
    }), {
      status: 200, // Return 200 to avoid breaking the UI
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});