import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const corsHeadersJson = { ...corsHeaders, 'Content-Type': 'application/json' };

function normalizeItems(raw: any[]): Array<{name:string, confidence:number, category:string, portion_hint?:string|null}> {
  if (!Array.isArray(raw)) return [];
  return raw.map((it:any) => ({
    name: it?.name ?? it?.food_name ?? it?.item_name ?? 'Unknown',
    confidence: typeof it?.confidence === 'number' ? it.confidence : (typeof it?.conf === 'number' ? it.conf : 0.8),
    category: it?.category ?? it?.food_category ?? 'unknown',
    portion_hint: it?.portion_hint ?? it?.hint ?? it?.hints ?? null,
  }));
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image_base64, system_prompt, user_prompt, attempt } = await req.json();
    
    // Generate request ID for tracing
    const requestId = `gpt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.info('[GPT][trace]', { request_id: requestId, timestamp: new Date().toISOString() });
    
    if (!image_base64) {
      throw new Error('image_base64 is required');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Log configuration details
    const keyTail = openaiApiKey.slice(-6);
    console.info('[GPT][cfg]', {
      model: 'gpt-4o',
      key_tail: `******${keyTail}`,
      request_id: requestId
    });

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
    
    // Generate image hash for tracing (simple hash of first 100 chars of base64)
    const imageHash = normalizedBase64.slice(0, 100).split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0).toString(16);

    // Calculate actual decoded byte size for diagnostics
    const base64Data = hasPrefix ? normalizedBase64.split(',')[1] : normalizedBase64;
    const decodedLength = Math.floor(base64Data.length * 3 / 4);
    
    // Log image payload details
    console.info('[GPT][img]', {
      request_id: requestId,
      bytes: decodedLength,
      prefixOk: hasPrefix,
      mime: mimeType,
      b64_length: base64Data.length
    });
    
    // **CRITICAL**: Ensure proper data URL format for OpenAI vision API
    if (!hasPrefix || !normalizedBase64.startsWith('data:image/')) {
      console.warn('[GPT][img] Fixing missing/invalid data URL prefix');
      normalizedBase64 = `data:image/jpeg;base64,${base64Data}`;
      hasPrefix = true;
    }
    
    // Log request details before API call
    console.info('[GPT][req]', {
      request_id: requestId,
      image_hash: imageHash,
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
    const startTime = Date.now();
    
    try {
      // **CRITICAL**: Use proper vision content structure for OpenAI API
      const visionContent = [
        { 
          type: 'text', 
          text: userPrompt 
        },
        {
          type: 'image_url',
          image_url: {
            url: normalizedBase64,
            detail: 'high'
          }
        }
      ];

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
              content: visionContent
            }
          ]
        }),
      });
      
      const elapsed_ms = Date.now() - startTime;
      
      if (response.ok) {
        console.info('[GPT][http]', {
          request_id: requestId,
          image_hash: imageHash,
          status: response.status,
          t_ms: elapsed_ms
        });
      } else {
        const errorBody = await response.text();
        console.error('[GPT][err]', {
          request_id: requestId,
          image_hash: imageHash,
          status: response.status,
          body: errorBody.substring(0, 300)
        });
        
        // Return structured error instead of throwing
        return new Response(JSON.stringify({
          items: [],
          _debug: { 
            from: 'gpt-v2', 
            error: 'http_error',
            status: response.status,
            body_preview: errorBody.substring(0, 100),
            request_id: requestId,
            image_hash: imageHash
          }
        }), {
          status: 200, // Return 200 to avoid breaking UI
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (fetchError) {
      const elapsed_ms = Date.now() - startTime;
      console.error('[GPT][err]', {
        request_id: requestId,
        image_hash: imageHash,
        status: 'fetch_failed',
        message: fetchError.message,
        t_ms: elapsed_ms
      });
      
      // Return structured error instead of throwing
      return new Response(JSON.stringify({
        items: [],
        _debug: { 
          from: 'gpt-v2', 
          error: 'fetch_failed',
          message: fetchError.message,
          request_id: requestId,
          image_hash: imageHash
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle 413 (payload too large) with auto-downscale retry
    if (response.status === 413) {
      const elapsed_ms = Date.now() - startTime;
      console.warn('[GPT][err]', {
        request_id: requestId,
        image_hash: imageHash,
        status: 413,
        message: 'payload too large',
        t_ms: elapsed_ms
      });
      
      return new Response(JSON.stringify({
        items: [],
        _debug: { 
          from: 'gpt-v2', 
          error: 'payload_too_large',
          request_id: requestId,
          image_hash: imageHash
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    // **DIAGNOSTIC**: Log raw content before any parsing  
    console.info('[GPT][raw]', {
      request_id: requestId,
      image_hash: imageHash,
      len: content?.length || 0,
      sample: content?.substring(0, 200) || 'null'
    });
    
    // Calculate duration and log HTTP details
    const duration_ms = Date.now() - startTime;
    console.info('[GPT][http]', {
      request_id: requestId,
      image_hash: imageHash,
      status: response.status,
      duration_ms: duration_ms,
      usage: data.usage || null
    });
    
    // **CRITICAL DIAGNOSTIC LOG**: Log the FULL raw GPT response before any parsing
    console.info('[GPT][raw_response]', {
      request_id: requestId,
      image_hash: imageHash,
      full_content: content || 'null',
      content_length: content?.length || 0,
      content_type: typeof content,
      has_choices: !!data.choices?.length,
      model_used: data.model || 'unknown'
    });
    
    // Also log raw preview (first 400 chars) for quick scanning
    console.info('[GPT][raw-preview]', content?.substring(0, 400) || 'empty');

    if (!content) {
      console.error('[GPT-V2] No content in OpenAI response', {
        request_id: requestId,
        image_hash: imageHash,
        response_structure: Object.keys(data),
        choices_length: data.choices?.length || 0
      });
      return new Response(JSON.stringify({
        items: [],
        _debug: { 
          from: 'gpt-v2', 
          error: 'no_content',
          request_id: requestId,
          image_hash: imageHash
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // **PARSING STARTS HERE** - Log before parsing begins
    console.info('[GPT][parse_start]', {
      request_id: requestId,
      image_hash: imageHash,
      raw_content_preview: content.substring(0, 200),
      about_to_parse: true
    });
    
    // Parse JSON response (handle both array and object formats)
    let parsedResult;
    let beforeFilterCount = 0;
    try {
      parsedResult = JSON.parse(content);
      const itemCount = Array.isArray(parsedResult) ? parsedResult.length : (parsedResult.items || []).length;
      console.info('[GPT][parsed]', {
        request_id: requestId,
        image_hash: imageHash,
        items_before_filters: itemCount,
        parse_success: true,
        parsed_type: Array.isArray(parsedResult) ? 'array' : 'object'
      });
    } catch (parseError) {
      console.error('[GPT-V2] Failed to parse JSON:', {
        request_id: requestId,
        image_hash: imageHash,
        error: parseError.message,
        raw_content: content,
        parse_success: false
      });
      console.info('[GPT][parsed]', {
        request_id: requestId,
        image_hash: imageHash,
        items_before_filters: 0,
        parse_success: false,
        error: 'parse_failed'
      });
      return new Response(JSON.stringify({
        items: [],
        _debug: { 
          from: 'gpt-v2', 
          error: 'json_parse_error', 
          raw_content: content,
          request_id: requestId,
          image_hash: imageHash
        }
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
          
          // Log relaxed attempt raw response as well
          console.info('[GPT][relaxed_raw_response]', {
            request_id: requestId,
            image_hash: imageHash,
            full_content: relaxedContent || 'null',
            content_length: relaxedContent?.length || 0,
            attempt: 'relaxed'
          });
          
          if (relaxedContent) {
            try {
              const relaxedResult = JSON.parse(relaxedContent);
              items = Array.isArray(relaxedResult) ? relaxedResult : (relaxedResult.items || []);
              
              // Normalize relaxed attempt items
              const normalizedRelaxed = normalizeItems(items);
              
              console.info('[GPT][raw_count]', {
                request_id: requestId,
                image_hash: imageHash,
                count: normalizedRelaxed.length,
                attempt: 'relaxed'
              });
              
              // Return normalized relaxed result immediately
              return new Response(JSON.stringify({
                items: normalizedRelaxed,
                _debug: {
                  raw_items: items,
                  count: normalizedRelaxed.length,
                  request_id: requestId,
                  image_hash: imageHash,
                  attempt: 'relaxed'
                }
              }), { status: 200, headers: corsHeadersJson });
              
            } catch (relaxedParseError) {
              console.error('[GPT][relaxed_parse_error]', {
                request_id: requestId,
                image_hash: imageHash,
                error: relaxedParseError.message,
                raw_content: relaxedContent
              });
            }
          }
        } else {
          console.error('[GPT][relaxed_error]', {
            request_id: requestId,
            image_hash: imageHash,
            status: relaxedResponse.status
          });
        }
      } catch (relaxedError) {
        console.error('[GPT][relaxed_call_error]', relaxedError.message);
      }
    } else {
      console.info('[GPT][raw_count]', {
        request_id: requestId,
        image_hash: imageHash,
        count: items.length,
        attempt: attemptType
      });
    }
    
    // Normalize items using the canonical helper
    const normalized = normalizeItems(items);
    
    // Apply basic non-food filtering
    const beforeBasicFilter = normalized.length;
    const filteredItems = normalized.filter((item: any) => {
      const name = (item.name || '').toLowerCase();
      const isNonFood = ['plate', 'dish', 'bowl', 'table', 'fork', 'knife', 'spoon', 'cup', 'glass'].some(nf => name.includes(nf));
      return !isNonFood && name.length > 0;
    });
    const afterBasicFilter = filteredItems.length;
    
    // Log canonicalization/filtering results
    if (beforeBasicFilter !== afterBasicFilter) {
      console.info('[CANON]', {
        request_id: requestId,
        image_hash: imageHash,
        kept: afterBasicFilter,
        dropped: beforeBasicFilter - afterBasicFilter,
        reasons: ['nonfood']
      });
    }
    
    // Log final detection summary  
    console.info('[DETECT][GPT]', {
      request_id: requestId,
      image_hash: imageHash,
      raw_count: beforeFilterCount,
      parsed_count: beforeBasicFilter,
      kept: afterBasicFilter,
      final_items: filteredItems.map(i => i.name)
    });
    
    console.log(`[GPT-V2] Final result for ${requestId}:`, filteredItems.length, 'items:', filteredItems.map(i => i.name));

    return new Response(JSON.stringify({
      items: filteredItems,
      _debug: {
        raw_items: items,
        count: filteredItems.length,
        request_id: requestId,
        image_hash: imageHash,
        attempt: attemptType
      }
    }), { status: 200, headers: corsHeadersJson });

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