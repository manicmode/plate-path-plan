import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAiApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting caricature generation...');
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header provided');
      throw new Error('No authorization header');
    }

    // Get user from JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('❌ Authentication error:', userError);
      throw new Error('Authentication failed');
    }

    console.log('✅ User authenticated:', user.id);

    const { imageUrl } = await req.json();

    if (!imageUrl) {
      console.error('❌ No image URL provided in request');
      throw new Error('Image URL is required');
    }

    console.log('📷 Processing image URL:', imageUrl);

    // Check if OpenAI API key is available
    if (!openAiApiKey) {
      console.error('❌ OpenAI API key not configured');
      throw new Error('OpenAI API key not configured. Please add OPENAI_API_KEY to Supabase secrets.');
    }

    // Check monthly generation limit (30 days)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('caricature_generation_count, last_caricature_generation, caricature_history')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Profile fetch error:', profileError);
      throw new Error('Failed to fetch user profile');
    }

    const lastGeneration = profile?.last_caricature_generation;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    if (lastGeneration && new Date(lastGeneration) > thirtyDaysAgo) {
      const nextAvailableDate = new Date(new Date(lastGeneration).getTime() + (30 * 24 * 60 * 60 * 1000));
      console.error('❌ Monthly generation limit reached');
      throw new Error(`🎨 Your next avatar set will be available on ${nextAvailableDate.toLocaleDateString()}!`);
    }

    console.log('✅ Monthly generation check passed');

    console.log('🎨 Generating caricatures with OpenAI DALL-E...');

    // Generate 3 caricature variations using MidJourney-style prompts for funny, recognizable caricatures
    const caricaturePrompts = [
      `Professional caricature illustration with exaggerated facial features but strong resemblance to original person, similar to celebrity caricatures of Will Smith or Gordon Ramsay. Oversized distinctive features (eyes, nose, smile), vibrant colors, playful cartoon style with fitness/wellness elements. High-quality digital art with smooth gradients and comic book aesthetic. Energetic and humorous but clearly recognizable.`,
      
      `Pixar-style 3D rendered caricature with amplified facial characteristics, maintaining clear facial identity. Exaggerated proportions in a fun, animated movie character style. Bright saturated colors, smooth 3D rendering, expressive cartoon features. Include subtle fitness/health motifs. Professional animation studio quality with detailed lighting and textures.`,
      
      `Comic book caricature art with bold, exaggerated features and strong facial resemblance. Dynamic cartoon style with vivid colors and dramatic shading. Amplified distinctive facial characteristics while preserving identity. Clean line art with professional comic illustration quality. Fun and energetic expression with subtle wellness/fitness theme elements.`
    ];

    const generatedImages = [];
    
    for (let i = 0; i < caricaturePrompts.length; i++) {
      try {
        console.log(`🎯 Generating caricature ${i + 1}/3...`);
        
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: caricaturePrompts[i],
            n: 1,
            size: '1024x1024',
            quality: 'standard',
            style: 'vivid'
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ OpenAI API error for image ${i + 1}:`, response.status, errorText);
          continue;
        }

        const data = await response.json();
        console.log(`✅ Generated image ${i + 1}:`, data.data[0].url);
        
        if (data.data && data.data[0] && data.data[0].url) {
          generatedImages.push(data.data[0].url);
        }
      } catch (error) {
        console.error(`❌ Error generating image ${i + 1}:`, error);
      }
    }
    
    if (generatedImages.length === 0) {
      console.error('❌ No images were generated successfully');
      throw new Error('Failed to generate any caricature images');
    }

    console.log(`🎉 Successfully generated ${generatedImages.length} images`);
    
    // Store images in Supabase Storage
    const storedUrls = [];
    
    for (let i = 0; i < generatedImages.length; i++) {
      const imageUrl = generatedImages[i];
      
      try {
        console.log(`📥 Downloading and storing image ${i + 1}...`);
        
        // Download the image
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          console.error(`❌ Failed to download image ${i + 1}:`, imageResponse.status);
          continue;
        }
        
        const imageBlob = await imageResponse.blob();
        const imageBuffer = await imageBlob.arrayBuffer();
        
        // Upload to organized folder structure
        const timestamp = Date.now();
        const fileName = `${user.id}/caricatures/${timestamp}/image${i + 1}.png`;
        console.log(`📤 Uploading to: ${fileName}`);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('caricatures')
          .upload(fileName, imageBuffer, {
            contentType: 'image/png',
            upsert: true
          });

        if (uploadError) {
          console.error(`❌ Upload error for image ${i + 1}:`, uploadError);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('caricatures')
          .getPublicUrl(fileName);

        storedUrls.push(urlData.publicUrl);
        console.log(`✅ Stored image ${i + 1} at:`, urlData.publicUrl);
      } catch (error) {
        console.error(`❌ Error processing image ${i + 1}:`, error);
      }
    }

    if (storedUrls.length === 0) {
      console.error('❌ Failed to store any images in Supabase Storage');
      throw new Error('Failed to store any generated images');
    }

    console.log(`💾 Successfully stored ${storedUrls.length} images`);

    // Update user profile with all variants and add to history
    console.log('📝 Updating user profile with all variants and history...');
    
    const existingHistory = profile?.caricature_history || [];
    const newBatch = {
      timestamp: new Date().toISOString(),
      variants: storedUrls,
      generated_at: new Date().toISOString()
    };
    
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        avatar_url: storedUrls[0], // Use first variant as default
        avatar_variant_1: storedUrls[0] || null,
        avatar_variant_2: storedUrls[1] || null,
        avatar_variant_3: storedUrls[2] || null,
        selected_avatar_variant: 1, // Default to first variant
        last_caricature_generation: new Date().toISOString(),
        caricature_history: [...existingHistory, newBatch],
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('❌ Profile update error:', updateError);
      throw new Error('Failed to update user profile');
    }

    console.log('🎊 Caricature generation completed successfully!');
    console.log('📊 Final results:', {
      generatedCount: storedUrls.length,
      nextGenerationAvailable: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(),
      urls: storedUrls
    });

    return new Response(
      JSON.stringify({
        success: true,
        caricatureUrls: storedUrls,
        nextGenerationDate: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('💥 Error in generateCaricatureImage function:', error);
    console.error('🔍 Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : 'No stack trace available'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});