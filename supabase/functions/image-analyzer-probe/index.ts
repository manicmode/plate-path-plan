import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProbeResult {
  ok: boolean;
  provider_used: string;
  echo: {
    w: number;
    h: number;
    sha256: string;
    bytes: number;
  };
  google: {
    ocr_ok: boolean;
    ocr_chars: number;
    ocr_top_tokens: string[];
    logo_ok: boolean;
    logo_brands: Array<{name: string, score: number}>;
    errors: string[];
  };
  openai: {
    ok: boolean;
    model: string;
    brand_guess: string;
    confidence: number;
    raw_words: string[];
    errors: string[];
  };
  resolver: {
    off_ok: boolean;
    off_hits: number;
    usda_hits: number;
    picked: string;
    errors: string[];
  };
  decision: string;
  elapsed_ms: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const { imageBase64, dry_run, provider: requestProvider } = await req.json();
    
    // Provider toggle
    const provider = requestProvider ?? Deno.env.get('ANALYZER_PROVIDER') ?? 'hybrid';
    
    if (!imageBase64) {
      return new Response(JSON.stringify({ 
        ok: false, 
        errors: ["imageBase64 required"] 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('PROBE:start');

    // Check required secrets
    const googleApiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    const missingSecrets = [];
    if (!googleApiKey) missingSecrets.push('GOOGLE_VISION_API_KEY missing');
    if (!openaiApiKey) missingSecrets.push('OPENAI_API_KEY missing');
    
    if (missingSecrets.length > 0) {
      return new Response(JSON.stringify({
        ok: false,
        errors: missingSecrets
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Echo - image metadata
    const imageBuffer = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
    const hashBuffer = await crypto.subtle.digest('SHA-256', imageBuffer);
    const sha256 = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    // Simulate getting image dimensions (rough estimate from base64 length)
    const estimatedBytes = imageBase64.length * 0.75;
    const estimatedPixels = estimatedBytes / 3; // rough RGB estimate
    const estimatedDim = Math.sqrt(estimatedPixels);

    const probeResult: ProbeResult = {
      ok: true,
      provider_used: provider,
      echo: {
        w: Math.round(estimatedDim * 0.6), // aspect ratio guess
        h: Math.round(estimatedDim * 1.4),
        sha256: sha256.substring(0, 12),
        bytes: imageBuffer.length
      },
      google: {
        ocr_ok: false,
        ocr_chars: 0,
        ocr_top_tokens: [],
        logo_ok: false,
        logo_brands: [],
        errors: []
      },
      openai: {
        ok: false,
        model: 'gpt-4o',
        brand_guess: '',
        confidence: 0,
        raw_words: [],
        errors: []
      },
      resolver: {
        off_ok: false,
        off_hits: 0,
        usda_hits: 0,
        picked: '',
        errors: []
      },
      decision: 'none',
      elapsed_ms: 0
    };

    // Test Google Vision OCR (only if provider includes google)
    if (provider === 'google' || provider === 'hybrid') {
      try {
        console.log('PROBE:ocr:start');
      const visionResponse = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              image: { content: imageBase64 },
              features: [
                { type: 'TEXT_DETECTION', maxResults: 10 },
                { type: 'LOGO_DETECTION', maxResults: 10 }
              ]
            }]
          })
        }
      );

      if (!visionResponse.ok) {
        throw new Error(`Vision API ${visionResponse.status}: ${await visionResponse.text()}`);
      }

      const visionData = await visionResponse.json();
      const response = visionData.responses[0];

      if (response.error) {
        throw new Error(`Vision API error: ${response.error.message}`);
      }

      // OCR processing
      if (response.textAnnotations?.length > 0) {
        const fullText = response.textAnnotations[0].description || '';
        const tokens = fullText.toLowerCase()
          .split(/\s+/)
          .filter(t => t.length > 2)
          .slice(0, 20);
        
        probeResult.google.ocr_ok = true;
        probeResult.google.ocr_chars = fullText.length;
        probeResult.google.ocr_top_tokens = tokens;
        console.log(`PROBE:ocr:ok chars=${fullText.length} tokens=${tokens.length}`);
      } else {
        console.log('PROBE:ocr:empty');
      }

      // Logo processing
      if (response.logoAnnotations?.length > 0) {
        probeResult.google.logo_ok = true;
        probeResult.google.logo_brands = response.logoAnnotations.map((logo: any) => ({
          name: logo.description,
          score: Math.round(logo.score * 100) / 100
        }));
        console.log(`PROBE:logo:ok count=${probeResult.google.logo_brands.length}`);
      } else {
        console.log('PROBE:logo:empty');
      }

      } catch (error) {
        probeResult.google.errors.push(error.message);
        console.log(`PROBE:ocr:err ${error.message}`);
      }
    }

    // Test OpenAI Vision (only if provider includes openai)
    if (provider === 'openai' || provider === 'hybrid') {
      try {
        console.log('PROBE:openai:start');
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'What brand and product is this? Return JSON: {"brand": "BrandName", "product": "ProductName", "confidence": 0.85, "words": ["word1", "word2"]}'
              },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
              }
            ]
          }],
          max_tokens: 200
        })
      });

      if (!openaiResponse.ok) {
        throw new Error(`OpenAI API ${openaiResponse.status}: ${await openaiResponse.text()}`);
      }

      const openaiData = await openaiResponse.json();
      const content = openaiData.choices?.[0]?.message?.content;
      
      if (content) {
        try {
          const parsed = JSON.parse(content);
          probeResult.openai.ok = true;
          probeResult.openai.brand_guess = parsed.brand || '';
          probeResult.openai.confidence = parsed.confidence || 0;
          probeResult.openai.raw_words = parsed.words || [];
          console.log(`PROBE:openai:ok brand=${parsed.brand} conf=${parsed.confidence}`);
        } catch {
          probeResult.openai.errors.push('Invalid JSON response');
        }
      }

      } catch (error) {
        probeResult.openai.errors.push(error.message);
        console.log(`PROBE:openai:err ${error.message}`);
      }
    }

    // Test OFF resolver (mock)
    try {
      console.log('PROBE:resolve:off');
      const query = probeResult.google.ocr_top_tokens.slice(0, 3).join(' ') || 
                   probeResult.openai.brand_guess;
      
      if (query) {
        // Simulate OFF API call (replace with actual call)
        probeResult.resolver.off_ok = true;
        probeResult.resolver.off_hits = Math.floor(Math.random() * 10); // Mock
        probeResult.resolver.picked = query.length > 5 ? query : '';
        console.log(`PROBE:resolve:off query="${query}" hits=${probeResult.resolver.off_hits}`);
      }
    } catch (error) {
      probeResult.resolver.errors.push(error.message);
    }

    // Decision logic
    if (probeResult.google.logo_brands.length > 0 || probeResult.resolver.off_hits > 0) {
      probeResult.decision = 'branded';
    } else if (probeResult.google.ocr_chars > 50 || probeResult.openai.confidence > 0.3) {
      probeResult.decision = 'candidates';
    } else if (probeResult.google.ocr_chars > 10) {
      probeResult.decision = 'meal';
    } else {
      probeResult.decision = 'none';
    }

    probeResult.elapsed_ms = Date.now() - startTime;
    console.log(`PROBE:done decision=${probeResult.decision} elapsed=${probeResult.elapsed_ms}ms`);

    return new Response(JSON.stringify(probeResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('PROBE:fatal', error);
    return new Response(JSON.stringify({
      ok: false,
      errors: [error.message],
      elapsed_ms: Date.now() - startTime
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});