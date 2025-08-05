import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64 } = await req.json()
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'imageBase64 is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const googleApiKey = Deno.env.get('GOOGLE_VISION_API_KEY')
    
    if (!googleApiKey) {
      console.log('Google Vision API key not configured, skipping detection')
      return new Response(
        JSON.stringify({ foodItems: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call Google Vision API
    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`
    
    const visionPayload = {
      requests: [
        {
          image: {
            content: imageBase64
          },
          features: [
            { type: 'LABEL_DETECTION', maxResults: 20 },
            { type: 'OBJECT_LOCALIZATION', maxResults: 20 }
          ]
        }
      ]
    }

    const visionResponse = await fetch(visionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(visionPayload)
    })

    if (!visionResponse.ok) {
      throw new Error(`Google Vision API error: ${visionResponse.status}`)
    }

    const visionData = await visionResponse.json()
    const foodItems: Array<{ name: string; confidence: number; source: string }> = []

    // Process label detection results
    if (visionData.responses?.[0]?.labelAnnotations) {
      for (const label of visionData.responses[0].labelAnnotations) {
        const labelName = label.description.toLowerCase()
        
        // Check if label is food-related
        if (isFoodRelated(labelName)) {
          foodItems.push({
            name: label.description,
            confidence: Math.round((label.score || 0) * 100),
            source: 'GoogleVision'
          })
        }
      }
    }

    // Process object localization results
    if (visionData.responses?.[0]?.localizedObjectAnnotations) {
      for (const obj of visionData.responses[0].localizedObjectAnnotations) {
        const objName = obj.name.toLowerCase()
        
        // Check if object is food-related
        if (isFoodRelated(objName)) {
          foodItems.push({
            name: obj.name,
            confidence: Math.round((obj.score || 0) * 100),
            source: 'GoogleVision'
          })
        }
      }
    }

    // Remove duplicates and sort by confidence
    const uniqueFoodItems = foodItems
      .filter((item, index, self) => 
        index === self.findIndex(t => t.name.toLowerCase() === item.name.toLowerCase())
      )
      .sort((a, b) => b.confidence - a.confidence)

    return new Response(
      JSON.stringify({ foodItems: uniqueFoodItems }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Google Vision food detection error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Food detection failed',
        foodItems: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

function isFoodRelated(label: string): boolean {
  const foodKeywords = [
    'food', 'fruit', 'vegetable', 'meat', 'bread', 'cheese', 'milk', 'drink',
    'beverage', 'snack', 'meal', 'dish', 'cuisine', 'recipe', 'ingredient',
    'apple', 'banana', 'orange', 'grape', 'berry', 'tomato', 'carrot', 'lettuce',
    'chicken', 'beef', 'fish', 'pork', 'egg', 'rice', 'pasta', 'pizza',
    'sandwich', 'burger', 'salad', 'soup', 'cake', 'cookie', 'chocolate',
    'coffee', 'tea', 'juice', 'water', 'wine', 'beer', 'soda'
  ]
  
  return foodKeywords.some(keyword => label.includes(keyword))
}