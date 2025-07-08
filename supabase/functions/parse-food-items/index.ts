import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VisionResults {
  labels: Array<{ description: string; score: number }>;
  foodLabels: Array<{ description: string; score: number }>;
  textDetected: string;
  objects: Array<{ name: string; score: number }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { visionResults }: { visionResults: VisionResults } = await req.json();
    
    if (!visionResults) {
      return new Response(
        JSON.stringify({ 
          error: true,
          message: "No vision results provided"
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Enhanced cooked meal detection with color, texture, shape analysis
    const visualFoodItems = [
      ...visionResults.foodLabels.map(l => ({ type: 'food_label', description: l.description, score: l.score })),
      ...visionResults.objects.filter(o => 
        // Enhanced filter for cooked food items including dish components
        ['food', 'fruit', 'vegetable', 'meat', 'bread', 'cheese', 'pasta', 'rice', 'fish', 'chicken', 'beef', 'pork', 'salad', 'soup', 'pizza', 'sandwich', 'burger', 'cake', 'cookie', 'apple', 'banana', 'orange', 'potato', 'tomato', 'carrot', 'broccoli', 'lettuce', 'onion', 'garlic', 'egg', 'milk', 'yogurt', 'cereal', 'nuts', 'berries', 'beans', 'lentils', 'peppers', 'mushrooms', 'stew', 'curry', 'sauce', 'grain', 'chunks', 'pieces', 'bowl', 'plate', 'dish'].some(foodWord => 
          o.name.toLowerCase().includes(foodWord)
        )
      ).map(o => ({ type: 'object', description: o.name, score: o.score })),
      ...visionResults.labels.filter(l => 
        // Enhanced filter for cooked meal labels and dish descriptions
        l.score > 0.7 && ['food', 'cuisine', 'dish', 'meal', 'snack', 'breakfast', 'lunch', 'dinner', 'dessert', 'beverage', 'drink', 'cooked', 'prepared', 'homemade', 'stewed', 'braised', 'grilled', 'roasted', 'sauteed', 'mixed', 'colorful', 'hearty'].some(foodWord =>
          l.description.toLowerCase().includes(foodWord)
        )
      ).map(l => ({ type: 'label', description: l.description, score: l.score }))
    ];

    // Determine detection confidence and method
    const hasStrongVisualDetection = visualFoodItems.some(item => item.score > 0.8);
    const hasModerateVisualDetection = visualFoodItems.some(item => item.score > 0.6);
    const hasWeakVisualDetection = visualFoodItems.length > 0;
    
    // Check if this looks like a cooked meal based on detection patterns
    const cookedMealIndicators = ['stew', 'curry', 'soup', 'mixed', 'cooked', 'prepared', 'dish', 'bowl', 'plate'];
    const appearsToBeComplexDish = visualFoodItems.some(item => 
      cookedMealIndicators.some(indicator => item.description.toLowerCase().includes(indicator))
    ) || (visualFoodItems.length > 3 && !hasStrongVisualDetection);
    
    let inputText = '';
    let detectionMethod = '';
    let useComplexDishFallback = false;
    
    if (hasStrongVisualDetection) {
      // High confidence visual detection
      const sortedVisualItems = visualFoodItems.sort((a, b) => b.score - a.score);
      inputText = sortedVisualItems.map(item => `${item.description} (${item.type}, confidence: ${item.score.toFixed(2)})`).join(', ');
      detectionMethod = 'high_confidence_visual';
      console.log('🎯 Using high-confidence visual detection:', inputText);
    } else if (hasModerateVisualDetection || hasWeakVisualDetection) {
      // Moderate/weak visual detection - check for complex dish
      const sortedVisualItems = visualFoodItems.sort((a, b) => b.score - a.score);
      inputText = sortedVisualItems.map(item => `${item.description} (${item.type}, confidence: ${item.score.toFixed(2)})`).join(', ');
      
      if (appearsToBeComplexDish) {
        useComplexDishFallback = true;
        detectionMethod = 'complex_dish_detected';
        console.log('🍲 Complex dish detected with moderate confidence, will use enhanced analysis');
        
        // Add OCR context for complex dishes
        if (visionResults.textDetected) {
          inputText += `, OCR_CONTEXT: ${visionResults.textDetected}`;
        }
      } else {
        detectionMethod = 'moderate_confidence_visual';
        console.log('📊 Using moderate-confidence visual detection:', inputText);
      }
    } else {
      // No visual food detection - use all available data
      inputText = [
        ...visionResults.labels.map(l => l.description),
        visionResults.textDetected
      ].filter(Boolean).join(', ');
      
      useComplexDishFallback = true;
      detectionMethod = 'fallback_all_data';
      console.log('🔄 No visual food detected, using fallback with complex dish analysis:', inputText);
    }
    
    // If no meaningful input, return error early
    if (!inputText || inputText.trim().length < 3) {
      console.log('No meaningful food data detected in image');
      return new Response(
        JSON.stringify({ 
          error: true,
          message: "No meaningful food data detected in image"
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Enhanced OpenAI prompt based on detection method
    let prompt = '';
    
    if (useComplexDishFallback) {
      // Complex dish analysis prompt
      prompt = `Analyze this cooked meal/complex dish using visual segmentation principles. The image appears to contain multiple food components in bowls, plates, or mixed together. Use color, texture, and shape analysis to identify distinct food items such as beans, beef chunks, peppers, vegetables, grains, sauces, etc.

FALLBACK ANALYSIS: If individual components are unclear, describe this dish and estimate the top 3 most likely ingredients based on visual appearance, colors, textures, and typical cooking patterns.

Input data: ${inputText}

Return a JSON array with objects containing:
- \`name\`: Individual food component (e.g., "black beans", "beef chunks", "red peppers") 
- \`portion\`: Estimated serving size
- \`confidence\`: Detection confidence as "high", "medium", or "low"
- \`method\`: "visual_segmentation" or "dish_analysis_fallback"

Focus on actual food components visible in the image, not package text or marketing terms.`;
    } else {
      // Standard analysis prompt  
      prompt = `Analyze this food image with focus on distinct visible items. Extract INDIVIDUAL food items as separate entries. If multiple foods are visible (like "bread and shrimp" or "salad with chicken"), split them into separate items.

For cooked meals: Identify distinct components like vegetables, proteins, grains, etc. based on color, texture, and shape differences.

Input data: ${inputText}

Return a JSON array with objects containing:
- \`name\`: Individual food item name
- \`portion\`: Estimated serving size  
- \`confidence\`: Detection confidence as "high", "medium", or "low"
- \`method\`: "visual_detection"

Focus on real food visible in the image, not marketing text. Each detected food should be its own item.`;
    }

    // Call OpenAI with enhanced prompt
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
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 600,
        temperature: 0.2
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      
      return new Response(
        JSON.stringify({ 
          error: true,
          message: "AI parsing service temporarily unavailable"
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || '';
    console.log('OpenAI parsing response:', aiResponse);

    // Marketing words/phrases blacklist
    const marketingBlacklist = [
      'virtually flavored', 'sweet and crunchy', 'natural', 'fresh', 'healthy',
      'delicious', 'tasty', 'crispy', 'crunchy', 'smooth', 'creamy', 'rich',
      'premium', 'gourmet', 'artisan', 'homestyle', 'authentic', 'traditional',
      'organic', 'non-gmo', 'gluten-free', 'sugar-free', 'low-fat', 'reduced-sodium',
      'all-natural', 'farm-fresh', 'hand-picked', 'locally-sourced', 'sustainably-grown',
      'wholesome', 'nutritious', 'satisfying', 'filling', 'energizing',
      'guilt-free', 'indulgent', 'decadent', 'luxurious', 'irresistible',
      'mouthwatering', 'savory', 'flavorful', 'zesty', 'tangy', 'spicy',
      'new', 'improved', 'better', 'best', 'perfect', 'ultimate', 'supreme',
      'classic', 'original', 'signature', 'special', 'limited edition',
      'award-winning', 'chef-inspired', 'restaurant-quality', 'cafe-style',
      'brand name', 'trademark', 'registered', 'copyright', 'quality',
      'since', 'established', 'founded', 'family recipe', 'secret recipe'
    ];

    const isMarketingText = (name: string): boolean => {
      const lowerName = name.toLowerCase().trim();
      
      // Check if the entire name is just marketing text
      if (marketingBlacklist.some(phrase => lowerName === phrase)) {
        return true;
      }
      
      // Check if name consists mostly of marketing words (>60% of words are marketing)
      const words = lowerName.split(/\s+/);
      const marketingWordCount = words.filter(word => 
        marketingBlacklist.some(phrase => phrase.includes(word) || word.includes(phrase))
      ).length;
      
      return words.length > 1 && (marketingWordCount / words.length) > 0.6;
    };

    // Parse the JSON response
    let parsedItems;
    try {
      // Clean the response to remove any markdown formatting
      const cleanResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      console.log('Cleaned AI response for parsing:', cleanResponse);
      
      parsedItems = JSON.parse(cleanResponse);
      
      // Validate array structure
      if (!Array.isArray(parsedItems)) {
        throw new Error('Response is not an array');
      }
      
      // Validate each item has name and portion, and filter out marketing text
      const filteredItems = [];
      for (const item of parsedItems) {
        if (item && typeof item === 'object' && item.name && item.portion) {
          if (isMarketingText(item.name)) {
            console.log('Filtered out marketing text:', item.name);
          } else {
            filteredItems.push(item);
          }
        }
      }
      
      parsedItems = filteredItems;
      console.log('Successfully parsed and filtered items:', parsedItems);
      
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('AI response was:', aiResponse);
      
      // Fallback: create basic items from food labels and labels
      const fallbackItems = [
        ...visionResults.foodLabels.slice(0, 2).map(label => ({
          name: label.description,
          portion: "1 serving"
        })),
        ...visionResults.labels.slice(0, 1).map(label => ({
          name: label.description,
          portion: "1 serving"
        }))
      ];
      
      console.log('Using fallback items:', fallbackItems);
      parsedItems = fallbackItems;
    }

    // Ensure we don't return empty results
    if (parsedItems.length === 0) {
      parsedItems = [
        { name: "Unknown Food Item", portion: "1 serving" }
      ];
    }

    // Log comprehensive analysis results
    console.log('🎯 COOKED MEAL ANALYSIS SUMMARY:');
    console.log(`📊 Detection Method: ${detectionMethod}`);
    console.log(`🍲 Complex Dish Analysis: ${useComplexDishFallback ? 'USED' : 'NOT USED'}`);
    console.log(`🔍 Visual Food Items Found: ${visualFoodItems.length}`);
    console.log(`✅ Final Items Count: ${parsedItems.length}`);
    console.log(`📋 Confidence Levels: ${parsedItems.map(item => item.confidence || 'unknown').join(', ')}`);
    console.log(`🛠️ Analysis Methods: ${parsedItems.map(item => item.method || 'standard').join(', ')}`);
    
    // Add analysis metadata to response for debugging
    const responseWithMetadata = {
      items: parsedItems,
      analysis: {
        detectionMethod,
        useComplexDishFallback,
        visualItemsFound: visualFoodItems.length,
        strongVisualDetection: hasStrongVisualDetection,
        moderateVisualDetection: hasModerateVisualDetection,
        appearsToBeComplexDish
      }
    };

    console.log('Final parsed items with metadata:', responseWithMetadata);

    return new Response(
      JSON.stringify(responseWithMetadata),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in parse-food-items function:', error);
    return new Response(
      JSON.stringify({ 
        error: true,
        message: `Food parsing failed: ${error.message}`
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});