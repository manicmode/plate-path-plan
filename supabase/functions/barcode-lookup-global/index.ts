import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

serve(async (req) => {
  console.log('=== BARCODE LOOKUP FUNCTION CALLED ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json();
    console.log('Request body:', body);
    
    const { barcode } = body;
    if (!barcode) {
      throw new Error('Barcode is required')
    }

    const cleanBarcode = barcode.trim().replace(/\s+/g, '');
    console.log(`Looking up barcode: ${cleanBarcode}`);
    
    let product: BarcodeProduct | null = null;

    // Try Open Food Facts
    try {
      console.log('Trying Open Food Facts...')
      const offResponse = await fetch(`https://world.openfoodfacts.org/api/v0/product/${cleanBarcode}.json`);

      if (offResponse.ok) {
        const offData = await offResponse.json();
        console.log('OFF Response:', offData.status, offData.product ? 'Product found' : 'No product');
        
        if (offData.status === 1 && offData.product) {
          const offProduct = offData.product;
          const nutriments = offProduct.nutriments || {};
          
          product = {
            name: offProduct.product_name || 'Unknown Product',
            brand: offProduct.brands || '',
            barcode: cleanBarcode,
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
            ingredients_text: offProduct.ingredients_text_en || offProduct.ingredients_text || '',
            ingredients_available: !!(offProduct.ingredients_text_en || offProduct.ingredients_text)
          };
          console.log('Product found:', product.name);
        }
      }
    } catch (error) {
      console.log('OFF Error:', error.message)
    }

    // If not found, return error
    if (!product) {
      console.log('Product not found in any database');
    }

    // Return results
    if (product) {
      console.log('SUCCESS: Product found');
      return new Response(
        JSON.stringify({ success: true, product }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log('ERROR: Product not found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Product not found',
          message: 'Product not found in database'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
})