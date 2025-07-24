import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT token first
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create client with auth header for verification
    const authSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user_id, manual_trigger = false } = await req.json();

    // Ensure user can only access their own data
    if (user_id && user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const verifiedUserId = user_id || user.id;

    console.log(`🔮 Generating mood prediction for user: ${verifiedUserId}`);

    // Get data from last 10 days for analysis
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 10 * 24 * 60 * 60 * 1000);

    // Fetch recent logs
    const [moodLogsResult, nutritionLogsResult, supplementLogsResult, hydrationLogsResult] = await Promise.all([
      supabase
        .from('mood_logs')
        .select('date, mood, energy, wellness, ai_detected_tags, trigger_tags')
        .eq('user_id', verifiedUserId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false }),
      
      supabase
        .from('nutrition_logs')
        .select('created_at, food_name, quality_score, calories, protein, carbs, fat, sugar, sodium, trigger_tags')
        .eq('user_id', verifiedUserId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false }),

      supabase
        .from('supplement_logs')
        .select('created_at, name, dosage, trigger_tags')
        .eq('user_id', verifiedUserId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false }),

      supabase
        .from('hydration_logs')
        .select('created_at, volume, type, trigger_tags')
        .eq('user_id', verifiedUserId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
    ]);

    const moodLogs = moodLogsResult.data || [];
    const nutritionLogs = nutritionLogsResult.data || [];
    const supplementLogs = supplementLogsResult.data || [];
    const hydrationLogs = hydrationLogsResult.data || [];

    console.log(`📊 Analysis data: ${moodLogs.length} mood logs, ${nutritionLogs.length} nutrition logs, ${supplementLogs.length} supplement logs, ${hydrationLogs.length} hydration logs`);

    // Rule-based fallback prediction
    const generateRuleBasedPrediction = () => {
      let score = 7; // Default neutral score
      let factors = [];
      let emoji = '😊';

      // Analyze recent mood trends
      const recentMoods = moodLogs.slice(0, 3);
      if (recentMoods.length > 0) {
        const avgMood = recentMoods.reduce((sum, log) => sum + (log.mood || 7), 0) / recentMoods.length;
        const avgEnergy = recentMoods.reduce((sum, log) => sum + (log.energy || 7), 0) / recentMoods.length;
        
        if (avgMood >= 8 && avgEnergy >= 8) {
          score += 1;
          factors.push('consistent high mood and energy');
        } else if (avgMood <= 5 || avgEnergy <= 5) {
          score -= 1;
          factors.push('recent low mood or energy');
        }
      }

      // Check recent nutrition quality
      const recentMeals = nutritionLogs.slice(0, 5);
      if (recentMeals.length > 0) {
        const avgQuality = recentMeals.reduce((sum, log) => sum + (log.quality_score || 50), 0) / recentMeals.length;
        if (avgQuality >= 80) {
          score += 0.5;
          factors.push('excellent nutrition quality');
        } else if (avgQuality <= 50) {
          score -= 0.5;
          factors.push('poor nutrition quality');
        }
      }

      // Check for trigger tags
      const allTriggerTags = [
        ...moodLogs.flatMap(log => log.trigger_tags || []),
        ...nutritionLogs.flatMap(log => log.trigger_tags || []),
        ...supplementLogs.flatMap(log => log.trigger_tags || []),
        ...hydrationLogs.flatMap(log => log.trigger_tags || [])
      ];

      const negativeTriggers = allTriggerTags.filter(tag => 
        ['Sugar Crash', 'Bad Sleep', 'Overeating', 'Social Stress', 'Too Much Caffeine'].includes(tag)
      );
      const positiveTriggers = allTriggerTags.filter(tag => 
        ['Great Sleep', 'Mindful Eating', 'Good Energy', 'Balanced Meals'].includes(tag)
      );

      if (negativeTriggers.length > positiveTriggers.length) {
        score -= 1;
        factors.push(`recent challenges: ${negativeTriggers.slice(0, 2).join(', ')}`);
      } else if (positiveTriggers.length > 0) {
        score += 0.5;
        factors.push(`positive patterns: ${positiveTriggers.slice(0, 2).join(', ')}`);
      }

      // Check hydration consistency
      const todayHydration = hydrationLogs.filter(log => 
        log.created_at.split('T')[0] === new Date().toISOString().split('T')[0]
      );
      const totalHydration = todayHydration.reduce((sum, log) => sum + log.volume, 0);
      
      if (totalHydration >= 2000) {
        score += 0.3;
        factors.push('great hydration');
      } else if (totalHydration <= 1000) {
        score -= 0.3;
        factors.push('low hydration');
      }

      // Set emoji based on score
      if (score >= 8.5) emoji = '😊';
      else if (score >= 7.5) emoji = '🙂';
      else if (score >= 6.5) emoji = '😐';
      else if (score >= 5.5) emoji = '😔';
      else emoji = '😟';

      // Generate message
      let message = '';
      if (score >= 8) {
        message = `You're on a great streak with ${factors.join(' and ')} — expect good energy tomorrow!`;
      } else if (score >= 7) {
        message = `Tomorrow should be a balanced day. ${factors.length > 0 ? `Continue with ${factors[0]}` : 'Keep up your healthy habits'}.`;
      } else if (score >= 6) {
        message = `Tomorrow might be average. ${factors.length > 0 ? `Watch out for ${factors[0]}` : 'Focus on consistent healthy choices'}.`;
      } else {
        message = `Tomorrow might be challenging due to ${factors.slice(0, 2).join(' and ')} — try focusing on rest and balanced nutrition tonight.`;
      }

      return {
        emoji,
        message,
        confidence: 'medium',
        predicted_mood: Math.round(score),
        predicted_energy: Math.round(score),
        factors
      };
    };

    let prediction;

    // Try AI prediction if OpenAI is available
    if (openAIApiKey && moodLogs.length >= 3) {
      try {
        // Prepare data summary for AI
        const dataExract = {
          recent_moods: moodLogs.slice(0, 5).map(log => ({
            date: log.date,
            mood: log.mood,
            energy: log.energy,
            wellness: log.wellness,
            ai_tags: log.ai_detected_tags,
            trigger_tags: log.trigger_tags
          })),
          recent_nutrition: nutritionLogs.slice(0, 10).map(log => ({
            date: log.created_at.split('T')[0],
            food: log.food_name,
            quality: log.quality_score,
            calories: log.calories,
            protein: log.protein,
            sugar: log.sugar,
            trigger_tags: log.trigger_tags
          })),
          recent_hydration: hydrationLogs.slice(0, 7).map(log => ({
            date: log.created_at.split('T')[0],
            volume: log.volume,
            trigger_tags: log.trigger_tags
          })),
          recent_supplements: supplementLogs.slice(0, 7).map(log => ({
            date: log.created_at.split('T')[0],
            name: log.name,
            trigger_tags: log.trigger_tags
          }))
        };

        const prompt = `You are a wellness AI analyzing user data to predict tomorrow's mood and energy. 

User's recent data:
${JSON.stringify(dataExract, null, 2)}

Based on this data, predict tomorrow's mood and energy (1-10 scale). Consider:
- Recent mood/energy trends and patterns
- Nutrition quality and trigger tags
- Hydration consistency  
- Sleep patterns from tags
- Supplement changes
- Trigger tags indicating good/bad reactions

Respond with ONLY a JSON object in this exact format:
{
  "emoji": "😊",
  "message": "You're on a great streak with hydration and balanced meals — expect good energy tomorrow!",
  "predicted_mood": 8,
  "predicted_energy": 8,
  "confidence": "high",
  "factors": ["excellent hydration", "balanced nutrition", "consistent sleep"]
}

Keep the message under 120 characters and make it personal and actionable.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are a wellness prediction AI. Always respond with valid JSON only.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 200
          }),
        });

        if (response.ok) {
          const aiResult = await response.json();
          const aiPrediction = JSON.parse(aiResult.choices[0].message.content);
          
          // Validate AI response
          if (aiPrediction.emoji && aiPrediction.message && aiPrediction.predicted_mood && aiPrediction.predicted_energy) {
            prediction = aiPrediction;
            console.log('✅ AI prediction generated successfully');
          } else {
            console.log('⚠️ AI prediction invalid, falling back to rule-based');
            prediction = generateRuleBasedPrediction();
          }
        } else {
          console.log('⚠️ OpenAI API error, falling back to rule-based');
          prediction = generateRuleBasedPrediction();
        }
      } catch (error) {
        console.error('AI prediction error:', error);
        prediction = generateRuleBasedPrediction();
      }
    } else {
      console.log('📊 Using rule-based prediction (insufficient data or no OpenAI key)');
      prediction = generateRuleBasedPrediction();
    }

    // Store prediction in database
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const predictionDate = tomorrow.toISOString().split('T')[0];

    const { error: insertError } = await supabase
      .from('mood_predictions')
      .upsert({
        user_id: verifiedUserId,
        prediction_date: predictionDate,
        predicted_mood: prediction.predicted_mood,
        predicted_energy: prediction.predicted_energy,
        message: prediction.message,
        emoji: prediction.emoji,
        confidence: prediction.confidence,
        factors: prediction.factors || [],
        created_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,prediction_date'
      });

    if (insertError) {
      console.error('Error storing prediction:', insertError);
    } else {
      console.log('✅ Prediction stored successfully');
    }

    return new Response(JSON.stringify({
      success: true,
      prediction: {
        ...prediction,
        prediction_date: predictionDate
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in predict-mood function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate prediction',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});