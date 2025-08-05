// LOVABLE — MULTI-SOURCE FOOD DETECTION

import { supabase } from "@/integrations/supabase/client";

// Real Google Vision API call via Supabase edge function
async function detectWithGoogle(image: string): Promise<string[]> {
  try {
    console.log('Calling Google Vision via Supabase edge function...');
    
    const { data, error } = await supabase.functions.invoke('vision-label-reader', {
      body: { imageBase64: image }
    });

    if (error) {
      console.error('Vision API error:', error);
      return [];
    }

    if (!data) {
      console.log('No data returned from vision API');
      return [];
    }

    console.log('Vision API response:', data);

    // Extract food items from various sources in the response
    const foodItems: string[] = [];
    
    // Add food labels (most relevant)
    if (data.foodLabels && Array.isArray(data.foodLabels)) {
      foodItems.push(...data.foodLabels.map((label: any) => 
        typeof label === 'string' ? label : label.name || label.description
      ).filter(Boolean));
    }

    // Add general labels that might be food-related
    if (data.labels && Array.isArray(data.labels)) {
      const foodRelatedLabels = data.labels
        .map((label: any) => typeof label === 'string' ? label : label.name || label.description)
        .filter((label: string) => {
          const lowerLabel = label.toLowerCase();
          return lowerLabel.includes('food') || 
                 lowerLabel.includes('fruit') || 
                 lowerLabel.includes('vegetable') || 
                 lowerLabel.includes('meat') || 
                 lowerLabel.includes('drink') ||
                 lowerLabel.includes('bread') ||
                 lowerLabel.includes('dairy');
        });
      foodItems.push(...foodRelatedLabels);
    }

    // Remove duplicates and normalize
    const uniqueFoodItems = [...new Set(foodItems)]
      .map(item => item.trim())
      .filter(item => item.length > 0);

    console.log('Extracted food items from Google Vision:', uniqueFoodItems);
    return uniqueFoodItems;

  } catch (error) {
    console.error('Google Vision detection failed:', error);
    return [];
  }
}

async function detectWithCalorieMama(image: string): Promise<string[]> {
  // TODO: Implement CalorieMama API food detection
  console.log('CalorieMama detection (placeholder)', image.slice(0, 50));
  return [];
}

async function detectWithChatGPT(image: string): Promise<string[]> {
  // TODO: Implement ChatGPT Vision API food detection
  console.log('ChatGPT Vision detection (placeholder)', image.slice(0, 50));
  return [];
}

async function detectWithGastroNet(image: string): Promise<string[]> {
  // TODO: Implement GastroNet API food detection
  console.log('GastroNet detection (placeholder)', image.slice(0, 50));
  return [];
}

async function detectWithClarifai(image: string): Promise<string[]> {
  // TODO: Implement Clarifai API food detection
  console.log('Clarifai detection (placeholder)', image.slice(0, 50));
  return [];
}

async function enhanceWithClaude(imageBase64: string, combinedLabels: string[]): Promise<string[]> {
  // Skip Claude if we have 3+ items and high confidence
  if (combinedLabels.length >= 3) {
    console.log('Skipping Claude enhancement - sufficient labels found:', combinedLabels.length);
    return [];
  }

  try {
    // TODO: Implement Claude 3 Vision API call
    // Send image and existing labels to Claude
    // Ask Claude to confirm which food items are actually present
    console.log('Claude enhancement (placeholder)', {
      imageLength: imageBase64.length,
      existingLabels: combinedLabels
    });
    
    // Placeholder response - would normally call Anthropic API
    const mockResponse = "Based on the image, I can confirm the following food items: apple, banana, sandwich";
    
    // Parse Claude's response into array of food items
    const foodItems = mockResponse
      .replace(/^.*following food items:\s*/i, '')
      .split(/[,\n]/)
      .map(item => item.trim().toLowerCase())
      .filter(item => item.length > 0);
    
    console.log('Claude enhanced food items:', foodItems);
    return foodItems;
  } catch (error) {
    console.error('Claude enhancement failed:', error);
    return [];
  }
}

export async function detectFoodsFromAllSources(image: string): Promise<{ name: string; sources: string[] }[]> {
  const results: Record<string, string[]> = {
    Google: await detectWithGoogle(image),          // placeholder
    CalorieMama: await detectWithCalorieMama(image),// placeholder
    ChatGPT: await detectWithChatGPT(image),        // placeholder
    GastroNet: await detectWithGastroNet(image),    // placeholder
    Clarifai: await detectWithClarifai(image),      // placeholder
  };

  const foodMap: Record<string, Set<string>> = {};

  for (const [source, items] of Object.entries(results)) {
    for (let item of items) {
      item = item.trim().toLowerCase(); // Normalize
      if (!foodMap[item]) foodMap[item] = new Set();
      foodMap[item].add(source);
    }
  }

  return Object.entries(foodMap).map(([name, sources]) => ({
    name,
    sources: Array.from(sources),
  }));
}