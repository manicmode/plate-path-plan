
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
    console.log('🔍 log-voice function started at:', new Date().toISOString());
    console.log('🔍 Request method:', req.method);
    console.log('🔍 Request headers:', Object.fromEntries(req.headers.entries()));
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    console.log('🔍 OpenAI API key present:', !!OPENAI_API_KEY);
    console.log('🔍 OpenAI API key length:', OPENAI_API_KEY ? OPENAI_API_KEY.length : 0);
    console.log('🔍 OpenAI API key starts with sk-:', OPENAI_API_KEY ? OPENAI_API_KEY.startsWith('sk-') : false);
    
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

    const requestBody = await req.json();
    console.log('🔍 Request body received:', requestBody);
    
    const { text } = requestBody;
    console.log('🔍 Extracted text input:', text);
    console.log('🔍 Text input type:', typeof text);
    console.log('🔍 Text input length:', text ? text.length : 0);
    
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
    console.log('🔍 OpenAI request payload:', {
      model: 'gpt-4o-mini',
      max_tokens: 800,
      temperature: 0.2,
      messagesLength: 2,
      preprocessedText: preprocessedText
    });
    
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
            content: `You are a nutrition assistant. Extract all food items mentioned in this message.

CRITICAL INSTRUCTIONS:
1. Return each item in this format as valid JSON - no additional text:
{
  "items": [
    {
      "name": "food name",
      "quantity": "how much was eaten (if available)",
      "preparation": "how it was cooked or served (if mentioned)"
    }
  ]
}

2. EXAMPLES:
Input: "I had a grilled chicken sandwich, fries, and an iced coffee."
Output:
{
  "items": [
    { "name": "chicken sandwich", "quantity": "1", "preparation": "grilled" },
    { "name": "fries", "quantity": "1 serving", "preparation": "" },
    { "name": "iced coffee", "quantity": "1 cup", "preparation": "" }
  ]
}

Input: "I ate 2 slices of pepperoni pizza and a small salad"
Output:
{
  "items": [
    { "name": "pepperoni pizza", "quantity": "2 slices", "preparation": "" },
    { "name": "salad", "quantity": "small", "preparation": "" }
  ]
}

3. If no clear food items are mentioned, return empty items array.
4. Be specific with food names but keep them simple.
5. Include preparation methods only when clearly mentioned.

          },
          {
            role: 'user',
            content: `The user said: "${preprocessedText}". Extract all food items mentioned and return in the required JSON format.`
          }
        ],
        max_tokens: 800,
        temperature: 0.2 // Lower temperature for more consistent responses
      }),
    });

    console.log('🔍 OpenAI response status:', response.status);
    console.log('🔍 OpenAI response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error response:', errorText);
      console.error('❌ OpenAI API status:', response.status);
      console.error('❌ OpenAI API status text:', response.statusText);
      
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
    console.log('🔍 OpenAI response data structure:', {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length || 0,
      hasFirstChoice: !!data.choices?.[0],
      hasMessage: !!data.choices?.[0]?.message,
      hasContent: !!data.choices?.[0]?.message?.content
    });
    
    const aiResponse = data.choices[0]?.message?.content || '';
    console.log('✅ Raw AI response:', aiResponse);
    console.log('🔍 AI response length:', aiResponse.length);

    // Try to parse the JSON response
    let structuredData;
    try {
      structuredData = JSON.parse(aiResponse);
      
      // Validate the response structure
      if (!structuredData.items || !Array.isArray(structuredData.items)) {
        throw new Error('Invalid response structure from AI');
      }
      
      
    } catch (parseError) {
      console.error('❌ Failed to parse AI response as JSON:', parseError);
      console.error('❌ AI response was:', aiResponse);
      console.error('❌ AI response type:', typeof aiResponse);
      console.error('❌ Parse error details:', parseError instanceof Error ? parseError.message : parseError);
      
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
    if (structuredData.items.length === 0) {
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

    console.log('✅ Successfully processed food analysis:', {
      itemsCount: structuredData.items.length,
      originalText: text,
      preprocessedText: preprocessedText
    });
    
    return new Response(
      JSON.stringify({ 
        success: true,
        items: structuredData.items,
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
    console.error('❌ Critical error in log-voice function:', error);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('❌ Error message:', error instanceof Error ? error.message : error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return new Response(
      JSON.stringify({ 
        success: false,
        errorType: "SYSTEM_ERROR",
        errorMessage: "An unexpected error occurred",
        suggestions: ["Please try again", "Contact support if the problem persists"],
        debugInfo: {
          errorType: typeof error,
          errorName: error instanceof Error ? error.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : String(error)
        }
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
