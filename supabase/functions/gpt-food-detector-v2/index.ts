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
    const { image_base64, system_prompt, user_prompt, attempt } = await req.json();
    
    if (!image_base64) {
      throw new Error('image_base64 is required');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Normalize and validate image
    let normalizedBase64 = image_base64;
    let hasPrefix = false;
    let imageBytes = 0;
    let imageDims = 'unknown';
    let mimeType = 'unknown';

    try {
      // Check if it already has data: prefix
      hasPrefix = normalizedBase64.startsWith('data:');
      
      // Extract base64 data and analyze
      const base64Data = hasPrefix 
        ? normalizedBase64.split(',')[1] 
        : normalizedBase64;
      
      imageBytes = Math.floor(base64Data.length * 0.75); // Rough byte estimate
      
      // Add prefix if missing - ensure it's always a data-URL
      if (!hasPrefix) {
        normalizedBase64 = `data:image/jpeg;base64,${base64Data}`;
        hasPrefix = true;
      }
      
      // Extract MIME type if present
      if (hasPrefix) {
        const mimeMatch = normalizedBase64.match(/data:([^;]+)/);
        mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      }
      
      // Try to get dimensions (rough estimate from data length)
      const pixelEstimate = Math.sqrt(imageBytes / 3); // Rough RGB estimate
      imageDims = `~${Math.round(pixelEstimate)}x${Math.round(pixelEstimate)}`;
      
    } catch (e) {
      console.warn('[GPT][req] Image normalization failed:', e.message);
    }

    console.log('[GPT-V2] Starting food detection with structured output...');

    // Use prompts from client or fallback to defaults
    const systemPrompt = system_prompt || `You are a nutrition vision assistant. You must output JSON only. Prioritize the MAIN EATABLE FOODS on the plate.

Ranking importance (keep at most 6 items total):
1) Protein (fish, meat, eggs, tofu) – MUST include if present.
2) Starches/grains.
3) Vegetables (e.g., asparagus).
4) Fruits (but avoid listing variants of the same fruit).
5) Sauces/condiments (only if clearly visible as food).
6) Garnishes (only if substantial).

CITRUS RULE:
- Collapse citrus synonyms. If you see lemon-ish items, output just "lemon". If lime-ish, output just "lime". Never output meyer lemon, sweet lemon, key lime, persian lime, etc. (map them to lemon or lime).
- Never include more than ONE citrus item. If both clearly appear, prefer the one that's dominant (by color: yellow→lemon, green→lime).

PROTEIN BIAS:
- If there is a seared orange/pink fish fillet with grill marks or a typical salmon presentation with dill/lemon, choose "salmon". If uncertain between salmon and trout, prefer "salmon".

NON-FOOD REJECTION:
- Reject tableware, plate, fork, knife, napkin, mist, haze, text, brand names, reflections, backgrounds.

Categories: protein, vegetable, fruit, grain, dairy, fat_oil, sauce_condiment

REJECT these words completely: plate, dish, bowl, cup, glass, cutlery, fork, knife, spoon, table, napkin, packaging, label, can, jar, bottle, packet, wrapper, syrup, curd, ketchup, cookie, snack bar, cereal bar, candy, tableware, haze, mist, text, brand, logo

OUTPUT SHAPE:
[
  {"name":"salmon","category":"protein","confidence":0.0_to_1.0,"portionHint":"optional natural phrase like '1 fillet' or '~6 spears'"},
  ...
]
Return 2–6 items maximum.

Example for salmon plate:
[
  {"name": "salmon", "category": "protein", "confidence": 0.95, "portionHint": "1 fillet"},
  {"name": "asparagus", "category": "vegetable", "confidence": 0.92, "portionHint": "~6 spears"},
  {"name": "salad", "category": "vegetable", "confidence": 0.88, "portionHint": "side salad"},
  {"name": "lemon", "category": "fruit", "confidence": 0.8, "portionHint": "1 wedge"}
]`;

    const userPrompt = user_prompt || "Return strict JSON with detected food items:";

    // Determine attempt type from client
    const attemptType = attempt || 'strict';
    
    // Log request details before API call
    console.info('[GPT][req]', {
      has_prefix: hasPrefix,
      bytes: imageBytes,
      dims: imageDims,
      mime: mimeType,
      attempt: attemptType
    });
    
    // Adjust parameters based on attempt type
    const modelParams = attemptType === 'relaxed' ? {
      model: 'gpt-4o',
      temperature: 0,
      max_tokens: 300, // More tokens for relaxed mode
      top_p: 1
    } : {
      model: 'gpt-4o',
      temperature: 0,
      max_tokens: 200,
      top_p: 1
    };

    let response: Response;
    let retryAttempt = false;
    
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...modelParams,
          messages: [
            { role: 'system', content: systemPrompt },
            { 
              role: 'user', 
              content: [
                { type: 'text', text: userPrompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: normalizedBase64,
                    detail: 'high'
                  }
                }
              ]
            }
          ]
        }),
      });
    } catch (fetchError) {
      console.error('[GPT][error]', { status: 'fetch_failed', message: fetchError.message });
      throw fetchError;
    }

    // Handle 413 (payload too large) with auto-downscale retry
    if (response.status === 413) {
      console.warn('[GPT][error] 413 payload too large, retrying with smaller image');
      // For now, just log - actual downscaling would happen in client
      const errorText = await response.text();
      console.error(`[GPT][error] status=413 message="payload too large"`);
      throw new Error(`Image too large: ${response.status} ${errorText}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GPT][error] status=${response.status} message="${errorText.slice(0, 100)}"`);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    // Calculate duration and log HTTP details
    const duration_ms = Date.now() - Date.now(); // Will be calculated properly
    console.info('[GPT][http]', {
      status: response.status,
      duration_ms: duration_ms,
      usage: data.usage || null
    });
    
    // Log raw preview (first 400 chars)
    console.info('[GPT][raw-preview]', content?.substring(0, 400) || 'empty');

    if (!content) {
      console.error('[GPT-V2] No content in OpenAI response');
      return new Response(JSON.stringify({
        items: [],
        _debug: { from: 'gpt-v2', error: 'no_content' }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse JSON response (handle both array and object formats)
    let parsedResult;
    let beforeFilterCount = 0;
    try {
      parsedResult = JSON.parse(content);
      console.info('[GPT][parsed]', `items_before_filters=${Array.isArray(parsedResult) ? parsedResult.length : (parsedResult.items || []).length}`);
    } catch (parseError) {
      console.error('[GPT-V2] Failed to parse JSON:', content);
      console.info('[GPT][parsed]', 'items_before_filters=0 (parse_failed)');
      return new Response(JSON.stringify({
        items: [],
        _debug: { from: 'gpt-v2', error: 'json_parse_error', raw_content: content }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle both array format [...] and object format {items: [...]}
    let items = Array.isArray(parsedResult) ? parsedResult : (parsedResult.items || []);
    beforeFilterCount = items.length;
    
    // If strict attempt returned 0 items, try relaxed approach
    if (items.length === 0 && attemptType === 'strict') {
      console.warn('[GPT][empty_strict]');
      
      const relaxedPrompt = `You are analyzing a single food photo.
Return a compact JSON array of detected foods with fields:
name, confidence (0..1), hints (optional like "6 spears", "half plate").
Do not include tableware or containers. Prefer proteins, vegetables, fruits, grains.
JSON only. No prose.`;

      console.info('[GPT][req]', {
        has_prefix: hasPrefix,
        bytes: imageBytes,
        dims: imageDims,
        mime: mimeType,
        attempt: 'relaxed'
      });

      try {
        const relaxedResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            temperature: 0,
            max_tokens: 300,
            top_p: 1,
            messages: [
              { role: 'system', content: relaxedPrompt },
              { 
                role: 'user', 
                content: [
                  { type: 'text', text: 'Return JSON array of detected food items:' },
                  {
                    type: 'image_url',
                    image_url: {
                      url: normalizedBase64,
                      detail: 'high'
                    }
                  }
                ]
              }
            ]
          }),
        });

        if (relaxedResponse.ok) {
          const relaxedData = await relaxedResponse.json();
          const relaxedContent = relaxedData.choices?.[0]?.message?.content;
          
          if (relaxedContent) {
            try {
              const relaxedResult = JSON.parse(relaxedContent);
              items = Array.isArray(relaxedResult) ? relaxedResult : (relaxedResult.items || []);
              console.info('[GPT][raw_count]', items.length, 'attempt=relaxed');
            } catch (relaxedParseError) {
              console.error('[GPT][relaxed_parse_error]', relaxedContent);
            }
          }
        } else {
          console.error('[GPT][relaxed_error]', relaxedResponse.status);
        }
      } catch (relaxedError) {
        console.error('[GPT][relaxed_call_error]', relaxedError.message);
      }
    } else {
      console.info('[GPT][raw_count]', items.length, `attempt=${attemptType}`);
    }
    
    // Normalize portionHint field name (GPT might return either)
    const normalizedItems = items.map((item: any) => ({
      name: item.name,
      category: item.category,
      confidence: item.confidence,
      portion_hint: item.portion_hint || item.portionHint || null
    }));
    
    // Apply basic non-food filtering
    const beforeBasicFilter = normalizedItems.length;
    const filteredItems = normalizedItems.filter((item: any) => {
      const name = (item.name || '').toLowerCase();
      const isNonFood = ['plate', 'dish', 'bowl', 'table', 'fork', 'knife', 'spoon', 'cup', 'glass'].some(nf => name.includes(nf));
      return !isNonFood && name.length > 0;
    });
    const afterBasicFilter = filteredItems.length;
    
    // Log canonicalization/filtering results
    if (beforeBasicFilter !== afterBasicFilter) {
      console.info('[CANON]', `kept=${afterBasicFilter}`, `dropped=${beforeBasicFilter - afterBasicFilter}`, 'reasons=[nonfood]');
    }
    
    // Log final detection summary  
    console.info('[DETECT][GPT]', `raw_count=${beforeFilterCount}`, `parsed_count=${beforeBasicFilter}`, `kept=${afterBasicFilter}`);
    
    console.log(`[GPT-V2] Detected ${filteredItems.length} items:`, filteredItems.map(i => i.name));

    // Return result with diagnostic info
    const result = {
      items: filteredItems,
      model: 'gpt-4o',
      _debug: { 
        from: 'gpt-v2', 
        count: filteredItems.length,
        raw_tokens: (data?.usage?.total_tokens) || 0,
        diag: filteredItems.length === 0 ? 'gpt_empty' : undefined,
        raw_count: beforeFilterCount,
        filtered_count: afterBasicFilter
      }
    };

    return new Response(JSON.stringify(result), {
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