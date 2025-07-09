import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FlaggedIngredient {
  name: string;
  category: string;
  description: string;
  severity: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { ingredients } = await req.json()
    
    if (!ingredients || typeof ingredients !== 'string') {
      throw new Error('Ingredients text is required')
    }

    console.log('Checking ingredients:', ingredients.substring(0, 100) + '...')

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch all ingredient flags from the database
    const { data: ingredientFlags, error: flagsError } = await supabase
      .from('ingredient_flags')
      .select('*')

    if (flagsError) {
      console.error('Error fetching ingredient flags:', flagsError)
      throw new Error('Failed to fetch ingredient flags')
    }

    console.log(`Checking against ${ingredientFlags?.length || 0} flagged ingredients`)

    const flaggedIngredients: FlaggedIngredient[] = []
    const ingredientsLower = ingredients.toLowerCase()

    // Check each ingredient flag
    for (const flag of ingredientFlags || []) {
      const flagName = flag.name.toLowerCase()
      const aliases = flag.common_aliases || []
      
      // Check main ingredient name
      if (ingredientsLower.includes(flagName)) {
        flaggedIngredients.push({
          name: flag.name,
          category: flag.category,
          description: flag.description,
          severity: flag.severity
        })
        continue
      }

      // Check aliases
      for (const alias of aliases) {
        if (ingredientsLower.includes(alias.toLowerCase())) {
          flaggedIngredients.push({
            name: flag.name,
            category: flag.category,
            description: flag.description,
            severity: flag.severity
          })
          break
        }
      }
    }

    console.log(`Found ${flaggedIngredients.length} flagged ingredients`)

    const result = {
      success: true,
      flaggedIngredients: flaggedIngredients,
      totalChecked: ingredientFlags?.length || 0,
      ingredientsLength: ingredients.length
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Ingredient detection error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        flaggedIngredients: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})