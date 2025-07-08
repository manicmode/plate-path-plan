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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { barcode, enableGlobalSearch = true } = await req.json()
    
    if (!barcode) {
      throw new Error('Barcode is required')
    }

    console.log(`Looking up barcode: ${barcode}, global search: ${enableGlobalSearch}`)

    let product: BarcodeProduct | null = null;

    // First try USDA (US database)
    if (!product) {
      try {
        console.log('Trying USDA database...')
        const usdaResponse = await fetch(
          `https://api.nal.usda.gov/fdc/v1/foods/search?query=${barcode}&dataType=Branded&pageSize=1&api_key=${Deno.env.get('USDA_API_KEY')}`,
          {
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );

        if (usdaResponse.ok) {
          const usdaData = await usdaResponse.json();
          if (usdaData.foods && usdaData.foods.length > 0) {
            const food = usdaData.foods[0];
            const nutrients = food.foodNutrients || [];
            
            const getNutrientValue = (id: number) => {
              const nutrient = nutrients.find((n: any) => n.nutrientId === id);
              return nutrient ? nutrient.value : 0;
            };

            product = {
              name: food.description || 'Unknown Product',
              brand: food.brandOwner || '',
              barcode: barcode,
              nutrition: {
                calories: Math.round(getNutrientValue(USDA_NUTRIENT_IDS.ENERGY)),
                protein: Math.round(getNutrientValue(USDA_NUTRIENT_IDS.PROTEIN) * 10) / 10,
                fat: Math.round(getNutrientValue(USDA_NUTRIENT_IDS.FAT) * 10) / 10,
                carbs: Math.round(getNutrientValue(USDA_NUTRIENT_IDS.CARBS) * 10) / 10,
                sugar: Math.round(getNutrientValue(USDA_NUTRIENT_IDS.SUGAR) * 10) / 10,
                fiber: Math.round(getNutrientValue(USDA_NUTRIENT_IDS.FIBER) * 10) / 10,
                sodium: Math.round(getNutrientValue(USDA_NUTRIENT_IDS.SODIUM)),
              },
              source: 'usda',
              region: 'US'
            };
            console.log('Found product in USDA database')
          }
        }
      } catch (error) {
        console.log('USDA lookup failed:', error.message)
      }
    }

    // Try Open Food Facts (international database) if USDA failed and global search is enabled
    if (!product && enableGlobalSearch) {
      try {
        console.log('Trying Open Food Facts database...')
        const offResponse = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
          headers: {
            'User-Agent': 'PlatePathPlan/1.0 (nutrition tracking app)',
          }
        });

        if (offResponse.ok) {
          const offData = await offResponse.json();
          
          if (offData.status === 1 && offData.product) {
            const offProduct: OpenFoodFactsProduct = offData.product;
            const nutriments = offProduct.nutriments || {};
            
            // Extract nutritional information per 100g
            const calories = nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0;
            const protein = nutriments.protein_100g || 0;
            const fat = nutriments.fat_100g || 0;
            const carbs = nutriments.carbohydrates_100g || 0;
            const sugar = nutriments.sugars_100g || 0;
            const fiber = nutriments.fiber_100g || 0;
            
            // Convert sodium from mg to mg (sometimes salt is provided instead)
            let sodium = nutriments.sodium_100g || 0;
            if (!sodium && nutriments.salt_100g) {
              sodium = nutriments.salt_100g / 2.5;
            }

            // Determine region from countries field
            const countries = offProduct.countries || '';
            const region = countries.includes('United States') ? 'US' : 
                          countries.includes('Canada') ? 'CA' :
                          countries.includes('United Kingdom') ? 'UK' :
                          'International';

            product = {
              name: offProduct.product_name || 'Unknown Product',
              brand: offProduct.brands || '',
              barcode: barcode,
              nutrition: {
                calories: Math.round(calories),
                protein: Math.round(protein * 10) / 10,
                fat: Math.round(fat * 10) / 10,
                carbs: Math.round(carbs * 10) / 10,
                sugar: Math.round(sugar * 10) / 10,
                fiber: Math.round(fiber * 10) / 10,
                sodium: Math.round(sodium),
              },
              image: offProduct.image_front_url || offProduct.image_url,
              source: 'open_food_facts',
              region: region
            };
            console.log('Found product in Open Food Facts database')
          }
        }
      } catch (error) {
        console.log('Open Food Facts lookup failed:', error.message)
      }
    }

    // Return results
    if (product) {
      const result = {
        success: true,
        product: product,
        searchScope: enableGlobalSearch ? 'global' : 'local'
      };

      console.log('Barcode lookup successful:', result);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Product not found
      const errorMessage = enableGlobalSearch 
        ? 'Product not found in US or international databases. This product may not be available in our nutrition database.'
        : 'Product not found in US database. Try enabling global search in settings for international products.';

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Product not found',
          message: errorMessage,
          suggestions: [
            'Check that the barcode number is correct',
            'Try scanning the barcode again with better lighting',
            enableGlobalSearch ? 'Contact support if this product should be available' : 'Enable global search in settings for international products'
          ],
          searchScope: enableGlobalSearch ? 'global' : 'local'
        }),
        { 
          status: 404,
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