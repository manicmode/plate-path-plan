import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';

  const allowed = [
    'https://plate-path-plan.lovable.app',               // prod
    /^https:\/\/.*\.lovable\.dev$/,                      // preview
    /^https:\/\/.*\.lovable\.app$/,                      // other prod subdomains
    'http://localhost:5173',
    'http://localhost:5174'
  ];

  const isAllowed = allowed.some(rule =>
    typeof rule === 'string' ? rule === origin : rule.test(origin)
  );

  const allowOrigin = isAllowed ? origin : 'https://plate-path-plan.lovable.app';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  } as HeadersInit;
}

interface ProductNutrition {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  sugar: number;
  fiber: number;
  sodium: number;
}

interface BarcodeProduct {
  name: string;
  brand?: string;
  barcode: string;
  nutrition: ProductNutrition;
  image?: string;
  source: string;
  region?: string;
  servingSize?: string;
  ingredients_text?: string;
  ingredients_available: boolean;
}

interface OpenFoodFactsProduct {
  product_name?: string;
  brands?: string;
  nutriments?: {
    'energy-kcal'?: number;
    'energy-kcal_100g'?: number;
    protein_100g?: number;
    fat_100g?: number;
    carbohydrates_100g?: number;
    sugars_100g?: number;
    fiber_100g?: number;
    sodium_100g?: number;
    salt_100g?: number;
  };
  image_url?: string;
  image_front_url?: string;
  countries?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
}

interface USDAProduct {
  description?: string;
  brandOwner?: string;
  gtinUpc?: string;
  foodNutrients?: Array<{
    nutrientId: number;
    value: number;
  }>;
}

const USDA_NUTRIENT_IDS = {
  ENERGY: 1008,
  PROTEIN: 1003,
  FAT: 1004,
  CARBS: 1005,
  FIBER: 1079,
  SUGAR: 2000,
  SODIUM: 1093
};

// Generate multiple barcode variants to improve lookup success
function generateBarcodeVariants(barcode: string): string[] {
  const variants: string[] = [];
  const cleanBarcode = barcode.replace(/\D/g, ''); // Remove non-digits
  
  // Add the original barcode
  variants.push(cleanBarcode);
  
  // For UPC-A (12 digits), try adding leading zero to make EAN-13 (13 digits)
  if (cleanBarcode.length === 12) {
    variants.push('0' + cleanBarcode);
  }
  
  // For EAN-13 (13 digits), try removing leading zero to make UPC-A (12 digits)
  if (cleanBarcode.length === 13 && cleanBarcode.startsWith('0')) {
    variants.push(cleanBarcode.substring(1));
  }
  
  // For barcodes less than 12 digits, try padding with leading zeros
  if (cleanBarcode.length < 12) {
    variants.push(cleanBarcode.padStart(12, '0'));
    variants.push(cleanBarcode.padStart(13, '0'));
  }
  
  // Remove duplicates and return
  return [...new Set(variants)];
}

serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: cors });
  }

  try {
    // Auth (let Supabase verify JWT)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...cors }
      });
    }
    const body = await req.json();
    console.log('Request body:', body);
    
    const { barcode } = body;
    if (!barcode) {
      throw new Error('Barcode is required')
    }

    const cleanBarcode = barcode.trim().replace(/\s+/g, '');
    console.log(`Looking up barcode: ${cleanBarcode}`);
    
    // Generate multiple barcode formats to try
    const barcodeVariants = generateBarcodeVariants(cleanBarcode);
    console.log('Trying barcode variants:', barcodeVariants);
    
    let product: BarcodeProduct | null = null;
    let lastError: string | null = null;

    // Try each barcode variant with Open Food Facts
    for (const variant of barcodeVariants) {
      try {
        console.log(`Trying Open Food Facts with variant: ${variant}`);
        const offResponse = await fetch(`https://world.openfoodfacts.org/api/v0/product/${variant}.json`);

        if (offResponse.ok) {
          const offData = await offResponse.json();
          console.log(`OFF Response for ${variant}:`, offData.status, offData.product ? 'Product found' : 'No product');
          
          if (offData.status === 1 && offData.product) {
            const offProduct = offData.product;
            const nutriments = offProduct.nutriments || {};
            
            // Validate that this is a real product with actual data
            if (offProduct.product_name && offProduct.product_name.trim()) {
              product = {
                name: offProduct.product_name || 'Unknown Product',
                brand: offProduct.brands || '',
                barcode: variant,
                nutrition: {
                  calories: Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0),
                  protein: Math.round((nutriments.protein_100g || 0) * 10) / 10,
                  fat: Math.round((nutriments.fat_100g || 0) * 10) / 10,
                  carbs: Math.round((nutriments.carbohydrates_100g || 0) * 10) / 10,
                  sugar: Math.round((nutriments.sugars_100g || 0) * 10) / 10,
                  fiber: Math.round((nutriments.fiber_100g || 0) * 10) / 10,
                  sodium: Math.round(nutriments.sodium_100g || (nutriments.salt_100g ? nutriments.salt_100g / 2.5 : 0)),
                },
                image: offProduct.image_front_url || offProduct.image_url,
                source: 'open_food_facts',
                region: 'International',
                ingredients_text: offProduct.ingredients_text_with_allergens || offProduct.ingredients_text_en || offProduct.ingredients_text || '',
                ingredients_available: !!(offProduct.ingredients_text_with_allergens || offProduct.ingredients_text_en || offProduct.ingredients_text),
                allergens_tags: offProduct.allergens_tags || [],
                additives_tags: offProduct.additives_tags || [],
                categories_tags: offProduct.categories_tags || []
              };
              console.log('Product found with variant:', variant, product.name);
              break; // Found a valid product, stop trying variants
            }
          }
        } else {
          lastError = `HTTP ${offResponse.status}`;
        }
      } catch (error) {
        console.log(`OFF Error for variant ${variant}:`, error.message);
        lastError = error.message;
      }
    }

    // Try UPC Database as fallback if Open Food Facts fails
    if (!product) {
      try {
        console.log('Trying UPC Database as fallback...');
        const upcResponse = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${cleanBarcode}`);
        
        if (upcResponse.ok) {
          const upcData = await upcResponse.json();
          console.log('UPC Database response:', upcData);
          
          if (upcData.code === 'OK' && upcData.items && upcData.items.length > 0) {
            const upcProduct = upcData.items[0];
            product = {
              name: upcProduct.title || 'Unknown Product',
              brand: upcProduct.brand || '',
              barcode: cleanBarcode,
              nutrition: {
                calories: 0, // UPC DB doesn't have nutrition info
                protein: 0,
                fat: 0,
                carbs: 0,
                sugar: 0,
                fiber: 0,
                sodium: 0,
              },
              image: upcProduct.images && upcProduct.images.length > 0 ? upcProduct.images[0] : undefined,
              source: 'upc_database',
              region: 'US',
              ingredients_text: '',
              ingredients_available: false
            };
            console.log('Product found in UPC Database:', product.name);
          }
        }
      } catch (error) {
        console.log('UPC Database Error:', error.message);
      }
    }

    // Determine appropriate error message
    if (!product) {
      console.log('Product not found in any database');
    }

    // Return results
    if (product) {
      console.log('SUCCESS: Product found');
      return new Response(
        JSON.stringify({ success: true, product }),
        { headers: { 'Content-Type': 'application/json', ...cors } }
      );
    } else {
      console.log('ERROR: Product not found');
      
      // Provide helpful error message based on what was attempted
      let helpfulMessage = `Product with barcode ${cleanBarcode} was not found in our databases. `;
      helpfulMessage += `We searched ${barcodeVariants.length} barcode formats across multiple databases. `;
      helpfulMessage += `This could mean the product is not in our database yet, or the barcode might be incorrect. `;
      helpfulMessage += `Please use "Add Product Manually" to enter the product details yourself.`;
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Product not found',
          message: helpfulMessage,
          searchedVariants: barcodeVariants,
          suggestion: 'Try manually entering the product details using the "Add Product Manually" option.'
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json', ...cors } 
        }
      );
    }

  } catch (error) {
    console.error('Barcode lookup error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: 'Failed to lookup product information. Please try again or enter the product manually.'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...cors },
      }
    );
  }
})