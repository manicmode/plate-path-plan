import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    const { weeklyStats, totalSessions, categoryBreakdown, recentTrend } = await req.json();

    // Calculate some insights
    const totalMinutesAllTime = categoryBreakdown.reduce((sum: number, cat: any) => sum + cat.minutes, 0);
    const avgSessionLength = totalSessions > 0 ? Math.round(totalMinutesAllTime / totalSessions) : 0;
    const mostUsedCategory = categoryBreakdown[0]?.category || 'meditation';
    const weeklyTrend = recentTrend.length > 0 ? 
      recentTrend[recentTrend.length - 1].minutes - recentTrend[0].minutes : 0;

    const prompt = `As a wellness coach, analyze this user's recovery practice data and provide a personalized, encouraging summary in 2-3 sentences. Be specific with numbers and trends, but keep it motivational and actionable.

Data:
- This week: ${weeklyStats.totalMinutes} minutes across ${weeklyStats.sessionCount} sessions
- Total sessions all-time: ${totalSessions}
- Average session length: ${avgSessionLength} minutes
- Current meditation streak: ${weeklyStats.longestStreak} days
- Most used category: ${mostUsedCategory}
- Weekly trend: ${weeklyTrend > 0 ? 'increasing' : weeklyTrend < 0 ? 'decreasing' : 'stable'} (${weeklyTrend} minutes change)
- Category breakdown: ${categoryBreakdown.map((c: any) => `${c.category}: ${c.percentage}%`).join(', ')}

Guidelines:
- Start with a positive observation about their progress
- Include 1-2 specific metrics to show growth
- End with an encouraging suggestion for improvement
- Use wellness emojis sparingly (max 2)
- Keep it personal and actionable
- Mention if they're building good consistency or variety

Example tone: "You've built impressive consistency with 45 minutes of recovery practice this week! Your meditation streak of 12 days shows real dedication. Consider adding some breathing exercises to complement your meditation focus for even better stress relief."`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'You are a certified wellness coach providing personalized insights based on recovery practice data. Be encouraging, specific, and actionable.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices[0].message.content;

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-recovery-summary function:', error);
    
    // Fallback summary based on available data
    const fallbackSummary = "You're making great progress on your recovery journey! Keep building those healthy habits with consistent practice. 🌟";
    
    return new Response(JSON.stringify({ 
      summary: fallbackSummary,
      error: 'AI service temporarily unavailable' 
    }), {
      status: 200, // Return 200 with fallback instead of error
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});