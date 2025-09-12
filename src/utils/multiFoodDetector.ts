// 🧠 GPT-POWERED FOOD DETECTION
// Now exclusively using GPT models with smart routing

import { supabase } from "@/integrations/supabase/client";
import { routeGPTModel } from "./GPTRouter";
import { ANALYSIS_TIMEOUT_MS } from '@/config/timeouts';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { prepareImageForAnalysis } from '@/lib/img/prepareImageForAnalysis';

// Real Google Vision API call via Supabase edge function
async function detectWithGoogle(image: string): Promise<Array<{ name: string; confidence: number; source: string }>> {
  // 🚫 DISABLED: Google Vision API to avoid costs
  // return await callGoogleVision(image);
  return [];
}

async function callGoogleVision(imageBase64: string): Promise<Array<{ name: string; confidence: number; source: string }>> {
  // 🚫 DISABLED: Google Vision API to avoid costs
  // Keep function structure intact for future reactivation
  /*
  try {
    console.log('🔍 [Google Vision] Starting food detection call...');
    console.log('🔍 [Google Vision] Image data length:', imageBase64.length);
    
    // Call our dedicated Google Vision edge function
    const { data, error } = await supabase.functions.invoke('google-vision-food-detector', {
      body: { imageBase64: imageBase64 }
    });

    console.log('🔍 [Google Vision] Raw response data:', data);
    console.log('🔍 [Google Vision] Raw response error:', error);

    if (error) {
      console.error('🔴 [Google Vision] API error:', error);
      return [];
    }

    if (!data) {
      console.log('🔴 [Google Vision] No data returned from API');
      return [];
    }

    if (!data.foodItems) {
      console.log('🔴 [Google Vision] No foodItems property in response');
      console.log('🔍 [Google Vision] Full response structure:', JSON.stringify(data, null, 2));
      return [];
    }

    console.log('✅ [Google Vision] Food items detected:', data.foodItems);
    console.log('🔍 [Google Vision] Items count:', Array.isArray(data.foodItems) ? data.foodItems.length : 'Not an array');
    
    if (Array.isArray(data.foodItems)) {
      data.foodItems.forEach((item: any, index: number) => {
        console.log(`🔍 [Google Vision] Item ${index}:`, {
          name: item.name,
          confidence: item.confidence,
          source: item.source
        });
      });
    }

    return Array.isArray(data.foodItems) ? data.foodItems : [];

  } catch (error) {
    console.error('🔴 [Google Vision] Detection failed with exception:', error);
    return [];
  }
  */
  return [];
}

async function detectWithCalorieMama(image: string): Promise<Array<{ name: string; confidence: number; source: string }>> {
  // 🚫 DISABLED: CalorieMama API to avoid costs
  // return await callCalorieMama(image);
  return [];
}

// CalorieMama API call for food detection
async function callCalorieMama(imageBase64: string): Promise<Array<{ name: string; confidence: number; source: string }>> {
  // 🚫 DISABLED: CalorieMama API to avoid costs
  // Keep function structure intact for future reactivation
  /*
  try {
    console.log('🍕 [CalorieMama] Starting food detection call...');
    console.log('🍕 [CalorieMama] Image data length:', imageBase64.length);
    
    // Call our Supabase edge function that handles CalorieMama API
    const { data, error } = await supabase.functions.invoke('caloriemama-food-detector', {
      body: { imageBase64: imageBase64 }
    });

    console.log('🍕 [CalorieMama] Raw response data:', data);
    console.log('🍕 [CalorieMama] Raw response error:', error);

    if (error) {
      console.error('🔴 [CalorieMama] API error:', error);
      return [];
    }

    if (!data) {
      console.log('🔴 [CalorieMama] No data returned from API');
      return [];
    }

    if (!data.foodItems) {
      console.log('🔴 [CalorieMama] No foodItems property in response');
      console.log('🍕 [CalorieMama] Full response structure:', JSON.stringify(data, null, 2));
      return [];
    }

    console.log('✅ [CalorieMama] Food items detected:', data.foodItems);
    console.log('🍕 [CalorieMama] Items count:', Array.isArray(data.foodItems) ? data.foodItems.length : 'Not an array');
    console.log('🍕 [CalorieMama] Items type check:', typeof data.foodItems);

    // Convert string array to structured format
    const structuredItems = Array.isArray(data.foodItems) 
      ? data.foodItems.map((item: any, index: number) => {
          const structuredItem = {
            name: typeof item === 'string' ? item : item.name,
            confidence: typeof item === 'object' && item.confidence ? item.confidence : 0.8,
            source: 'caloriemama'
          };
          console.log(`🍕 [CalorieMama] Structured item ${index}:`, structuredItem);
          return structuredItem;
        })
      : [];
    
    console.log('🍕 [CalorieMama] Final structured items:', structuredItems);
    return structuredItems;

  } catch (error) {
    console.error('🔴 [CalorieMama] Detection failed with exception:', error);
    return [];
  }
  */
  return [];
}

async function detectWithChatGPT(image: string): Promise<Array<{ name: string; confidence: number; source: string }>> {
  return await callGPT4Vision(image);
}

// GPT-4 Vision API call for food detection

async function callGPT4Vision(imageBase64: string): Promise<Array<{ name: string; confidence: number; source: string }>> {
  try {
    console.log('🚀 [GPT-5 Vision] Starting food detection with GPT-5...');
    const startTime = Date.now();
    
    let finalImageBase64 = imageBase64;
    
    // Apply photo encoder if enabled (for gallery/camera images)
    if (isFeatureEnabled('photo_encoder_v1')) {
      try {
        // Convert base64 back to blob for processing
        const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'image/jpeg' });
        
        const prep = await prepareImageForAnalysis(blob, {
          maxEdge: 1280,
          quality: 0.7, 
          targetMaxBytes: 900_000
        });
        
        console.log('🖼️ [GPT-5 Vision] Image optimized:', { 
          w: prep.width, h: prep.height, bytes: prep.bytes 
        });
        finalImageBase64 = prep.base64NoPrefix;
      } catch (encoderError) {
        console.warn('⚠️ [GPT-5 Vision] Photo encoder failed, using original:', encoderError);
        // Continue with original image
      }
    }
    
    // Call our Supabase edge function that handles OpenAI API (client-side timeout handled at app level)
    const { data, error } = await supabase.functions.invoke('gpt5-vision-food-detector', {
      body: { 
        imageBase64: finalImageBase64,
        prompt: "You are a food recognition assistant. Look at this image and return only a list of food items that are clearly visible in the photo. Respond only with the food names as a plain JSON array."
      }
    });

    const latency = Date.now() - startTime;
    
    if (error) {
      console.error('🚀 [GPT-5 Vision] API error:', error);
      return [];
    }

    if (!data || !data.foodItems) {
      console.log('🚀 [GPT-5 Vision] No food items returned');
      return [];
    }

    // Log GPT-5 performance metrics
    console.log('🚀 [GPT-5 Vision] Performance metrics:', {
      model: data.model_used || 'gpt-5',
      latency_ms: latency,
      tokens: data.processing_stats?.tokens,
      fallback_used: data.fallback_used || false
    });
    
    console.log('🚀 [GPT-5 Vision] Food items detected:', data.foodItems);
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

// Filter to remove irrelevant or generic labels
function isRelevantFoodItem(name: string): boolean {
  const normalizedName = name.trim().toLowerCase();
  const irrelevantLabels = [
    'food', 'dishware', 'serveware', 'comfort food', 'fast food', 
    'ingredient', 'recipe', 'cuisine', 'meal', 'lunch', 'dinner', 'cooked meat'
  ];
  
  // Check if the name is just one of the irrelevant labels
  if (irrelevantLabels.includes(normalizedName)) {
    return false;
  }
  
  // Allow if it's part of a more specific phrase (e.g., "chicken dinner" is OK)
  return true;
}

export async function detectFoodsFromAllSources(image: string, abortSignal?: AbortSignal): Promise<{ name: string; confidence: number; sources: string[] }[]> {
  console.log('🧠 [GPT Detection] Starting smart GPT-powered food detection...');
  
  // Add 10-second timeout for food detection
  const detectionPromise = (async () => {
    // Check for abort signal
    if (abortSignal?.aborted) {
      throw new Error('Detection aborted');
    }

    // Use GPT as primary detection engine
    console.log('🧠 [GPT Detection] Using GPT Vision with smart model routing...');
    const gptResults = await detectWithChatGPT(image);
    
    // Check for abort signal after GPT call
    if (abortSignal?.aborted) {
      throw new Error('Detection aborted');
    }
    
    return gptResults;
  })();
  
  // Add timeout to detection using shared constant
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('DETECTION_TIMEOUT: Food detection took too long'));
    }, ANALYSIS_TIMEOUT_MS);
  });
  
  let gptResults;
  try {
    gptResults = await Promise.race([detectionPromise, timeoutPromise]);
  } catch (error) {
    console.error('❌ GPT detection failed or timed out:', error);
    return [];
  }

  console.log('🧠 [GPT Detection] Detection results:');
  console.log('  - GPT Vision:', gptResults.length, 'items');

  // Use only GPT results for optimal performance and cost efficiency
  const allResults = [...gptResults];

  console.log('🧠 [GPT Detection] Total results before filtering:', allResults.length);
  console.log('🧠 [GPT Detection] Raw GPT results:', allResults);

  // Create a map to merge duplicates by lowercase name
  const foodMap: Record<string, { name: string; confidence: number; sources: string[] }> = {};

  for (const item of allResults) {
    const normalizedName = item.name.trim().toLowerCase();
    console.log(`🧠 [GPT Detection] Processing item: "${item.name}" (confidence: ${item.confidence}, source: ${item.source})`);
    
    // Filter out irrelevant items
    if (!isRelevantFoodItem(item.name)) {
      console.log('🗑️ [GPT Detection] Filtered out irrelevant item:', item.name);
      continue;
    }
    
    // Cap confidence at 100%
    const cappedConfidence = Math.min(item.confidence * 100, 100) / 100;
    console.log(`🧠 [GPT Detection] Capped confidence: ${item.confidence} -> ${cappedConfidence}`);
    
    if (!foodMap[normalizedName]) {
      foodMap[normalizedName] = {
        name: item.name, // Keep original casing from first occurrence
        confidence: cappedConfidence,
        sources: [item.source]
      };
      console.log(`✅ [GPT Detection] Added new item: "${item.name}"`);
    } else {
      // Merge with existing entry
      const existing = foodMap[normalizedName];
      existing.confidence = Math.max(existing.confidence, cappedConfidence); // Keep highest confidence
      if (!existing.sources.includes(item.source)) {
        existing.sources.push(item.source);
      }
      console.log(`🔗 [GPT Detection] Merged item: "${item.name}" (sources: ${existing.sources.join(', ')})`);
    }
  }

  console.log('🧠 [GPT Detection] Food map after processing:', foodMap);

  // Convert to array and sort by confidence
  const finalResults = Object.values(foodMap).sort((a, b) => {
    // Sort by confidence (descending)
    return b.confidence - a.confidence;
  });

  console.log('✅ [GPT Detection] Final results:', finalResults);
  console.log('✅ [GPT Detection] Total items detected:', finalResults.length);
  return finalResults;
}