import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { mode, barcode, imageBase64, source } = await req.json().catch(() => ({}));
    
    console.log('[ENHANCED-HEALTH-SCANNER]', { mode, hasBarcode: !!barcode, hasImage: !!imageBase64, source });

    // This is a placeholder that returns a standardized response
    // In a real implementation, this would call external APIs for product data
    const standardizedResponse = {
      ok: true,
      product: {
        itemName: barcode ? `Product ${barcode}` : 'Detected Product',
        quality: { score: 7.5 },
        nutrition: {
          calories: 150,
          protein_g: 5.0,
          carbs_g: 30.0,
          fat_g: 2.0,
          sugar_g: 10.0,
          fiber_g: 3.0,
          sodium_mg: 200,
        },
        ingredientsText: 'Sample ingredients list',
        flags: [],
        insights: [],
      },
      source: source || 'health-scanner'
    };

    return new Response(JSON.stringify(standardizedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('[ENHANCED-HEALTH-SCANNER] Error:', error);
    return new Response(
      JSON.stringify({ 
        ok: false,
        error: error.message,
        product: null
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});