// LOVABLE — MULTI-SOURCE FOOD DETECTION

import { supabase } from "@/integrations/supabase/client";

// Real Google Vision API call via Supabase edge function
async function detectWithGoogle(image: string): Promise<Array<{ name: string; confidence: number; source: string }>> {
  return await callGoogleVision(image);
}

async function callGoogleVision(imageBase64: string): Promise<Array<{ name: string; confidence: number; source: string }>> {
  try {
    console.log('Calling Google Vision for food detection...');
    
    // Call our dedicated Google Vision edge function
    const { data, error } = await supabase.functions.invoke('google-vision-food-detector', {
      body: { imageBase64: imageBase64 }
    });

    if (error) {
      console.error('Google Vision API error:', error);
      return [];
    }

    if (!data || !data.foodItems) {
      console.log('No food items returned from Google Vision');
      return [];
    }

    console.log('Google Vision detected food items:', data.foodItems);
    return Array.isArray(data.foodItems) ? data.foodItems : [];

  } catch (error) {
    console.error('Google Vision detection failed:', error);
    return [];
  }
}

async function detectWithCalorieMama(image: string): Promise<Array<{ name: string; confidence: number; source: string }>> {
  return await callCalorieMama(image);
}

// CalorieMama API call for food detection
async function callCalorieMama(imageBase64: string): Promise<Array<{ name: string; confidence: number; source: string }>> {
  try {
    console.log('Calling CalorieMama API for food detection...');
    
    // Call our Supabase edge function that handles CalorieMama API
    const { data, error } = await supabase.functions.invoke('caloriemama-food-detector', {
      body: { imageBase64: imageBase64 }
    });

    if (error) {
      console.error('CalorieMama API error:', error);
      return [];
    }

    if (!data || !data.foodItems) {
      console.log('No food items returned from CalorieMama');
      return [];
    }

    console.log('CalorieMama detected food items:', data.foodItems);
    // Convert string array to structured format
    const structuredItems = Array.isArray(data.foodItems) 
      ? data.foodItems.map((item: any) => ({
          name: typeof item === 'string' ? item : item.name,
          confidence: typeof item === 'object' && item.confidence ? item.confidence : 0.8,
          source: 'caloriemama'
        }))
      : [];
    
    return structuredItems;

  } catch (error) {
    console.error('CalorieMama detection failed:', error);
    return [];
  }
}

async function detectWithChatGPT(image: string): Promise<Array<{ name: string; confidence: number; source: string }>> {
  return await callGPT4Vision(image);
}

// GPT-4 Vision API call for food detection

async function callGPT4Vision(imageBase64: string): Promise<Array<{ name: string; confidence: number; source: string }>> {
  try {
    console.log('Calling GPT-4 Vision for food detection...');
    
    // Call our Supabase edge function that handles OpenAI API
    const { data, error } = await supabase.functions.invoke('gpt4-vision-food-detector', {
      body: { 
        imageBase64: imageBase64,
        prompt: "You are a food recognition assistant. Look at this image and return only a list of food items that are clearly visible in the photo. Respond only with the food names as a plain JSON array."
      }
    });

    if (error) {
      console.error('GPT-4 Vision API error:', error);
      return [];
    }

    if (!data || !data.foodItems) {
      console.log('No food items returned from GPT-4 Vision');
      return [];
    }

    console.log('GPT-4 Vision detected food items:', data.foodItems);
    // Convert string array to structured format
    const structuredItems = Array.isArray(data.foodItems) 
      ? data.foodItems.map((item: any) => ({
          name: typeof item === 'string' ? item : item.name,
          confidence: typeof item === 'object' && item.confidence ? item.confidence : 0.85,
          source: 'gpt'
        }))
      : [];
    
    return structuredItems;

  } catch (error) {
    console.error('GPT-4 Vision detection failed:', error);
    return [];
  }
}

// GastroNet API call for food detection (placeholder)
async function callGastroNet(image: string): Promise<Array<{ name: string; confidence: number; source: string }>> {
  try {
    console.log('Calling GastroNet API (simulated)...');
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock response with realistic food detection data
    const mockResponse = [
      { name: 'Scrambled Eggs', confidence: 0.83, source: 'GastroNet' },
      { name: 'Avocado Toast', confidence: 0.76, source: 'GastroNet' }
    ];
    
    console.log('GastroNet detected food items (simulated):', mockResponse);
    return mockResponse;
    
  } catch (error) {
    console.error('GastroNet detection failed:', error);
    return [];
  }
}

async function detectWithGastroNet(image: string): Promise<Array<{ name: string; confidence: number; source: string }>> {
  return await callGastroNet(image);
}

async function detectWithClarifai(image: string): Promise<Array<{ name: string; confidence: number; source: string }>> {
  // TODO: Implement Clarifai API food detection
  console.log('Clarifai detection (placeholder)', image.slice(0, 50));
  return [];
}

async function callClaudeVision(imageBase64: string): Promise<Array<{ name: string; confidence: number; source: string }>> {
  try {
    console.log('Calling Claude Vision for food detection...');
    
    // Call our Supabase edge function that handles Claude Vision API
    const { data, error } = await supabase.functions.invoke('claude-vision-food-detector', {
      body: { imageBase64: imageBase64 }
    });

    if (error) {
      console.error('Claude Vision API error:', error);
      return [];
    }

    if (!data || !data.foodItems) {
      console.log('No food items returned from Claude Vision');
      return [];
    }

    console.log('Claude Vision detected food items:', data.foodItems);
    return Array.isArray(data.foodItems) ? data.foodItems : [];

  } catch (error) {
    console.error('Claude Vision detection failed:', error);
    return [];
  }
}

async function detectWithClaude(image: string): Promise<Array<{ name: string; confidence: number; source: string }>> {
  return await callClaudeVision(image);
}

export async function detectFoodsFromAllSources(image: string): Promise<{ name: string; confidence: number; sources: string[] }[]> {
  // Run all AI detectors in parallel
  const [googleResults, calorieMamaResults, gptResults, gastroNetResults, claudeResults, clarifaiResults] = await Promise.all([
    detectWithGoogle(image),
    detectWithCalorieMama(image),
    detectWithChatGPT(image),
    detectWithGastroNet(image),
    detectWithClaude(image),
    detectWithClarifai(image)
  ]);

  // Combine all results into a single array
  const allResults = [
    ...googleResults,
    ...calorieMamaResults,
    ...gptResults,
    ...gastroNetResults,
    ...claudeResults,
    ...clarifaiResults
  ];

  // Create a map to merge duplicates by lowercase name
  const foodMap: Record<string, { name: string; confidence: number; sources: string[] }> = {};

  for (const item of allResults) {
    const normalizedName = item.name.trim().toLowerCase();
    
    if (!foodMap[normalizedName]) {
      foodMap[normalizedName] = {
        name: item.name, // Keep original casing from first occurrence
        confidence: item.confidence,
        sources: [item.source]
      };
    } else {
      // Merge with existing entry
      const existing = foodMap[normalizedName];
      existing.confidence = Math.max(existing.confidence, item.confidence); // Keep highest confidence
      if (!existing.sources.includes(item.source)) {
        existing.sources.push(item.source);
      }
    }
  }

  // Convert to array and sort
  const finalResults = Object.values(foodMap).sort((a, b) => {
    // First sort by number of sources (more sources = higher priority)
    if (a.sources.length !== b.sources.length) {
      return b.sources.length - a.sources.length;
    }
    // Then sort by confidence (descending)
    return b.confidence - a.confidence;
  });

  console.log('Final merged and sorted results:', finalResults);
  return finalResults;
}