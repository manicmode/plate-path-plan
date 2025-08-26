import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

// Helper function to safely parse numbers
function num(x: any): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Safely parse request body with schema validation
  let body: any;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // Create safe payload that tolerates missing fields
  const safePayload = {
    name: String(body?.name ?? body?.userInput ?? ''),
    brand: String(body?.brand ?? ''),
    calories: num(body?.calories),
    macros: {
      protein_g: num(body?.macros?.protein_g),
      carbs_g: num(body?.macros?.carbs_g),
      fat_g: num(body?.macros?.fat_g),
      fiber_g: num(body?.macros?.fiber_g),
      sugar_g: num(body?.macros?.sugar_g),
      sodium_mg: num(body?.macros?.sodium_mg),
    },
    flags: Array.isArray(body?.flags) ? body.flags.slice(0, 12) : [],
    ingredients_text: String(body?.ingredients_text ?? ''),
    userId: body?.userId // Keep for legacy compatibility
  };

  const functionName = 'generate-smart-suggestions';
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  
  try {
    // Verify JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      // Log unauthorized access attempt
      const supabaseLog = createClient(supabaseUrl, supabaseServiceKey);
      await supabaseLog.from('security_logs').insert({
        function_name: functionName,
        ip_address: ipAddress,
        event_type: 'unauthorized',
        details: 'Missing authorization header'
      }).catch(console.error);
      
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      // Log invalid token attempt
      const supabaseLog = createClient(supabaseUrl, supabaseServiceKey);
      await supabaseLog.from('security_logs').insert({
        function_name: functionName,
        ip_address: ipAddress,
        event_type: 'invalid_token',
        details: authError?.message || 'Invalid or expired token'
      }).catch(console.error);
      
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Log successful access
    await supabase.from('security_logs').insert({
      user_id: user.id,
      function_name: functionName,
      ip_address: ipAddress,
      event_type: 'success'
    }).catch(console.error);

    let suggestions: string[] = [];
    const userInput = safePayload.name || safePayload.brand || '';

    // Priority 1: User Context - Generate suggestions based on user input
    if (userInput && userInput.trim()) {
      try {
        const contextPrompt = `Generate 4-5 specific, realistic food/beverage product suggestions related to "${userInput}". 
        Include brand names when possible. Format as a simple JSON array of strings. 
        Examples: ["Quest Protein Bar - Chocolate", "KIND Bar - Almond", "RXBar - Peanut Butter"]`;

        const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are a helpful assistant that generates food product suggestions. Return only valid JSON arrays.' },
              { role: 'user', content: contextPrompt }
            ],
            max_tokens: 200,
            temperature: 0.7,
          }),
        });

        if (openAIResponse.ok) {
          const data = await openAIResponse.json();
          const aiSuggestions = JSON.parse(data.choices[0].message.content);
          if (Array.isArray(aiSuggestions) && aiSuggestions.length > 0) {
            suggestions = aiSuggestions.slice(0, 5);
          }
        }
      } catch (error) {
        console.error('Error generating AI suggestions:', error);
      }
    }

    // Priority 2: Platform Trends - Get most commonly checked items
    if (suggestions.length === 0) {
      try {
        const { data: trendingItems } = await supabase
          .from('nutrition_logs')
          .select('food_name')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
          .limit(100);

        if (trendingItems && trendingItems.length > 0) {
          // Count frequency and get top items
          const foodCounts = trendingItems.reduce((acc: Record<string, number>, item) => {
            acc[item.food_name] = (acc[item.food_name] || 0) + 1;
            return acc;
          }, {});

          suggestions = Object.entries(foodCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([foodName]) => foodName);
        }
      } catch (error) {
        console.error('Error fetching trending items:', error);
      }
    }

    // Priority 3: Fallback Examples - Default rotating list
    if (suggestions.length === 0) {
      const fallbackSuggestions = [
        "Coca Cola 12oz Can",
        "Lay's Classic Potato Chips",
        "Organic Bananas",
        "Vitamin D3 1000 IU",
        "DiGiorno Frozen Pizza",
        "Gatorade Sports Drink",
        "KIND Dark Chocolate Nuts Bar",
        "Cheerios Cereal",
        "Greek Yogurt - Plain",
        "Red Bull Energy Drink"
      ];

      // Rotate based on time of day for variety
      const hour = new Date().getHours();
      const startIndex = hour % fallbackSuggestions.length;
      suggestions = [
        ...fallbackSuggestions.slice(startIndex, startIndex + 5),
        ...fallbackSuggestions.slice(0, Math.max(0, 5 - (fallbackSuggestions.length - startIndex)))
      ].slice(0, 5);
    }

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.log('sugg_error', String(error));
    // Always return 200 with empty suggestions on error
    return new Response(
      JSON.stringify({ suggestions: [] }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});