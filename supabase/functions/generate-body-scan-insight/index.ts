import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[AI ANALYSIS] Starting OpenAI insight generation...');
    const { scanData, userId } = await req.json();
    
    const prompt = `As an expert AI fitness coach, provide comprehensive, personalized insights (4-6 sentences) for someone who just completed a body scan. 

Scan details:
- Date: ${scanData.date}
- Weight: ${scanData.weight ? `${scanData.weight} lbs` : 'Not provided'}
- Scan type: Full body scan (front, side, back poses)

Provide insights in this structure:
1. 🎯 **Posture Analysis**: Brief analysis of their commitment to tracking posture/form
2. ⚖️ **Progress Tracking**: Importance of consistent body scan monitoring  
3. 💪 **Motivational Message**: Encouraging, personal message about their dedication
4. 📈 **Next Steps**: One simple tip for improvement or what to focus on for next scan

Use emojis, be warm and motivational, avoid generic advice. Make it feel like a personal trainer review.`;

    let insight = "";
    let generatedByAI = false;

    if (!openAIApiKey) {
      console.log('[AI ANALYSIS] No OpenAI key, using fallback insight');
      insight = `🎯 **Posture Analysis**: Excellent work completing your comprehensive body scan! This shows great commitment to monitoring your form and alignment.

⚖️ **Progress Tracking**: Regular body scans are one of the most effective ways to track real changes in your physique and posture over time.

💪 **Motivational Message**: Your dedication to consistent tracking sets you apart - you're building habits that lead to lasting transformation!

📈 **Next Steps**: Focus on maintaining good posture throughout your daily activities, and we'll compare your progress in 30 days!`;
    } else {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4.1-2025-04-14',
            messages: [
              { role: 'system', content: 'You are an expert AI fitness coach who provides detailed, encouraging, and personalized insights with emojis and formatting.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 400,
            temperature: 0.8,
          }),
        });

        const data = await response.json();
        insight = data.choices?.[0]?.message?.content || insight;
        generatedByAI = true;
        console.log('[AI ANALYSIS] OpenAI insight generated successfully');
      } catch (error) {
        console.error('[AI ANALYSIS] OpenAI error, using fallback:', error);
      }
    }

    console.log('[AI ANALYSIS] Result received:', { insight: insight.substring(0, 100) + '...', generatedByAI });

    // Save insight to the most recent body scan if userId is provided
    if (userId) {
      try {
        console.log('[AI ANALYSIS] Saving insight to database...');
        
        // Get the most recent body scan for this user
        const { data: recentScan, error: fetchError } = await supabase
          .from('body_scans')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (fetchError) {
          console.error('[AI ANALYSIS] Error fetching recent scan:', fetchError);
        } else if (recentScan) {
          // Update the scan with AI insights
          const { error: updateError } = await supabase
            .from('body_scans')
            .update({ 
              ai_insights: insight,
              ai_generated_at: new Date().toISOString()
            })
            .eq('id', recentScan.id);

          if (updateError) {
            console.error('[AI ANALYSIS] Error saving insight:', updateError);
          } else {
            console.log('[AI ANALYSIS] Insight saved to database successfully');
          }
        }
      } catch (dbError) {
        console.error('[AI ANALYSIS] Database operation failed:', dbError);
      }
    }

    return new Response(JSON.stringify({ 
      insight,
      generatedByAI,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[AI ANALYSIS] Error generating body scan insight:', error);
    
    // Fallback insight with proper formatting
    const fallbackInsight = `🎯 **Posture Analysis**: Congratulations on completing your comprehensive body scan! This commitment to tracking shows excellent dedication to your health.

⚖️ **Progress Tracking**: Regular body scans provide invaluable data about your physical changes and help you stay motivated on your journey.

💪 **Motivational Message**: You're taking the right steps toward your goals - consistency in tracking leads to consistent results!

📈 **Next Steps**: Keep up this excellent habit and focus on good posture throughout your day. Your next scan will show your progress!`;
    
    return new Response(JSON.stringify({ 
      insight: fallbackInsight,
      generatedByAI: false,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});