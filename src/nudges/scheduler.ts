import { supabase } from '@/integrations/supabase/client';
import { REGISTRY, NudgeDefinition, UserNudgeContext } from './registry';
import { getLastShownDates, get7DayCounts } from './logEvent';
import { withQAMocks, QAMock } from './qaContext';

export type SelectedNudge = {
  id: string;
  definition: NudgeDefinition;
  runId: string;
  reason: string;
};

export async function selectNudgesForUser(
  userId: string, 
  limit = 2,
  currentTime = new Date(),
  qaMock?: QAMock
): Promise<SelectedNudge[]> {
  try {
    // Load nudge history for this user
    const [lastShownDates, weeklyShownCounts] = await Promise.all([
      getLastShownDates(userId),
      get7DayCounts(userId)
    ]);

    // Build user context (with QA mocks if provided)
    let context = await buildUserContext(userId, currentTime);
    if (qaMock) {
      context = withQAMocks(context, qaMock);
    }

    // Check feature flags and filters
    const eligibleNudges: Array<{ definition: NudgeDefinition; reason: string }> = [];

    for (const definition of REGISTRY) {
      // Check feature flag if specified
      if (definition.enabledFlag) {
        const { data: flagData } = await supabase
          .from('feature_flags')
          .select('enabled')
          .eq('key', definition.enabledFlag)
          .maybeSingle();
        
        if (!flagData?.enabled) {
          continue;
        }
      }

      // Check time window (bypass for QA mode)
      if (definition.window && !qaMock?.bypassQuietHours) {
        const currentHour = context.currentTime.getHours();
        if (currentHour < definition.window.startHour || currentHour > definition.window.endHour) {
          continue;
        }
      }

      // Check cooldown
      const lastShown = lastShownDates[definition.id];
      if (lastShown) {
        const cooldownMs = definition.cooldownDays * 24 * 60 * 60 * 1000;
        const timeSinceLastShown = context.currentTime.getTime() - lastShown.getTime();
        if (timeSinceLastShown < cooldownMs) {
          continue;
        }
      }

      // Check daily cap
      const todayStart = new Date(context.currentTime);
      todayStart.setHours(0, 0, 0, 0);
      
      const { data: todayShownCount } = await supabase
        .from('nudge_events')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('nudge_id', definition.id)
        .eq('event', 'shown')
        .gte('ts', todayStart.toISOString());

      const todayCount = todayShownCount?.length || 0;
      if (todayCount >= definition.dailyCap) {
        continue;
      }

      // Check weekly cap
      const weeklyCount = weeklyShownCounts[definition.id] || 0;
      if (weeklyCount >= definition.maxPer7d) {
        continue;
      }

      // Check business logic eligibility
      try {
        const isEligible = await definition.isEligible(context);
        if (isEligible) {
          eligibleNudges.push({
            definition,
            reason: `eligible_at_${currentTime.getHours()}h`
          });
        }
      } catch (error) {
        console.error(`Error checking eligibility for nudge ${definition.id}:`, error);
      }
    }

    // Sort by priority (highest first) and take top N
    eligibleNudges.sort((a, b) => b.definition.priority - a.definition.priority);
    const selectedNudges = eligibleNudges.slice(0, limit);

    // Generate run IDs and return
    return selectedNudges.map(({ definition, reason }) => ({
      id: definition.id,
      definition,
      runId: `nudge-${definition.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      reason
    }));

  } catch (error) {
    console.error('Error selecting nudges for user:', error);
    return [];
  }
}

async function buildUserContext(userId: string, currentTime: Date): Promise<UserNudgeContext> {
  const today = currentTime.toISOString().split('T')[0];
  const twoDaysAgo = new Date(currentTime.getTime() - 2 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(currentTime.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    // Get last breathing session (using recovery_session_logs with breathing category)
    const { data: breathingSessions } = await supabase
      .from('recovery_session_logs')
      .select('completed_at')
      .eq('user_id', userId)
      .eq('category', 'breathing')
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get last mood log
    const { data: moodLogs } = await supabase
      .from('mood_logs')
      .select('created_at')
      .eq('user_id', userId)
      .eq('date', today)
      .limit(1)
      .maybeSingle();

    // Get today's water logs count
    const { data: waterLogs } = await supabase
      .from('hydration_logs')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .gte('created_at', today + 'T00:00:00Z')
      .lt('created_at', today + 'T23:59:59Z');

    // Get recent activity
    const { data: recentActivity } = await supabase
      .from('exercise_logs')
      .select('duration_minutes')
      .eq('user_id', userId)
      .gte('created_at', twoDaysAgo.toISOString())
      .gte('duration_minutes', 20);

    // Get recent stress indicators
    const { data: stressMoods } = await supabase
      .from('mood_logs')
      .select('tags')
      .eq('user_id', userId)
      .gte('created_at', twoDaysAgo.toISOString())
      .contains('tags', ['stressed', 'anxious', 'overwhelmed']);

    // Get breathing sessions count in last 7 days
    const { data: recentBreathingSessions } = await supabase
      .from('recovery_session_logs')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('category', 'breathing')
      .gte('completed_at', sevenDaysAgo.toISOString());

    return {
      userId,
      currentTime,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      lastBreathingSession: breathingSessions?.completed_at ? new Date(breathingSessions.completed_at) : null,
      lastMoodLog: moodLogs?.created_at ? new Date(moodLogs.created_at) : null,
      waterLogsToday: waterLogs?.length || 0,
      activityLast48h: (recentActivity?.length || 0) > 0,
      upcomingBedtime: currentTime.getHours() >= 20, // Simple heuristic
      sleepScoreBelowTarget: true, // Placeholder - would need sleep tracking
      stressTagsLast48h: (stressMoods?.length || 0) > 0,
      breathingSessionsLast7d: recentBreathingSessions?.length || 0
    };
  } catch (error) {
    console.error('Error building user context:', error);
    // Return safe defaults
    return {
      userId,
      currentTime,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      lastBreathingSession: null,
      lastMoodLog: null,
      waterLogsToday: 0,
      activityLast48h: false,
      upcomingBedtime: false,
      sleepScoreBelowTarget: false,
      stressTagsLast48h: false,
      breathingSessionsLast7d: 0
    };
  }
}