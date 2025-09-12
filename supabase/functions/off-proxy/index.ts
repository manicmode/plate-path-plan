import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const barcode = url.pathname.split('/').pop();
    
    if (!barcode) {
      return new Response(JSON.stringify({ error: 'Missing barcode' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[OFF-PROXY] Fetching data for barcode:', barcode);
    
    // Fetch OFF JSON with proper User-Agent
    const offResponse = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
      headers: { 
        'User-Agent': 'plate-path-plan/1.0 (https://lovable.dev)' 
      },
    });
    
    if (!offResponse.ok) {
      console.log('[OFF-PROXY] OFF API error:', offResponse.status);
      return new Response(JSON.stringify({ 
        ok: false, 
        product: { images: [] },
        error: 'OFF API unavailable'
      }), {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // 5min cache for errors
        },
      });
    }

    const data = await offResponse.json();
    
    // Generate image candidate URLs with proper EAN path structure
    const generateImageCandidates = (barcode: string): string[] => {
      // Convert barcode to path format (e.g., 1234567890123 -> 123/456/789/0123)
      const padded = barcode.padStart(13, '0');
      const path = padded.replace(/(\d{3})(?=\d)/g, '$1/');
      
      const baseUrl = `https://images.openfoodfacts.org/images/products/${path}`;
      
      return [
        `${baseUrl}/front_en.400.jpg`,
        `${baseUrl}/front.400.jpg`, 
        `${baseUrl}/front_en.200.jpg`,
        `${baseUrl}/front.200.jpg`,
        // Fallback to original image URLs from API
        data?.product?.image_front_small_url,
        data?.product?.image_front_url,
        data?.product?.image_url,
        data?.product?.selected_images?.front?.display?.en,
      ].filter(Boolean);
    };

    const imageCandidates = generateImageCandidates(barcode);
    
    console.log('[OFF-PROXY] Generated image candidates:', imageCandidates.length);
    
    return new Response(JSON.stringify({ 
      ok: true, 
      product: {
        ...data?.product,
        images: imageCandidates
      }
    }), {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' // 1h cache, 1day stale
      },
    });
    
  } catch (error) {
    console.error('[OFF-PROXY] Error:', error);
    
    return new Response(JSON.stringify({ 
      ok: false, 
      product: { images: [] },
      error: error.message 
    }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60' // 1min cache for errors
      },
    });
  }
});