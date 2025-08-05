
// Redeploy triggered at 2025-01-29T10:45:00Z
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Comprehensive food mapping dictionary for vague terms
const foodMappings: { [key: string]: string } = {
  // Rice variations
  "ball of rice": "0.5 cup white rice",
  "bowl of rice": "1 cup white rice",
  "small bowl of rice": "0.75 cup white rice",
  "large bowl of rice": "1.5 cups white rice",
  
  // Nuts and snacks
  "handful of nuts": "1 oz mixed nuts",
  "small handful of nuts": "0.5 oz mixed nuts",
  "large handful of nuts": "1.5 oz mixed nuts",
  "handful of almonds": "1 oz almonds",
  "handful of peanuts": "1 oz peanuts",
  
  // Pizza
  "slice of pizza": "1 slice pizza",
  "small slice of pizza": "1 small slice pizza",
  "large slice of pizza": "1 large slice pizza",
  "piece of pizza": "1 slice pizza",
  
  // Fruits
  "small apple": "1 small apple",
  "medium apple": "1 medium apple", 
  "large apple": "1 large apple",
  "small banana": "1 small banana",
  "medium banana": "1 medium banana",
  "large banana": "1 large banana",
  "piece of fruit": "1 medium fruit",
  
  // Beverages
  "glass of milk": "1 cup milk",
  "small glass of milk": "0.75 cup milk",
  "large glass of milk": "1.5 cups milk",
  "glass of water": "1 cup water",
  "cup of coffee": "1 cup coffee",
  "mug of coffee": "1 cup coffee",
  "can of soda": "12 oz soda",
  
  // Cereals and grains
  "bowl of cereal": "1 cup cereal with milk",
  "small bowl of cereal": "0.75 cup cereal with milk",
  "large bowl of cereal": "1.5 cups cereal with milk",
  "bowl of oatmeal": "1 cup oatmeal",
  
  // Spreads and condiments
  "spoonful of peanut butter": "2 tbsp peanut butter",
  "dollop of butter": "1 tbsp butter",
  "squeeze of honey": "1 tbsp honey",
  "drizzle of olive oil": "1 tsp olive oil",
  
  // Bread and baked goods
  "slice of bread": "1 slice bread",
  "piece of toast": "1 slice toast",
  "small cookie": "1 small cookie",
  "large cookie": "1 large cookie",
  
  // Vegetables
  "handful of carrots": "1 cup carrots",
  "small salad": "2 cups mixed greens",
  "large salad": "4 cups mixed greens",
  
  // Meat and protein
  "piece of chicken": "4 oz chicken breast",
  "small piece of chicken": "3 oz chicken breast",
  "large piece of chicken": "6 oz chicken breast",
  "strip of bacon": "1 slice bacon",
};

// Preprocess text to normalize vague food terms
function preprocessFoodText(text: string): string {
  let processedText = text.toLowerCase();
  
  // Apply food mappings with fuzzy matching
  for (const [vague, standard] of Object.entries(foodMappings)) {
    // Exact match
    if (processedText.includes(vague)) {
      processedText = processedText.replace(new RegExp(vague, 'gi'), standard);
    }
    
    // Handle common misspellings and variations
    const fuzzyVariations = [
      vague.replace('handful', 'handfull'),
      vague.replace('spoonful', 'spoonfull'),
      vague.replace('of', 'of '),
      vague.replace(' ', ''),
    ];
    
    for (const variation of fuzzyVariations) {
      if (processedText.includes(variation)) {
        processedText = processedText.replace(new RegExp(variation, 'gi'), standard);
      }
    }
  }
  
  return processedText;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log function start and check for API key availability
    console.log('🔍 log-voice function started');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    console.log('🔍 OpenAI API key present:', !!OPENAI_API_KEY);
    console.log('🔍 OpenAI API key length:', OPENAI_API_KEY ? OPENAI_API_KEY.length : 0);
    
    if (!OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not configured in Supabase secrets');
      return new Response(
        JSON.stringify({ 
          success: false,
          errorType: "CONFIG_ERROR",
          errorMessage: "AI analysis service is not configured",
          suggestions: ["OpenAI API key is missing from Supabase secrets", "Please contact support"]
        }),
        { 
          status: 500,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    const { text } = await req.json();
    console.log('🔍 Received text input:', text);
    
    if (!text) {
      return new Response(
        JSON.stringify({ 
          success: false,
          errorType: "NO_INPUT",
          errorMessage: "No voice input detected",
          suggestions: ["Please try recording again", "Speak clearly into the microphone"]
        }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Preprocess the input text with food mapping
    const preprocessedText = preprocessFoodText(text);
    console.log('Original text:', text);
    console.log('Preprocessed text:', preprocessedText);

    // Enhanced OpenAI prompt with specific examples and instructions
    console.log('🔍 Making OpenAI API request...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a nutrition expert specializing in food logging. When a user describes food they ate, extract and estimate nutritional information accurately.

CRITICAL INSTRUCTIONS:
1. Always respond with valid JSON in this EXACT format - no additional text:
{
  "foodItems": [
    {
      "name": "descriptive food name",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "fiber": number,
      "sugar": number,
      "sodium": number,
      "confidence": number (0-100),
      "serving": "serving description"
    }
  ],
  "analysis": "brief analysis text"
}

2. PORTION SIZE GUIDELINES:
- "1 cup" = standard measuring cup
- "1 slice" = typical bread/pizza slice
- "1 oz" = standard weight measure
- "1 tbsp" = tablespoon measure
- "1 tsp" = teaspoon measure

3. CONFIDENCE SCORING:
- 90-100: Exact measurements provided (e.g., "1 cup rice")
- 70-89: Standard portions (e.g., "1 slice pizza", "1 medium apple")
- 50-69: Estimated portions (e.g., "bowl of cereal", "handful of nuts")
- Below 50: Very vague descriptions

4. EXAMPLES:
Input: "1 cup white rice" → confidence: 95
Input: "1 slice pepperoni pizza" → confidence: 85
Input: "bowl of cereal with milk" → confidence: 70
Input: "some chicken" → confidence: 40

5. If multiple foods mentioned, create separate items in foodItems array.
6. Use realistic nutritional values based on USDA data.
7. Be specific with food names (e.g., "white rice" not just "rice").`
          },
          {
            role: 'user',
            content: `The user said: "${preprocessedText}". Please analyze this food input and provide nutritional estimates in the required JSON format. Pay attention to portion sizes and assign appropriate confidence scores.`
          }
        ],
        max_tokens: 800,
        temperature: 0.2 // Lower temperature for more consistent responses
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          errorType: "API_ERROR",
          errorMessage: "AI service temporarily unavailable",
          suggestions: ["Please try again in a moment", "Try using more specific measurements"]
        }),
        { 
          status: 500,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || '';
    console.log('Raw AI response:', aiResponse);

    // Try to parse the JSON response
    let structuredData;
    try {
      structuredData = JSON.parse(aiResponse);
      
      // Validate the response structure
      if (!structuredData.foodItems || !Array.isArray(structuredData.foodItems)) {
        throw new Error('Invalid response structure from AI');
      }
      
      // Check confidence threshold and filter low-confidence items
      const lowConfidenceItems = structuredData.foodItems.filter(item => item.confidence < 60);
      const highConfidenceItems = structuredData.foodItems.filter(item => item.confidence >= 60);
      
      if (lowConfidenceItems.length > 0 && highConfidenceItems.length === 0) {
        // All items have low confidence
        return new Response(
          JSON.stringify({ 
            success: false,
            errorType: "LOW_CONFIDENCE",
            errorMessage: "Could not accurately identify the food items from your description",
            suggestions: [
              "Try using specific measurements like '1 cup' or '2 slices'",
              "Be more specific about food names and quantities", 
              "Include cooking methods (e.g., 'grilled chicken', 'steamed broccoli')"
            ],
            originalText: text,
            detectedItems: lowConfidenceItems.map(item => `${item.name} (${item.confidence}% confidence)`)
          }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        );
      }
      
      // If some items have low confidence, only return high-confidence ones
      if (lowConfidenceItems.length > 0) {
        structuredData.foodItems = highConfidenceItems;
        structuredData.analysis = `${structuredData.analysis} Note: Some items with low confidence were excluded for accuracy.`;
      }
      
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('AI response was:', aiResponse);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          errorType: "PARSE_ERROR",
          errorMessage: "Could not understand the food description",
          suggestions: [
            "Try describing foods more clearly",
            "Use common food names (e.g., 'apple', 'chicken breast', 'white rice')",
            "Include portion sizes when possible"
          ],
          originalText: text
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Check if no food items were detected
    if (structuredData.foodItems.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          errorType: "NO_FOOD_DETECTED",
          errorMessage: "No food items could be identified from your description",
          suggestions: [
            "Try mentioning specific food names",
            "Include quantities or portions",
            "Describe what you ate more clearly"
          ],
          originalText: text
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        data: structuredData,
        originalText: text,
        preprocessedText: preprocessedText
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in log-voice function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        errorType: "SYSTEM_ERROR",
        errorMessage: "An unexpected error occurred",
        suggestions: ["Please try again", "Contact support if the problem persists"]
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
