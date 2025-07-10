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
  // CRITICAL DEPLOYMENT CHECK - New timestamp
  const deployTimestamp = '2025-07-10T03:15:00Z';
  console.log(`=== FUNCTION REDEPLOY FIXED 404: ${deployTimestamp} ===`);
  console.log('Function execution confirmed - fixing 404 deployment issue');
  
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight request received');
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== BARCODE LOOKUP FUNCTION CALLED ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    const requestId = crypto.randomUUID();
    console.log('Generated request ID:', requestId);
    
    const body = await req.json();
    const { barcode, enableGlobalSearch = true } = body;
    console.log('Request body:', { barcode, enableGlobalSearch, requestId });
    
    if (!barcode) {
      console.error('No barcode provided in request');
      throw new Error('Barcode is required')
    }

    // Validate barcode format
    const cleanBarcode = barcode.trim().replace(/\s+/g, '');
    if (!/^\d{8,14}$/.test(cleanBarcode)) {
      throw new Error('Invalid barcode format. Must be 8-14 digits.');
    }

    console.log(`Looking up barcode: ${cleanBarcode}, global search: ${enableGlobalSearch}`)

    let product: BarcodeProduct | null = null;

    // STEP 4: Try Open Food Facts FIRST (better accuracy for international products)
    if (!product && enableGlobalSearch) {
      try {
        console.log('Trying Open Food Facts database (primary)...')
        const offResponse = await fetch(`https://world.openfoodfacts.org/api/v0/product/${cleanBarcode}.json`, {
          headers: {
            'User-Agent': 'PlatePathPlan/1.0 (nutrition tracking app)',
          }
        });

        if (offResponse.ok) {
          const offData = await offResponse.json();
          console.log('Open Food Facts response status:', offData.status);
          console.log('Open Food Facts product exists:', !!offData.product);
          
          if (offData.status === 1 && offData.product) {
            const offProduct: OpenFoodFactsProduct = offData.product;
            
            // STEP 1: STRICT BARCODE VALIDATION - Verify the product actually matches our barcode
            const productCode = offData.code;
            console.log('OFF returned product code:', productCode, 'vs searched:', cleanBarcode);
            
            if (productCode !== cleanBarcode) {
              console.log('Open Food Facts returned wrong product - barcode mismatch, rejecting');
              // Don't set product, continue to next database
            } else {
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

              // Extract ingredients text (prioritize English)
              const ingredientsText = offProduct.ingredients_text_en || offProduct.ingredients_text || '';

              product = {
                name: offProduct.product_name || 'Unknown Product',
                brand: offProduct.brands || '',
                barcode: cleanBarcode,
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
                region: region,
                ingredients_text: ingredientsText,
                ingredients_available: !!(ingredientsText && ingredientsText.length > 0)
              };
              console.log('VALIDATED product found in Open Food Facts:', product.name);
            }
          } else {
            console.log('Open Food Facts: No product found for barcode');
          }
        } else {
          console.log('Open Food Facts API request failed:', offResponse.status);
        }
      } catch (error) {
        console.log('Open Food Facts lookup failed:', error.message)
      }
    }

    // STEP 4: Try USDA as SECONDARY (US database) only if Open Food Facts failed
    if (!product) {
      try {
        console.log('Trying USDA database (secondary)...')
        const usdaApiKey = Deno.env.get('USDA_API_KEY');
        console.log('USDA_API_KEY status:', usdaApiKey ? 'CONFIGURED' : 'MISSING');
        if (!usdaApiKey) {
          console.error('USDA_API_KEY not configured - function will fail');
          throw new Error('USDA API key not configured - please set USDA_API_KEY in Supabase secrets');
        }
        
        const usdaUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?gtinUpc=${cleanBarcode}&dataType=Branded&pageSize=5&api_key=${usdaApiKey}`;
        console.log('USDA API URL (key redacted):', usdaUrl.replace(usdaApiKey, 'REDACTED'));
        
        const usdaResponse = await fetch(usdaUrl, {
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (usdaResponse.ok) {
          const usdaData = await usdaResponse.json();
          console.log('USDA response totalHits:', usdaData.totalHits);
          console.log('USDA foods array length:', usdaData.foods?.length || 0);
          
          if (usdaData.foods && usdaData.foods.length > 0) {
            // STEP 1 & 2: STRICT VALIDATION - Find a food that actually matches our barcode
            let validFood = null;
            
            for (const food of usdaData.foods) {
              console.log('Checking USDA food:', {
                description: food.description,
                brandOwner: food.brandOwner,
                gtinUpc: food.gtinUpc
              });
              
              // STEP 2: Verify the gtinUpc field matches our search barcode
              if (food.gtinUpc === cleanBarcode) {
                validFood = food;
                console.log('FOUND EXACT BARCODE MATCH in USDA:', food.description);
                break;
              } else {
                console.log('USDA food rejected - barcode mismatch:', food.gtinUpc, 'vs', cleanBarcode);
              }
            }
            
            if (validFood) {
              const nutrients = validFood.foodNutrients || [];
              
              const getNutrientValue = (id: number) => {
                const nutrient = nutrients.find((n: any) => n.nutrientId === id);
                return nutrient ? nutrient.value : 0;
              };

              product = {
                name: validFood.description || 'Unknown Product',
                brand: validFood.brandOwner || '',
                barcode: cleanBarcode,
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
                region: 'US',
                ingredients_text: validFood.ingredients || '',
                ingredients_available: !!(validFood.ingredients && validFood.ingredients.length > 0)
              };
              console.log('VALIDATED product found in USDA database:', product.name);
            } else {
              console.log('USDA: No foods with matching barcode found - all results rejected');
            }
          } else {
            console.log('USDA: No foods returned for barcode');
          }
        } else {
          console.log('USDA API request failed:', usdaResponse.status);
        }
      } catch (error) {
        console.log('USDA lookup failed:', error.message)
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