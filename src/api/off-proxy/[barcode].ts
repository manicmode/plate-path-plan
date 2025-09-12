// OFF proxy to avoid CORS issues when fetching from OpenFoodFacts
import { chunkBarcode, offImageCandidates } from '@/lib/offImages';

// Types for cross-platform compatibility
interface Request {
  url: string;
  method: string;
}

interface Response {
  json(): any;
  status: number;
  ok: boolean;
}

// Universal handler that works with both Next.js and Vite
async function handleOffProxyRequest(req: Request): Promise<any> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
      },
    });
  }

  try {
    // Extract barcode from URL
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const barcode = pathSegments[pathSegments.length - 1];

    if (!barcode || !/^\d+$/.test(barcode)) {
      return new Response(JSON.stringify({ error: 'Invalid barcode' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    console.log('[OFF_PROXY] Fetching barcode:', barcode);

    // Fetch from OpenFoodFacts with proper User-Agent
    const offResponse = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
      headers: {
        'User-Agent': 'NutritionApp/1.0 (contact@example.com)',
      },
    });

    if (!offResponse.ok) {
      console.warn('[OFF_PROXY] OFF API error:', offResponse.status);
      return new Response(JSON.stringify({ 
        error: 'OFF API error', 
        status: offResponse.status,
        product: null,
        images: offImageCandidates(barcode)
      }), {
        status: offResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    const data = await offResponse.json();
    const product = data?.product;

    // Generate image candidates
    const imageCandidates = offImageCandidates(barcode);

    // Add official image URLs from OFF response if available
    const officialImages = [];
    if (product?.image_front_small_url) officialImages.push(product.image_front_small_url);
    if (product?.image_front_url) officialImages.push(product.image_front_url);
    if (product?.image_url) officialImages.push(product.image_url);

    // Combine official and generated candidates
    const allImages = [...officialImages, ...imageCandidates];

    return new Response(JSON.stringify({
      product: data?.product || null,
      images: allImages,
      nutrition: product ? {
        energy: product.nutriments?.['energy-kcal_100g'],
        protein: product.nutriments?.['proteins_100g'],
        carbs: product.nutriments?.['carbohydrates_100g'],
        fat: product.nutriments?.['fat_100g'],
        fiber: product.nutriments?.['fiber_100g'],
        sugar: product.nutriments?.['sugars_100g'],
        sodium: product.nutriments?.['sodium_100g'],
      } : null
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    console.error('[OFF_PROXY] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

// Export for Next.js/Vite compatibility
export const GET = handleOffProxyRequest;
export const OPTIONS = handleOffProxyRequest;

// Default export for older compatibility
export default async function handler(req: any, res: any) {
  const request = { url: req.url, method: req.method };
  const response = await handleOffProxyRequest(request);
  
  // Convert Response to res object for older handlers
  const data = await response.json();
  res.status(response.status).json(data);
}