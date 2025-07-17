import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log("barcode-image-detector function invoked");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting barcode detection...');
    const startTime = Date.now();
    
    // Parse request body
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      throw new Error('No image data provided');
    }
    
    console.log('📊 Received image data for barcode detection');
    
    // Get Google Vision API key
    const googleVisionApiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
    if (!googleVisionApiKey) {
      throw new Error('Google Vision API key not configured');
    }
    
    // Call Google Vision API for barcode detection
    const apiResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${googleVisionApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: [
            { type: 'TEXT_DETECTION', maxResults: 10 },
            { type: 'LOGO_DETECTION', maxResults: 5 },
            { type: 'LABEL_DETECTION', maxResults: 10 },
          ]
        }]
      })
    });
    
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(`Google Vision API error: ${apiResponse.status} - ${errorText}`);
    }
    
    const result = await apiResponse.json();
    console.log('✅ Google Vision response received');
    
    // Extract barcode from text
    const textAnnotations = result.responses[0]?.textAnnotations || [];
    const allText = textAnnotations.length > 0 ? textAnnotations[0].description : '';
    
    // Match potential barcodes (digits between 8-14 characters long)
    const barcodeCandidates = [];
    const barcodeRegex = /\b\d{8,14}\b/g;
    let match;
    
    while ((match = barcodeRegex.exec(allText)) !== null) {
      barcodeCandidates.push({
        value: match[0],
        position: match.index,
        length: match[0].length
      });
    }
    
    // Process barcode candidates - prioritizing those that meet standard formats
    const processedCandidates = barcodeCandidates
      .map(candidate => {
        // Add score based on length (standard barcodes are 8, 12, 13, or 14 digits)
        let score = 0;
        
        // Standard barcode lengths get higher scores
        if ([8, 12, 13, 14].includes(candidate.value.length)) {
          score += 5;
          
          // EAN-13 and UPC-A get even higher scores
          if ([12, 13].includes(candidate.value.length)) {
            score += 3;
          }
        }
        
        return { ...candidate, score };
      })
      .sort((a, b) => b.score - a.score);
    
    // Get the best barcode candidate
    const bestBarcode = processedCandidates.length > 0 ? processedCandidates[0].value : null;
    
    // Log the detection results
    console.log('🔢 Barcode candidates found:', processedCandidates.length);
    console.log('👑 Best barcode candidate:', bestBarcode);
    
    // If we found a barcode, query OpenFoodFacts API
    let productData = null;
    
    if (bestBarcode) {
      console.log(`📦 Querying OpenFoodFacts API for barcode: ${bestBarcode}`);
      
      try {
        const openFoodResponse = await fetch(`https://world.openfoodfacts.org/api/v0/product/${bestBarcode}.json`);
        const openFoodData = await openFoodResponse.json();
        
        if (openFoodData.status === 1 && openFoodData.product) {
          console.log('✅ OpenFoodFacts product found!', {
            name: openFoodData.product.product_name,
            brands: openFoodData.product.brands
          });
          
          productData = openFoodData.product;
        } else {
          console.log('⚠️ OpenFoodFacts: No product found for barcode', bestBarcode);
        }
      } catch (openFoodError) {
        console.error('❌ OpenFoodFacts API error:', openFoodError);
      }
    }
    
    // Extract text and visual details even if no barcode found
    // This helps with the manual entry screen
    const logoAnnotations = result.responses[0]?.logoAnnotations || [];
    const labelAnnotations = result.responses[0]?.labelAnnotations || [];
    
    const logos = logoAnnotations.map((logo: any) => ({
      description: logo.description,
      score: logo.score
    }));
    
    const labels = labelAnnotations.map((label: any) => ({
      description: label.description,
      score: label.score
    }));
    
    // Find the bounding box of the barcode in the image for highlighting
    let barcodeLocation = null;
    if (bestBarcode && textAnnotations.length > 1) {
      for (let i = 1; i < textAnnotations.length; i++) {
        const annotation = textAnnotations[i];
        if (annotation.description === bestBarcode) {
          // Extract the bounding polygon
          barcodeLocation = annotation.boundingPoly?.vertices;
          break;
        }
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`✨ Barcode detection completed in ${duration}ms`);
    
    // Prepare the response
    const response = {
      barcode: bestBarcode,
      barcodeLocation,
      allCandidates: processedCandidates,
      productData,
      textContent: allText,
      logos,
      labels,
      processingTime: duration
    };
    
    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('💥 Barcode detection error:', error);
    return new Response(
      JSON.stringify({
        error: true,
        message: error.message || 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});