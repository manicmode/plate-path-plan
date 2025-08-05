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

    // 🧠 Ultimate AI Detection Filtering - Collect all detected items
    const allDetectedItems = [
      ...visionResults.foodLabels.map(l => ({ 
        name: l.description, 
        confidence: l.score, 
        type: 'food_label' as const,
        score: l.score 
      })),
      ...visionResults.objects.map(o => ({ 
        name: o.name, 
        confidence: o.score, 
        type: 'object' as const,
        score: o.score 
      })),
      ...visionResults.labels.map(l => ({ 
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
      prompt = `Analyze this cooked meal/complex dish focusing ONLY on edible food items. Identify individual food components separately (e.g., pancakes, toast, avocado, fruit bowl, egg whites) with realistic portion estimates.

STRICT FILTERING RULES:
1. EXCLUDE ALL non-food objects: plates, bowls, forks, knives, spoons, utensils, containers, napkins, tables, glasses, serveware
2. EXCLUDE abstract food labels like "brunch", "breakfast", "meal", "dish", "cuisine"
3. FOCUS ONLY on individual edible items you can actually see
4. Estimate portions in realistic units (e.g., "2 slices toast", "3 pancakes", "½ avocado", "1 cup fruit")
5. Use clean, simple food names (e.g., "scrambled eggs" not "protein-rich breakfast eggs")

PORTION ESTIMATION: Be realistic with serving sizes based on typical portions:
- Bread: count slices (1-2 slices)
- Pancakes: count pieces (2-4 pancakes)
- Eggs: count whole eggs or cups for scrambled
- Fruits: use common measures (½ avocado, 1 banana, ¼ cup berries)
- Include estimated calories if confident

Input data: ${inputText}

Return a JSON array with objects containing:
- \`name\`: Clean, specific food name (e.g., "scrambled eggs", "whole wheat toast")
- \`portion\`: Realistic portion size with units (e.g., "2 slices", "3 pancakes", "½ cup")
- \`calories\`: Estimated calories if possible (optional)
- \`confidence\`: Detection confidence as "high", "medium", or "low"
- \`method\`: "visual_segmentation" or "dish_analysis_fallback"

Only include actual edible food items visible in the image.`;
    } else {
      // Standard analysis prompt  
      prompt = `Analyze this food image focusing ONLY on edible food items. Identify individual items separately with realistic portion estimates.

STRICT FILTERING RULES:
1. EXCLUDE ALL non-food objects: plates, bowls, forks, knives, spoons, utensils, containers, napkins, tables, glasses, serveware
2. EXCLUDE abstract labels like "brunch", "meal", "dish", "cuisine", "serveware"
3. IDENTIFY individual food items separately (e.g., if you see "toast and eggs", list as separate items: "toast" and "scrambled eggs")
4. Estimate portions in realistic units (e.g., "2 slices bread", "1 cup rice", "4 oz chicken")
5. Use clean, simple food names without marketing terms

PORTION ESTIMATION: Be realistic with serving sizes:
- Count discrete items (2 cookies, 3 meatballs)
- Use standard measurements (1 cup, ½ cup, 4 oz)
- Include estimated calories if confident

Input data: ${inputText}

Return a JSON array with objects containing:
- \`name\`: Clean, specific food name (e.g., "grilled chicken", "brown rice")
- \`portion\`: Realistic portion size with units (e.g., "4 oz", "½ cup", "2 pieces")
- \`calories\`: Estimated calories if possible (optional)
- \`confidence\`: Detection confidence as "high", "medium", or "low"
- \`method\`: "visual_detection"

Only include actual edible food items you can see in the image.`;
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