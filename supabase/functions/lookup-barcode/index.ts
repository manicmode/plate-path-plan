import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OpenFoodFactsProduct {
  product_name?: string;
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
  brands?: string;
  image_url?: string;
  image_front_url?: string;
}

interface OpenFoodFactsResponse {
  status: number;
  product?: OpenFoodFactsProduct;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { barcode } = await req.json()
    
    if (!barcode) {
      throw new Error('Barcode is required')
    }

    console.log('Looking up barcode:', barcode)

    // Call Open Food Facts API
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
      headers: {
        'User-Agent': 'PlatePathPlan/1.0 (nutrition tracking app)',
      }
    })

    if (!response.ok) {
      throw new Error(`Open Food Facts API error: ${response.status}`)
    }

    const data: OpenFoodFactsResponse = await response.json()
    
    if (data.status !== 1 || !data.product) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Product not found',
          message: 'No product found for this barcode in the database'
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const product = data.product
    const nutriments = product.nutriments || {}

    // Extract nutritional information per 100g
    const calories = nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0
    const protein = nutriments.protein_100g || 0
    const fat = nutriments.fat_100g || 0
    const carbs = nutriments.carbohydrates_100g || 0
    const sugar = nutriments.sugars_100g || 0
    const fiber = nutriments.fiber_100g || 0
    
    // Convert sodium from mg to mg (Open Food Facts gives sodium in mg)
    // Sometimes salt is provided instead of sodium, convert: sodium = salt / 2.5
    let sodium = nutriments.sodium_100g || 0
    if (!sodium && nutriments.salt_100g) {
      sodium = nutriments.salt_100g / 2.5
    }

    // Format the response
    const result = {
      success: true,
      product: {
        name: product.product_name || 'Unknown Product',
        brand: product.brands || '',
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
        image: product.image_front_url || product.image_url || null,
        source: 'open_food_facts'
      }
    }

    console.log('Barcode lookup successful:', result)

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Barcode lookup error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: 'Failed to lookup product information'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})