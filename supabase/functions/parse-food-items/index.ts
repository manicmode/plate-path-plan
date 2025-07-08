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

    // Prioritize visual food detection over OCR text
    const visualFoodItems = [
      ...visionResults.foodLabels.map(l => ({ type: 'food_label', description: l.description, score: l.score })),
      ...visionResults.objects.filter(o => 
        // Filter objects that are likely food items
        ['food', 'fruit', 'vegetable', 'meat', 'bread', 'cheese', 'pasta', 'rice', 'fish', 'chicken', 'beef', 'pork', 'salad', 'soup', 'pizza', 'sandwich', 'burger', 'cake', 'cookie', 'apple', 'banana', 'orange', 'potato', 'tomato', 'carrot', 'broccoli', 'lettuce', 'onion', 'garlic', 'egg', 'milk', 'yogurt', 'cereal', 'nuts', 'berries'].some(foodWord => 
          o.name.toLowerCase().includes(foodWord)
        )
      ).map(o => ({ type: 'object', description: o.name, score: o.score })),
      ...visionResults.labels.filter(l => 
        // Filter general labels that are food-related with high confidence
        l.score > 0.7 && ['food', 'cuisine', 'dish', 'meal', 'snack', 'breakfast', 'lunch', 'dinner', 'dessert', 'beverage', 'drink'].some(foodWord =>
          l.description.toLowerCase().includes(foodWord)
        )
      ).map(l => ({ type: 'label', description: l.description, score: l.score }))
    ];

    // Only use OCR text if no strong visual food items are detected
    const hasStrongVisualDetection = visualFoodItems.some(item => item.score > 0.8);
    
    let inputText = '';
    if (visualFoodItems.length > 0) {
      // Prioritize visual detection
      const sortedVisualItems = visualFoodItems.sort((a, b) => b.score - a.score);
      inputText = sortedVisualItems.map(item => `${item.description} (${item.type}, confidence: ${item.score.toFixed(2)})`).join(', ');
      
      // Only add OCR text if visual detection is weak or if it might contain portion information
      if (!hasStrongVisualDetection && visionResults.textDetected) {
        inputText += `, OCR_TEXT: ${visionResults.textDetected}`;
      }
      
      console.log('Using visual-prioritized detection:', inputText);
    } else {
      // Fallback to all detection methods
      inputText = [
        ...visionResults.labels.map(l => l.description),
        visionResults.textDetected
      ].filter(Boolean).join(', ');
      
      console.log('Using fallback detection (no visual food items):', inputText);
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

    // Call OpenAI with the exact prompt specified
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
            content: `The following contains visual food detection results and/or OCR text from an image. PRIORITIZE visually detected food items over text from packaging. Extract INDIVIDUAL food items as separate entries - if multiple foods are visible (like "bread and shrimp" or "salad with chicken"), split them into separate items. Return JSON array with \`name\` and \`portion\`, no other details. Focus on real food visible in the image, not marketing text. Each detected food should be its own item.

Input: ${inputText}`
          }
        ],
        max_tokens: 500,
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

    console.log('Final parsed items:', parsedItems);

    return new Response(
      JSON.stringify(parsedItems),
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