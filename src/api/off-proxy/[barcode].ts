// API route for proxying OpenFoodFacts requests to avoid CORS issues
// Works with both Next.js and Vite dev server

interface Request {
  url: string;
  method: string;
  headers: Record<string, string>;
}

interface Response {
  status: number;
  headers: Record<string, string>;
  json: () => Promise<any>;
  text: () => Promise<string>;
}

// Universal handler that works in both environments
async function handleOffProxyRequest(req: Request): Promise<any> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return {
      status: 200,
      headers: corsHeaders,
      body: null
    };
  }

  try {
    // Extract barcode from URL
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const barcode = segments[segments.length - 1];
    
    if (!barcode || barcode === '[barcode]') {
      return {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing barcode parameter' })
      };
    }

    console.log('[OFF-PROXY] Fetching data for barcode:', barcode);
    
    // Fetch from OpenFoodFacts with proper headers
    const offResponse = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
      headers: { 
        'User-Agent': 'plate-path-plan/1.0 (https://lovable.dev)',
        'Accept': 'application/json'
      },
    });
    
    if (!offResponse.ok) {
      console.log('[OFF-PROXY] OFF API error:', offResponse.status);
      return {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300'
        },
        body: JSON.stringify({ 
          ok: false, 
          product: { images: [] },
          error: `OFF API returned ${offResponse.status}`
        })
      };
    }

    const data = await offResponse.json();
    
    // Generate image candidate URLs
    const generateImageCandidates = (barcode: string): string[] => {
      const padded = barcode.padStart(13, '0');
      const path = padded.replace(/(\d{3})(?=\d)/g, '$1/');
      const baseUrl = `https://images.openfoodfacts.org/images/products/${path}`;
      
      return [
        `${baseUrl}/front_en.400.jpg`,
        `${baseUrl}/front.400.jpg`, 
        `${baseUrl}/front_en.200.jpg`,
        `${baseUrl}/front.200.jpg`,
        // Include original URLs as fallbacks
        data?.product?.image_front_small_url,
        data?.product?.image_front_url,
        data?.product?.image_url,
        data?.product?.selected_images?.front?.display?.en,
      ].filter(Boolean);
    };

    const imageCandidates = generateImageCandidates(barcode);
    
    console.log('[OFF-PROXY] Generated', imageCandidates.length, 'image candidates');
    
    return {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
      },
      body: JSON.stringify({ 
        ok: true, 
        product: {
          ...data?.product,
          images: imageCandidates
        }
      })
    };
    
  } catch (error) {
    console.error('[OFF-PROXY] Error:', error);
    
    return {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60'
      },
      body: JSON.stringify({ 
        ok: false, 
        product: { images: [] },
        error: error.message 
      })
    };
  }
}

// Export for different environments
export async function GET(request: Request) {
  const result = await handleOffProxyRequest(request);
  return new Response(result.body, {
    status: result.status,
    headers: result.headers
  });
}

export async function OPTIONS(request: Request) {
  const result = await handleOffProxyRequest(request);
  return new Response(result.body, {
    status: result.status,
    headers: result.headers
  });
}

// Default export for compatibility
export default async function handler(req: any, res: any) {
  const result = await handleOffProxyRequest({
    url: `${req.url}`,
    method: req.method,
    headers: req.headers
  });
  
  Object.entries(result.headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  res.status(result.status);
  
  if (result.body) {
    res.send(result.body);
  } else {
    res.end();
  }
}