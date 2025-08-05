import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Vision-based fallback function for when detection fails
async function analyzeImageWithCaptioning(imageDataUrl: string): Promise<any[]> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  console.log('🔍 Using GPT-4 Vision fallback for image analysis');

  const visionPrompt = `You are an expert food analyst examining this image. Your task is to identify ALL visible food items and estimate their portions and calories.

ANALYSIS INSTRUCTIONS:
🔍 Look carefully at the entire image
🍽️ Identify every distinct food item you can see
📊 Provide realistic portion sizes and calorie estimates
🚫 Ignore plates, utensils, napkins, and decorations

EXPECTED FOOD CATEGORIES:
• Proteins: eggs, bacon, sausage, chicken, fish
• Carbs: toast, bagels, pancakes, waffles, cereal, oatmeal  
• Fruits: berries, bananas, citrus, melon, apples
• Vegetables: avocado, tomatoes, spinach, peppers
• Dairy: milk, yogurt, cheese, butter
• Beverages: coffee, juice, smoothies

OUTPUT REQUIREMENTS:
- List 3-7 specific food items you can actually see
- Use specific names (not "fruit" but "strawberries")
- Include realistic portions and accurate calories
- Mark confidence based on visibility

EXAMPLE OUTPUT:
[
  {"name": "scrambled eggs", "portion": "2 large eggs", "calories": 140, "confidence": "high", "method": "vision_analysis"},
  {"name": "whole wheat toast", "portion": "2 slices", "calories": 160, "confidence": "high", "method": "vision_analysis"},
  {"name": "sliced avocado", "portion": "½ medium avocado", "calories": 120, "confidence": "medium", "method": "vision_analysis"},
  {"name": "fresh strawberries", "portion": "½ cup", "calories": 25, "confidence": "medium", "method": "vision_analysis"}
]

Return ONLY the JSON array with no additional text.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: visionPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageDataUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI Vision API error: ${response.status}`);
    }

    const data = await response.json();
    const visionResponse = data.choices[0]?.message?.content || '';
    
    console.log('🎯 GPT-4 Vision Response:', visionResponse);
    console.log('📊 Vision API Usage:', data.usage);

    // Parse the JSON response
    const cleanedResponse = visionResponse.replace(/```json\s*|\s*```/g, '').trim();
    const foodItems = JSON.parse(cleanedResponse);

    // Validate and enhance the response
    const validatedItems = foodItems.map((item: any) => ({
      name: item.name || 'Unknown Food',
      portion: item.portion || '1 serving',
      calories: Number(item.calories) || 100,
      confidence: item.confidence || 'medium',
      method: 'vision_analysis'
    }));

    console.log('✅ Validated Vision Analysis Items:', validatedItems);
    return validatedItems;

  } catch (error) {
    console.error('❌ Vision analysis failed:', error);
    // Return fallback items
    return [
      { name: 'mixed breakfast items', portion: '1 serving', calories: 300, confidence: 'low', method: 'vision_fallback' }
    ];
  }
}

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

    // Pre-processing filter to remove non-food labels
    const filterNonFoodLabels = (items: any[]) => {
      const utensils = [
        'plate', 'fork', 'knife', 'spoon', 'bowl', 'cup', 'glass', 'mug',
        'serveware', 'tableware', 'kitchenware', 'utensil', 'cutlery',
        'dishware', 'drinkware', 'container', 'platter', 'tray', 'napkin',
        'table', 'surface', 'dining', 'silverware'
      ];
      
      const ambiguousMealTypes = [
        'breakfast', 'brunch', 'lunch', 'dinner', 'meal', 'dish', 'cuisine',
        'snack', 'food', 'eating', 'nutrition', 'cooking', 'recipe',
        'feast', 'banquet', 'supper'
      ];
      
      const excludeTerms = [...utensils, ...ambiguousMealTypes];
      
      return items.filter(item => {
        const name = item.description || item.name || '';
        const lowerName = name.toLowerCase();
        
        // Filter out excluded terms
        return !excludeTerms.some(term => 
          lowerName.includes(term) || lowerName === term
        );
      });
    };

    // Apply pre-processing filter to vision results
    const filteredFoodLabels = filterNonFoodLabels(visionResults.foodLabels);
    const filteredObjects = filterNonFoodLabels(visionResults.objects);
    const filteredLabels = filterNonFoodLabels(visionResults.labels);

    console.log('🧹 Pre-processing filter applied:');
    console.log(`Food labels: ${visionResults.foodLabels.length} → ${filteredFoodLabels.length}`);
    console.log(`Objects: ${visionResults.objects.length} → ${filteredObjects.length}`);
    console.log(`Labels: ${visionResults.labels.length} → ${filteredLabels.length}`);

    // 🧠 Ultimate AI Detection Filtering - Collect all detected items (using filtered data)
    const allDetectedItems = [
      ...filteredFoodLabels.map(l => ({ 
        name: l.description, 
        confidence: l.score, 
        type: 'food_label' as const,
        score: l.score 
      })),
      ...filteredObjects.map(o => ({ 
        name: o.name, 
        confidence: o.score, 
        type: 'object' as const,
        score: o.score 
      })),
      ...filteredLabels.map(l => ({ 
        name: l.description, 
        confidence: l.score, 
        type: 'label' as const,
        score: l.score 
      }))
    ];

    // Apply enhanced filtering via new filtering service
    let visualFoodItems = allDetectedItems;
    try {
      const filterResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/enhanced-food-filter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify({ detectedItems: allDetectedItems })
      });

      if (filterResponse.ok) {
        const filterData = await filterResponse.json();
        if (filterData.filteredItems && filterData.filteredItems.length > 0) {
          visualFoodItems = filterData.filteredItems.map((item: any) => ({
            type: 'filtered',
            description: item.name,
            score: item.confidence === 'high' ? 0.9 : item.confidence === 'medium' ? 0.7 : 0.5,
            category: item.category,
            priority: item.priority
          }));
          console.log('🧠 Enhanced filtering applied:', filterData.summary);
        }
      }
    } catch (filterError) {
      console.warn('Enhanced filtering failed, using basic filtering:', filterError);
      // Fallback to basic filtering
      visualFoodItems = allDetectedItems.filter(item => 
        !['plate', 'bowl', 'fork', 'knife', 'spoon', 'dish', 'cup', 'glass', 'napkin', 'table', 'tray'].some(nonFood => 
          item.name.toLowerCase().includes(nonFood)
        )
      );
    }

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
    // Use fallback if 2 or fewer items detected after filtering
    let useComplexDishFallback = visualFoodItems.length <= 2;
    
    if (hasStrongVisualDetection && !useComplexDishFallback) {
      // High confidence visual detection
      const sortedVisualItems = visualFoodItems.sort((a, b) => b.score - a.score);
      inputText = sortedVisualItems.map(item => `${item.description} (${item.type}, confidence: ${item.score.toFixed(2)})`).join(', ');
      detectionMethod = 'high_confidence_visual';
      console.log('🎯 Using high-confidence visual detection:', inputText);
    } else if ((hasModerateVisualDetection || hasWeakVisualDetection) && !useComplexDishFallback) {
      // Moderate/weak visual detection
      const sortedVisualItems = visualFoodItems.sort((a, b) => b.score - a.score);
      inputText = sortedVisualItems.map(item => `${item.description} (${item.type}, confidence: ${item.score.toFixed(2)})`).join(', ');
      detectionMethod = 'moderate_confidence_visual';
      console.log('📊 Using moderate-confidence visual detection:', inputText);
    } else {
      // Fallback to context-aware guessing
      useComplexDishFallback = true;
      detectionMethod = 'context_aware_fallback';
      console.log('🍲 Using context-aware fallback due to limited detection');
      
      // Create context-aware prompt with detected labels
      const detectedLabels = [
        ...visionResults.labels.map(l => l.description),
        ...visionResults.objects.map(o => o.name),
        ...visionResults.food_labels.map(f => f.description)
      ].slice(0, 8); // Limit to prevent prompt overflow
      inputText = `Scene shows a breakfast/meal with multiple foods. Detected labels: [${detectedLabels.join(', ')}]. Guess what foods are most likely present.`;
      
      // Add OCR context if available
      if (visionResults.textDetected) {
        inputText += ` Menu/text context: ${visionResults.textDetected}`;
      }
    }
    
    // 🔍 VISION FALLBACK: If 2 or fewer items detected, use GPT-4 Vision
    if (visualFoodItems.length <= 2) {
      console.log('🚨 TRIGGERING VISION FALLBACK: Only', visualFoodItems.length, 'items detected');
      
      // Check if we have image data in the request
      const requestBody = await req.clone().json();
      if (requestBody.imageDataUrl) {
        console.log('📷 Using GPT-4 Vision for direct image analysis');
        
        try {
          const visionResults = await analyzeImageWithCaptioning(requestBody.imageDataUrl);
          
          // Mark all vision results as "AI Inferred" for frontend
          const visionResultsWithFlag = visionResults.map(item => ({
            name: item.name,
            portion: item.portion,
            calories: item.calories,
            confidence: item.confidence || 'medium',
            method: 'vision_analysis',
            isAIInferred: true  // Frontend flag
          }));
          
          console.log('✅ Vision fallback successful:', visionResultsWithFlag);
          
          return new Response(
            JSON.stringify({
              items: visionResultsWithFlag,
              analysis: {
                detectionMethod: 'vision_fallback',
                useComplexDishFallback: false,
                visualItemsFound: visualFoodItems.length,
                visionFallbackUsed: true,
                strongVisualDetection: false,
                moderateVisualDetection: false,
                appearsToBeComplexDish: false
              }
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        } catch (visionError) {
          console.error('❌ Vision fallback failed:', visionError);
          // Continue with normal processing
        }
      } else {
        console.log('⚠️ No image data available for vision fallback');
      }
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
    
    console.log("🧠 Detection method selected:", detectionMethod);
    console.log("🍲 Using complex dish fallback:", useComplexDishFallback);
    console.log("📊 Input text for OpenAI:", inputText);
    
    if (useComplexDishFallback || detectionMethod === 'context_aware_fallback') {
      // Context-aware OpenAI fallback prompt for when filtering fails
      prompt = `You are an expert food analyst examining a breakfast/meal photo. Based on the visual context and detected labels, identify INDIVIDUAL EDIBLE FOOD ITEMS that are most likely present.

CONTEXT ANALYSIS:
${inputText}

YOUR TASK:
1. Analyze the scene context (breakfast setting, typical food combinations)
2. Identify 3-5 distinct, realistic food items that would appear in this type of meal
3. Focus on common breakfast foods: toast, eggs, avocado, fruit, pancakes, etc.
4. Provide specific names, not generic terms

STRICT REQUIREMENTS:
- Each item must be a REAL, SPECIFIC food (not "garnish", "side", "topping")
- Include realistic portion sizes and calorie estimates
- NO utensils, plates, or serving items
- NO duplicate foods
- Each food item should have calories listed

EXPECTED FOODS in a typical breakfast:
- Toast or bread (specify type if possible)
- Avocado (sliced, mashed, etc.)
- Eggs (scrambled, fried, poached, etc.)
- Fruit (berries, banana, etc.)
- Pancakes, waffles, or similar
- Beverages (coffee, juice, etc.)

Return a JSON array with objects containing:
- \`name\`: Specific food name (e.g., "sourdough toast", "sliced avocado", "scrambled eggs")
- \`portion\`: Realistic serving size (e.g., "2 slices", "½ avocado", "2 eggs")
- \`calories\`: Estimated calories (required - must be a number)
- \`confidence\`: "high" for obvious items, "medium" for likely items, "low" for guessed items
- \`method\`: "context_analysis"

EXAMPLE:
[
  {"name": "sourdough toast", "portion": "2 slices", "calories": 180, "confidence": "high", "method": "context_analysis"},
  {"name": "sliced avocado", "portion": "½ avocado", "calories": 120, "confidence": "high", "method": "context_analysis"},
  {"name": "scrambled eggs", "portion": "2 eggs", "calories": 140, "confidence": "medium", "method": "context_analysis"},
  {"name": "fresh strawberries", "portion": "½ cup", "calories": 25, "confidence": "medium", "method": "context_analysis"}
]`;
    } else {
      // NEW INTELLIGENT CONTEXT-AWARE PROMPT
      prompt = `You are an AI food analyst with expertise in meal composition and nutrition. Your task is to analyze filtered detection data and intelligently infer the complete meal composition.

FILTERED DETECTION DATA:
${inputText}

INTELLIGENT ANALYSIS INSTRUCTIONS:

🔍 CONTEXT INFERENCE:
- Analyze the detected items to understand the meal type (breakfast, lunch, dinner)
- Infer missing items that are typically present in this type of meal
- Consider common food pairings and meal patterns

🚫 ELIMINATE VAGUE TERMS:
- Remove meaningless labels like "garnish", "ingredient", "produce", "food"
- Convert generic terms to specific foods (e.g., "fruit" → "strawberries")
- Ignore abstract concepts like "cuisine", "meal", "dish"

🧠 SMART INFERENCE EXAMPLES:
- If you see "citrus" → likely "orange slices" or "grapefruit"
- If breakfast context + "bread" → likely "toast" 
- If "protein" detected → infer "eggs" or "bacon" for breakfast
- If "avocado" + toast context → "avocado toast"

📊 OUTPUT REQUIREMENTS:
- List 3-6 specific, realistic food items
- Include realistic portion sizes and accurate calorie estimates
- Prioritize common breakfast/meal foods over obscure items
- Each item must be a real, edible food with nutritional value

TYPICAL BREAKFAST FOODS TO CONSIDER:
🍞 Toast, bagels, English muffins, pastries
🥑 Avocado (sliced, mashed, whole)
🥚 Eggs (scrambled, fried, poached, omelette)
🥞 Pancakes, waffles, French toast
🍓 Fresh fruit (berries, banana, citrus, melon)
🥓 Bacon, sausage, ham
🧈 Butter, cream cheese, jam
☕ Coffee, juice, milk

EXAMPLE ANALYSIS:
Input: "citrus, garnish, culinary arts, produce"
Smart Output:
[
  {"name": "orange slices", "portion": "1 medium orange", "calories": 60, "confidence": "medium", "method": "context_inference"},
  {"name": "whole grain toast", "portion": "2 slices", "calories": 160, "confidence": "medium", "method": "context_inference"},
  {"name": "avocado", "portion": "½ avocado", "calories": 120, "confidence": "medium", "method": "context_inference"}
]

Return a JSON array with objects containing:
- \`name\`: Specific food name (e.g., "whole grain toast", "sliced avocado", "scrambled eggs")
- \`portion\`: Realistic portion size (e.g., "2 slices", "½ avocado", "2 eggs")
- \`calories\`: Estimated calories (required - must be a number)
- \`confidence\`: "high" for detected items, "medium" for likely inferred items, "low" for educated guesses
- \`method\`: "context_inference"

Focus on practical, nutritious foods that people actually eat for meals.`;
    }

    console.log("🧠 INTELLIGENT OpenAI Prompt Being Sent:");
    console.log("=" .repeat(80));
    console.log(prompt);
    console.log("=" .repeat(80));
    
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
    
    console.log("📦 RAW OpenAI Response:");
    console.log("=" .repeat(80));
    console.log(aiResponse);
    console.log("=" .repeat(80));
    console.log('🔧 OpenAI Response Metadata:', {
      model: data.model,
      usage: data.usage,
      finish_reason: data.choices[0]?.finish_reason
    });


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