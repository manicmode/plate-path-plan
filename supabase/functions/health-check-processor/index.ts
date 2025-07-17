import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthFlag {
  type: 'warning' | 'danger' | 'good';
  icon: string;
  title: string;
  description: string;
}

interface HealthReport {
  productName: string;
  ingredients: string[];
  healthFlags: HealthFlag[];
  healthScore: number;
  nutritionSummary: string;
  summary: string;
  recommendations: string[];
}

interface ProcessedInput {
  type: 'barcode' | 'image' | 'voice' | 'text';
  content: string;
  imageData?: string;
}

// Health analysis patterns
const INGREDIENT_FLAGS = {
  danger: [
    { pattern: /high fructose corn syrup|HFCS/i, title: "High Fructose Corn Syrup", description: "Linked to obesity and metabolic dysfunction" },
    { pattern: /soybean oil|canola oil|vegetable oil|corn oil/i, title: "Refined Seed Oils", description: "High in inflammatory omega-6 fatty acids" },
    { pattern: /monosodium glutamate|MSG/i, title: "MSG", description: "May trigger headaches and digestive issues" },
    { pattern: /aspartame|sucralose|acesulfame/i, title: "Artificial Sweeteners", description: "May disrupt gut microbiome and metabolism" },
    { pattern: /sodium nitrite|sodium nitrate/i, title: "Nitrites/Nitrates", description: "Potential carcinogenic compounds in processed meats" },
    { pattern: /trans fat|partially hydrogenated/i, title: "Trans Fats", description: "Increases risk of heart disease and inflammation" },
    { pattern: /yellow #5|red #40|blue #1|artificial color/i, title: "Artificial Colors", description: "Linked to hyperactivity and allergic reactions" },
  ],
  warning: [
    { pattern: /sugar|glucose|fructose|dextrose/i, title: "Added Sugars", description: "Contributes to blood sugar spikes and weight gain" },
    { pattern: /sodium/i, title: "High Sodium", description: "May contribute to high blood pressure" },
    { pattern: /preservative|BHA|BHT|sodium benzoate/i, title: "Preservatives", description: "Some linked to allergic reactions and health concerns" },
    { pattern: /natural flavor|artificial flavor/i, title: "Natural/Artificial Flavors", description: "Vague ingredient that may contain additives" },
    { pattern: /carrageenan/i, title: "Carrageenan", description: "May cause digestive inflammation in sensitive individuals" },
  ],
  good: [
    { pattern: /organic/i, title: "Organic", description: "Free from synthetic pesticides and GMOs" },
    { pattern: /whole grain|quinoa|brown rice/i, title: "Whole Grains", description: "Rich in fiber and nutrients" },
    { pattern: /olive oil|avocado oil|coconut oil/i, title: "Healthy Oils", description: "Contains beneficial fats and antioxidants" },
    { pattern: /probiotic|live cultures/i, title: "Probiotics", description: "Supports digestive and immune health" },
    { pattern: /vitamin|mineral|omega-3/i, title: "Added Nutrients", description: "Fortified with beneficial vitamins and minerals" },
  ]
};

function analyzeIngredients(ingredients: string[]): HealthFlag[] {
  const flags: HealthFlag[] = [];
  const ingredientText = ingredients.join(' ').toLowerCase();

  // Check for danger flags
  INGREDIENT_FLAGS.danger.forEach(flag => {
    if (flag.pattern.test(ingredientText)) {
      flags.push({
        type: 'danger',
        icon: '🔥',
        title: flag.title,
        description: flag.description
      });
    }
  });

  // Check for warning flags
  INGREDIENT_FLAGS.warning.forEach(flag => {
    if (flag.pattern.test(ingredientText)) {
      flags.push({
        type: 'warning',
        icon: '⚠️',
        title: flag.title,
        description: flag.description
      });
    }
  });

  // Check for good flags
  INGREDIENT_FLAGS.good.forEach(flag => {
    if (flag.pattern.test(ingredientText)) {
      flags.push({
        type: 'good',
        icon: '✅',
        title: flag.title,
        description: flag.description
      });
    }
  });

  return flags;
}

function calculateHealthScore(flags: HealthFlag[]): number {
  let score = 7.0; // Start with neutral score
  
  flags.forEach(flag => {
    switch (flag.type) {
      case 'danger':
        score -= 2.0;
        break;
      case 'warning':
        score -= 1.0;
        break;
      case 'good':
        score += 1.0;
        break;
    }
  });

  return Math.max(0, Math.min(10, score));
}

async function fetchProductByBarcode(barcode: string): Promise<any | null> {
  try {
    console.log(`Fetching product data for barcode: ${barcode}`);
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();
    
    if (data.status === 1 && data.product) {
      return data.product;
    }
    return null;
  } catch (error) {
    console.error('Error fetching product by barcode:', error);
    return null;
  }
}

async function analyzeImageWithGoogleVision(imageData: string): Promise<{ labels: string[], text: string }> {
  try {
    const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
    if (!apiKey) {
      throw new Error('Google Vision API key not configured');
    }

    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: imageData },
          features: [
            { type: 'LABEL_DETECTION', maxResults: 10 },
            { type: 'TEXT_DETECTION', maxResults: 5 }
          ]
        }]
      })
    });

    const result = await response.json();
    const labels = result.responses[0]?.labelAnnotations?.map((label: any) => label.description) || [];
    const text = result.responses[0]?.textAnnotations?.[0]?.description || '';

    return { labels, text };
  } catch (error) {
    console.error('Error analyzing image:', error);
    return { labels: [], text: '' };
  }
}

async function transcribeAudio(audioData: string): Promise<string> {
  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Convert base64 to binary
    const binaryAudio = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
    
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
      },
      body: formData,
    });

    const result = await response.json();
    return result.text || '';
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return '';
  }
}

async function analyzeWithGPT(prompt: string): Promise<any> {
  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a nutrition expert. Provide accurate ingredient lists and nutritional analysis. Return responses in valid JSON format only.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    try {
      return JSON.parse(content);
    } catch {
      // If not valid JSON, return a structured response
      return {
        productName: "Unknown Product",
        ingredients: ["Unable to parse ingredients"],
        nutritionSummary: content || "No analysis available"
      };
    }
  } catch (error) {
    console.error('Error analyzing with GPT:', error);
    return {
      productName: "Analysis Error",
      ingredients: ["Error occurred during analysis"],
      nutritionSummary: "Unable to complete analysis"
    };
  }
}

async function processInput(input: ProcessedInput): Promise<HealthReport> {
  console.log(`Processing ${input.type} input:`, input.content);

  // Step 1: Check if input is a barcode
  const barcodeMatch = input.content.match(/\b\d{8,13}\b/);
  if (barcodeMatch || input.type === 'barcode') {
    const barcode = barcodeMatch ? barcodeMatch[0] : input.content;
    console.log(`Detected barcode: ${barcode}`);
    
    const product = await fetchProductByBarcode(barcode);
    if (product) {
      const ingredients = product.ingredients_text ? 
        product.ingredients_text.split(',').map((ing: string) => ing.trim()) : 
        [];
      
      const healthFlags = analyzeIngredients(ingredients);
      const healthScore = calculateHealthScore(healthFlags);
      
      return {
        productName: product.product_name || "Unknown Product",
        ingredients,
        healthFlags,
        healthScore,
        nutritionSummary: generateNutritionSummary(product.nutriments),
        summary: generateHealthSummary(healthFlags, healthScore),
        recommendations: generateRecommendations(healthFlags)
      };
    } else {
      return {
        productName: "Product Not Found",
        ingredients: [],
        healthFlags: [{
          type: 'warning',
          icon: '❓',
          title: "Product Not Found",
          description: "We couldn't find this product in the barcode database. Please try taking a photo of the product or enter ingredients manually."
        }],
        healthScore: 0,
        nutritionSummary: "No nutritional data available",
        summary: "Product not found in database",
        recommendations: ["Try taking a photo of the product", "Enter ingredients manually"]
      };
    }
  }

  // Step 2: Process image input
  if (input.type === 'image' && input.imageData) {
    const { labels, text } = await analyzeImageWithGoogleVision(input.imageData);
    
    // Check if barcode was found in image text
    const imageBarcodeMatch = text.match(/\b\d{8,13}\b/);
    if (imageBarcodeMatch) {
      console.log(`Found barcode in image: ${imageBarcodeMatch[0]}`);
      return await processInput({
        type: 'barcode',
        content: imageBarcodeMatch[0]
      });
    }

    // Analyze detected food
    const foodLabels = labels.filter(label => 
      !['text', 'font', 'number', 'brand'].includes(label.toLowerCase())
    );
    
    const gptPrompt = `Analyze this food product based on image detection results: ${foodLabels.join(', ')}. 
    Return a JSON object with:
    {
      "productName": "detected food name",
      "ingredients": ["list of likely ingredients"],
      "nutritionSummary": "brief nutritional overview"
    }`;
    
    const gptResult = await analyzeWithGPT(gptPrompt);
    const healthFlags = analyzeIngredients(gptResult.ingredients || []);
    const healthScore = calculateHealthScore(healthFlags);
    
    return {
      productName: gptResult.productName || "Detected Food",
      ingredients: gptResult.ingredients || [],
      healthFlags,
      healthScore,
      nutritionSummary: gptResult.nutritionSummary || "No nutritional data available",
      summary: generateHealthSummary(healthFlags, healthScore),
      recommendations: generateRecommendations(healthFlags)
    };
  }

  // Step 3: Process voice input
  if (input.type === 'voice') {
    const transcription = await transcribeAudio(input.content);
    console.log(`Voice transcription: ${transcription}`);
    
    return await processInput({
      type: 'text',
      content: transcription
    });
  }

  // Step 4: Process text input
  const gptPrompt = `Analyze this food or product: "${input.content}". 
  Return a JSON object with:
  {
    "productName": "product or food name",
    "ingredients": ["list of likely ingredients"],
    "nutritionSummary": "brief nutritional overview"
  }`;
  
  const gptResult = await analyzeWithGPT(gptPrompt);
  const healthFlags = analyzeIngredients(gptResult.ingredients || []);
  const healthScore = calculateHealthScore(healthFlags);
  
  return {
    productName: gptResult.productName || input.content,
    ingredients: gptResult.ingredients || [],
    healthFlags,
    healthScore,
    nutritionSummary: gptResult.nutritionSummary || "No nutritional data available",
    summary: generateHealthSummary(healthFlags, healthScore),
    recommendations: generateRecommendations(healthFlags)
  };
}

function generateNutritionSummary(nutriments: any): string {
  if (!nutriments) return "No nutritional data available";
  
  const parts = [];
  if (nutriments.energy_kcal_100g) parts.push(`${nutriments.energy_kcal_100g} cal/100g`);
  if (nutriments.fat_100g) parts.push(`${nutriments.fat_100g}g fat`);
  if (nutriments.carbohydrates_100g) parts.push(`${nutriments.carbohydrates_100g}g carbs`);
  if (nutriments.proteins_100g) parts.push(`${nutriments.proteins_100g}g protein`);
  if (nutriments.sodium_100g) parts.push(`${nutriments.sodium_100g}mg sodium`);
  
  return parts.length > 0 ? parts.join(', ') : "Nutritional data incomplete";
}

function generateHealthSummary(flags: HealthFlag[], score: number): string {
  const dangerFlags = flags.filter(f => f.type === 'danger').length;
  const warningFlags = flags.filter(f => f.type === 'warning').length;
  const goodFlags = flags.filter(f => f.type === 'good').length;

  if (dangerFlags > 2) {
    return "This product contains multiple concerning ingredients that may impact your health. Consider avoiding or limiting consumption.";
  } else if (dangerFlags > 0) {
    return "This product contains some concerning ingredients. Consume in moderation and be aware of potential health impacts.";
  } else if (warningFlags > 3) {
    return "This product has several ingredients that warrant caution. Consider healthier alternatives when possible.";
  } else if (goodFlags > warningFlags) {
    return "This product has several beneficial ingredients. It can be part of a healthy diet when consumed mindfully.";
  } else {
    return "This product is relatively neutral from a health perspective. Focus on overall dietary patterns for optimal health.";
  }
}

function generateRecommendations(flags: HealthFlag[]): string[] {
  const recommendations = [];
  
  if (flags.some(f => f.title.includes("Seed Oils"))) {
    recommendations.push("Look for products using olive oil, avocado oil, or coconut oil instead");
  }
  
  if (flags.some(f => f.title.includes("Sugar"))) {
    recommendations.push("Choose unsweetened versions or products with natural sweeteners");
  }
  
  if (flags.some(f => f.title.includes("Preservatives"))) {
    recommendations.push("Opt for fresh or minimally processed alternatives");
  }
  
  if (flags.some(f => f.title.includes("Artificial"))) {
    recommendations.push("Select products with natural ingredients and fewer additives");
  }
  
  if (recommendations.length === 0) {
    recommendations.push("Continue making mindful food choices");
    recommendations.push("Focus on whole, unprocessed foods when possible");
  }
  
  return recommendations;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, content, imageData } = await req.json();
    
    if (!type || !content) {
      throw new Error('Missing required fields: type and content');
    }

    const input: ProcessedInput = {
      type,
      content,
      imageData
    };

    const healthReport = await processInput(input);
    
    console.log('Generated health report:', healthReport);

    return new Response(JSON.stringify(healthReport), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in health-check-processor:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      productName: "Error",
      ingredients: [],
      healthFlags: [],
      healthScore: 0,
      nutritionSummary: "Error occurred during analysis",
      summary: "Unable to process request",
      recommendations: ["Please try again"]
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});