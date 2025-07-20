
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Enhanced tag categories with confidence scoring
const TAG_CATEGORIES = {
  physical: ['headache', 'bloating', 'fatigue', 'nausea', 'joint_pain', 'muscle_tension', 'digestive_issues', 'skin_problems', 'dizziness', 'pain'],
  emotional: ['anxious', 'stressed', 'depressed', 'irritable', 'motivated', 'content', 'overwhelmed', 'focused', 'happy', 'sad', 'angry', 'grateful'],
  sleep: ['insomnia', 'restless_sleep', 'oversleeping', 'sleep_quality_poor', 'sleep_quality_good', 'tired', 'well_rested'],
  energy: ['energetic', 'sluggish', 'alert', 'brain_fog', 'lethargic', 'refreshed', 'burnt_out'],
  social: ['social_stress', 'work_pressure', 'family_time', 'outdoor_activity', 'screen_time', 'isolation', 'social_connection'],
  digestive: ['bloated', 'constipated', 'stomach_ache', 'acid_reflux', 'good_digestion', 'cramps', 'indigestion'],
  behavioral: ['overeating', 'undereating', 'exercise_motivation', 'procrastination', 'productivity', 'self_care', 'routine_disruption']
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ Error getting user:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { journalText } = await req.json();

    if (!journalText || journalText.trim().length === 0) {
      return new Response(JSON.stringify({ 
        tags: [],
        confidence: 0,
        message: 'No journal text provided'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🔄 Analyzing journal text for user: ${user.id}`);

    // Fallback keyword matching function
    const fallbackTagging = (text: string): string[] => {
      const lowerText = text.toLowerCase();
      const detectedTags: string[] = [];

      // Physical symptoms
      if (lowerText.includes('headache') || lowerText.includes('head hurt')) detectedTags.push('headache');
      if (lowerText.includes('bloat') || lowerText.includes('bloated')) detectedTags.push('bloating');
      if (lowerText.includes('tired') || lowerText.includes('fatigue')) detectedTags.push('fatigue');
      if (lowerText.includes('nausea') || lowerText.includes('sick')) detectedTags.push('nausea');
      if (lowerText.includes('pain') || lowerText.includes('ache')) detectedTags.push('pain');
      
      // Emotional states
      if (lowerText.includes('stress') || lowerText.includes('anxious')) detectedTags.push('stressed');
      if (lowerText.includes('happy') || lowerText.includes('joy')) detectedTags.push('happy');
      if (lowerText.includes('sad') || lowerText.includes('down')) detectedTags.push('sad');
      if (lowerText.includes('angry') || lowerText.includes('irritated')) detectedTags.push('irritable');
      
      // Sleep related
      if (lowerText.includes('sleep') || lowerText.includes('insomnia')) detectedTags.push('sleep_quality_poor');
      
      return detectedTags;
    };

    let aiTags: string[] = [];
    let confidence = 0;

    // Try AI tagging if OpenAI key is available
    if (openAIApiKey) {
      try {
        const aiPrompt = `Analyze this health/mood journal entry and extract relevant wellness tags. Focus on physical symptoms, emotional states, sleep patterns, energy levels, digestive issues, and behavioral patterns.

Journal Entry: "${journalText}"

Available tags by category:
- Physical: ${TAG_CATEGORIES.physical.join(', ')}
- Emotional: ${TAG_CATEGORIES.emotional.join(', ')}
- Sleep: ${TAG_CATEGORIES.sleep.join(', ')}
- Energy: ${TAG_CATEGORIES.energy.join(', ')}
- Social: ${TAG_CATEGORIES.social.join(', ')}
- Digestive: ${TAG_CATEGORIES.digestive.join(', ')}
- Behavioral: ${TAG_CATEGORIES.behavioral.join(', ')}

Return ONLY a JSON object with this format:
{
  "tags": ["tag1", "tag2"],
  "confidence": 0.85
}

Only include tags that are clearly indicated in the text. Confidence should be 0-1 based on how certain you are about the tags.`;

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
                content: 'You are a health and wellness AI assistant that extracts relevant tags from journal entries. Be conservative and only extract tags that are clearly indicated in the text.' 
              },
              { role: 'user', content: aiPrompt }
            ],
            temperature: 0.3,
            max_tokens: 200,
          }),
        });

        if (response.ok) {
          const aiResponse = await response.json();
          const aiContent = aiResponse.choices[0].message.content;
          
          try {
            const aiResult = JSON.parse(aiContent);
            aiTags = aiResult.tags || [];
            confidence = aiResult.confidence || 0;
            
            // Validate tags against our categories
            const validTags = aiTags.filter(tag => 
              Object.values(TAG_CATEGORIES).flat().includes(tag)
            );
            
            if (validTags.length > 0) {
              console.log(`✅ AI detected ${validTags.length} tags with confidence ${confidence}`);
              return new Response(JSON.stringify({
                tags: validTags,
                confidence: confidence,
                source: 'ai',
                message: `AI detected ${validTags.length} relevant patterns`
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
          } catch (parseError) {
            console.error('❌ Error parsing AI response:', parseError);
          }
        } else {
          console.error('❌ OpenAI API error:', response.status, await response.text());
        }
      } catch (aiError) {
        console.error('❌ AI tagging failed:', aiError);
      }
    }

    // Fallback to keyword matching
    const fallbackTags = fallbackTagging(journalText);
    
    console.log(`📝 Fallback detected ${fallbackTags.length} tags`);
    
    return new Response(JSON.stringify({
      tags: fallbackTags,
      confidence: fallbackTags.length > 0 ? 0.6 : 0,
      source: 'keyword',
      message: fallbackTags.length > 0 
        ? `Detected ${fallbackTags.length} patterns using keyword matching`
        : 'No clear patterns detected'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
