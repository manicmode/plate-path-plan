import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    console.log('Generating muscle trend feedback for user:', user.id);

    // Get muscle group trends data for the last 4 weeks
    const { data: trendsData, error: trendsError } = await supabase
      .from('muscle_group_trends')
      .select('*')
      .eq('user_id', user.id)
      .gte('week_start', new Date(Date.now() - 4 * 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('week_start', { ascending: false });

    if (trendsError) {
      console.error('Error fetching trends data:', trendsError);
      throw trendsError;
    }

    console.log('Trends data fetched:', trendsData?.length, 'records');

    // Group data by muscle group
    const muscleGroupData: Record<string, any[]> = {};
    trendsData?.forEach(trend => {
      if (!muscleGroupData[trend.muscle_group]) {
        muscleGroupData[trend.muscle_group] = [];
      }
      muscleGroupData[trend.muscle_group].push(trend);
    });

    // Calculate summary stats for each muscle group
    const muscleGroupSummary = Object.entries(muscleGroupData).map(([muscleGroup, trends]) => {
      if (trends.length === 0) return null;
      
      const avgCompletion = trends.reduce((sum, t) => sum + t.completion_rate, 0) / trends.length;
      const totalSets = trends.reduce((sum, t) => sum + t.total_completed_sets, 0);
      const recentTrend = trends[0]?.completion_rate_change || 0;
      const consistency = trends[0]?.consistency_badge || 'needs_work';
      
      return {
        muscleGroup,
        avgCompletion: Math.round(avgCompletion),
        totalSets,
        recentTrend: Math.round(recentTrend),
        consistency,
        trendDirection: trends[0]?.trend_direction || 'stable'
      };
    }).filter(Boolean);

    console.log('Muscle group summary:', muscleGroupSummary);

    // Generate AI insight using OpenAI
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create context for AI
    const contextText = muscleGroupSummary.map(mg => 
      `${mg.muscleGroup}: ${mg.avgCompletion}% completion rate, ${mg.totalSets} total sets, ${mg.recentTrend}% recent change (${mg.consistency} consistency, ${mg.trendDirection} trend)`
    ).join('. ');

    const prompt = `Generate a motivational and insightful fitness paragraph about muscle group performance trends. 

Context: User's last 4 weeks of training data: ${contextText}

Requirements:
- 2-3 sentences maximum
- Mention specific muscle groups with their emoji (🦵 legs, ❤️ chest, 🫀 back, 💪 shoulders, 💪 arms)  
- Include percentage changes when significant (>15%)
- End with a specific actionable suggestion
- Use encouraging but realistic tone
- Include relevant emojis but don't overuse them

Example style: "Your leg day consistency dropped 22% over the last month. You're still hitting back and shoulders like a champ 💪, but let's rebalance with shorter leg sessions this week."

Generate insight:`;

    console.log('Sending request to OpenAI...');
    
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: 'You are a knowledgeable fitness coach providing personalized insights based on workout data. Be encouraging, specific, and actionable.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const openAIData = await openAIResponse.json();
    const aiInsight = openAIData.choices[0]?.message?.content?.trim() || 'Keep pushing forward with your training! 💪';

    console.log('AI insight generated:', aiInsight);

    // Return both the insight and the raw data for charting
    const response = {
      aiInsight,
      muscleGroupSummary,
      totalMuscleGroups: muscleGroupSummary.length,
      generatedAt: new Date().toISOString()
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-muscle-trend-feedback function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        aiInsight: 'Stay consistent with your training! Every workout counts. 💪',
        muscleGroupSummary: [],
        totalMuscleGroups: 0,
        generatedAt: new Date().toISOString()
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});