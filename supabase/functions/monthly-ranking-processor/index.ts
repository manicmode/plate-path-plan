import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserPerformanceData {
  user_id: string;
  username: string;
  display_name: string;
  total_score: number;
  challenge_wins: number;
  challenge_completions: number;
  avg_streak: number;
  participation_count: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { month_year } = await req.json();
    const targetMonth = month_year ? new Date(month_year) : new Date();
    const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
    const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);

    console.log(`Processing monthly rankings for ${monthStart.toISOString().slice(0, 7)}`);

    // Get all user challenge participations for the month
    const { data: participations, error: participationsError } = await supabase
      .from('user_challenge_participations')
      .select(`
        user_id,
        completion_percentage,
        streak_count,
        best_streak,
        current_progress,
        is_completed,
        challenge_id,
        public_challenges!inner(
          title,
          duration_days,
          difficulty_level
        )
      `)
      .gte('joined_at', monthStart.toISOString())
      .lte('joined_at', monthEnd.toISOString());

    if (participationsError) {
      throw participationsError;
    }

    // Get user profiles for display names
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('user_id, first_name, last_name');

    if (profilesError) {
      throw profilesError;
    }

    // Get challenge messages for activity scoring
    const { data: messages, error: messagesError } = await supabase
      .from('challenge_messages')
      .select('user_id, username, challenge_id, created_at')
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString());

    if (messagesError) {
      throw messagesError;
    }

    // Calculate user performance metrics
    const userPerformanceMap = new Map<string, UserPerformanceData>();

    // Process participations
    participations?.forEach(participation => {
      const userId = participation.user_id;
      const profile = profiles?.find(p => p.user_id === userId);
      
      if (!userPerformanceMap.has(userId)) {
        userPerformanceMap.set(userId, {
          user_id: userId,
          username: profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Unknown User',
          display_name: profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Unknown User',
          total_score: 0,
          challenge_wins: 0,
          challenge_completions: 0,
          avg_streak: 0,
          participation_count: 0
        });
      }

      const userData = userPerformanceMap.get(userId)!;
      userData.participation_count++;
      
      // Calculate score based on completion percentage and difficulty
      const difficultyMultiplier = participation.public_challenges?.difficulty_level === 'expert' ? 3 : 
                                  participation.public_challenges?.difficulty_level === 'intermediate' ? 2 : 1;
      
      const completionScore = (participation.completion_percentage || 0) * difficultyMultiplier;
      const streakBonus = (participation.best_streak || 0) * 2;
      
      userData.total_score += completionScore + streakBonus;
      userData.avg_streak = Math.max(userData.avg_streak, participation.best_streak || 0);
      
      if (participation.is_completed) {
        userData.challenge_completions++;
      }
    });

    // Process message activity for engagement scoring
    messages?.forEach(message => {
      const userId = message.user_id;
      if (userPerformanceMap.has(userId)) {
        const userData = userPerformanceMap.get(userId)!;
        userData.total_score += 1; // Engagement bonus
      }
    });

    // Sort users by total score
    const rankedUsers = Array.from(userPerformanceMap.values())
      .sort((a, b) => b.total_score - a.total_score);

    // Determine podium winners (top 3)
    const podiumWinners = rankedUsers.slice(0, 3).map((user, index) => ({
      user_id: user.user_id,
      username: user.username,
      display_name: user.display_name,
      final_score: user.total_score,
      final_streak: user.avg_streak,
      completion_date: monthEnd.toISOString(),
      podium_position: index + 1,
      total_interactions: user.participation_count,
      month_year: monthStart.toISOString().slice(0, 7)
    }));

    // Store monthly rankings in database
    if (podiumWinners.length > 0) {
      const { error: insertError } = await supabase
        .from('monthly_rankings')
        .upsert(podiumWinners, { 
          onConflict: 'user_id,month_year',
          ignoreDuplicates: false 
        });

      if (insertError) {
        console.error('Error storing monthly rankings:', insertError);
      }
    }

    // Update yearly score preview for affected users
    for (const user of rankedUsers.slice(0, 10)) { // Update top 10
      const { error: yearlyUpdateError } = await supabase
        .from('yearly_score_preview')
        .upsert({
          user_id: user.user_id,
          year: targetMonth.getFullYear(),
          username: user.username,
          display_name: user.display_name,
          yearly_score: user.total_score,
          monthly_trophies: podiumWinners.find(w => w.user_id === user.user_id) ? 1 : 0,
          avg_nutrition_streak: user.avg_streak,
          avg_hydration_streak: user.avg_streak,
          avg_supplement_streak: user.avg_streak,
          total_active_days: Math.ceil(user.participation_count * 7), // Estimate
          total_messages: user.participation_count * 5, // Estimate
          rank_position: rankedUsers.findIndex(u => u.user_id === user.user_id) + 1,
          last_updated: new Date().toISOString()
        }, { 
          onConflict: 'user_id,year',
          ignoreDuplicates: false 
        });

      if (yearlyUpdateError) {
        console.error(`Error updating yearly score for user ${user.user_id}:`, yearlyUpdateError);
      }
    }

    console.log(`Monthly ranking processing complete. Processed ${rankedUsers.length} users, created ${podiumWinners.length} podium winners`);

    return new Response(JSON.stringify({
      success: true,
      month: monthStart.toISOString().slice(0, 7),
      total_users: rankedUsers.length,
      podium_winners: podiumWinners,
      message: 'Monthly rankings processed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in monthly ranking processor:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});