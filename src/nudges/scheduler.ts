import { supabase } from '@/integrations/supabase/client';
import { REGISTRY, NudgeDefinition, UserNudgeContext } from './registry';
import { getLastShownDates, get7DayCounts } from './logEvent';
import { withQAMocks, QAMock } from './qaContext';

export type SchedulerOptions = {
  dryRun?: boolean;
  ignoreCooldowns?: boolean;
  ignoreDailyCaps?: boolean;
  ignoreWeeklyCaps?: boolean;
  returnReasons?: boolean;
};

export type NudgeGateReason = {
  gate: string;
  pass: boolean;
  detail?: string;
};

export type NudgeCandidate = {
  id: string;
  definition: NudgeDefinition;
  allowed: boolean;
  reasons: NudgeGateReason[];
};

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
  qaMock?: QAMock,
  options?: SchedulerOptions
): Promise<SelectedNudge[] | NudgeCandidate[]> {
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
    const candidates: NudgeCandidate[] = [];

    for (const definition of REGISTRY) {
      const reasons: NudgeGateReason[] = [];
      let allowed = true;
      // Check feature flag if specified
      if (definition.enabledFlag) {
        const { data: flagData } = await supabase
          .from('feature_flags')
          .select('enabled')
          .eq('key', definition.enabledFlag)
          .maybeSingle();
        
        const flagEnabled = qaMock ? true : (flagData?.enabled || false);
        reasons.push({
          gate: 'featureFlag',
          pass: flagEnabled,
          detail: definition.enabledFlag
        });
        
        if (!flagEnabled) {
          allowed = false;
        }
      } else {
        reasons.push({ gate: 'featureFlag', pass: true, detail: 'no flag required' });
      }

      // Check time window (bypass for QA mode)
      if (definition.window) {
        const currentHour = context.currentTime.getHours();
        const inWindow = currentHour >= definition.window.startHour && currentHour <= definition.window.endHour;
        const windowPass = inWindow || qaMock?.bypassQuietHours;
        
        reasons.push({
          gate: 'timeWindow',
          pass: windowPass,
          detail: `${definition.window.startHour}h-${definition.window.endHour}h, current: ${currentHour}h`
        });
        
        if (!windowPass) {
          allowed = false;
        }
      } else {
        reasons.push({ gate: 'timeWindow', pass: true, detail: 'no window restriction' });
      }

      // Check cooldown
      const lastShown = lastShownDates[definition.id];
      if (lastShown && !options?.ignoreCooldowns) {
        const cooldownMs = definition.cooldownDays * 24 * 60 * 60 * 1000;
        const timeSinceLastShown = context.currentTime.getTime() - lastShown.getTime();
        const cooldownPass = timeSinceLastShown >= cooldownMs;
        const hoursSince = Math.round(timeSinceLastShown / (60 * 60 * 1000));
        
        reasons.push({
          gate: 'cooldown',
          pass: cooldownPass,
          detail: `${definition.cooldownDays}d required, ${hoursSince}h since last`
        });
        
        if (!cooldownPass) {
          allowed = false;
        }
      } else {
        reasons.push({ 
          gate: 'cooldown', 
          pass: true, 
          detail: lastShown ? 'ignored for QA' : 'never shown' 
        });
      }

      // Check daily cap
      if (!options?.ignoreDailyCaps) {
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
        const dailyCapPass = todayCount < definition.dailyCap;
        
        reasons.push({
          gate: 'dailyCap',
          pass: dailyCapPass,
          detail: `${todayCount}/${definition.dailyCap} today`
        });
        
        if (!dailyCapPass) {
          allowed = false;
        }
      } else {
        reasons.push({ gate: 'dailyCap', pass: true, detail: 'ignored for QA' });
      }

      // Check weekly cap  
      if (!options?.ignoreWeeklyCaps) {
        const weeklyCount = weeklyShownCounts[definition.id] || 0;
        const weeklyCapPass = weeklyCount < definition.maxPer7d;
        
        reasons.push({
          gate: 'weeklyCap',
          pass: weeklyCapPass,
          detail: `${weeklyCount}/${definition.maxPer7d} this week`
        });
        
        if (!weeklyCapPass) {
          allowed = false;
        }
      } else {
        reasons.push({ gate: 'weeklyCap', pass: true, detail: 'ignored for QA' });
      }

      // Check business logic eligibility
      try {
        const isEligible = await definition.isEligible(context);
        reasons.push({
          gate: 'contextRules',
          pass: isEligible,
          detail: isEligible ? 'context requirements met' : 'context requirements not met'
        });
        
        if (!isEligible) {
          allowed = false;
        }
      } catch (error) {
        console.error(`Error checking eligibility for nudge ${definition.id}:`, error);
        reasons.push({
          gate: 'contextRules',
          pass: false,
          detail: `error: ${error}`
        });
        allowed = false;
      }

      // Add to candidates list for QA reporting
      candidates.push({
        id: definition.id,
        definition,
        allowed,
        reasons
      });

      // Add to eligible list if all gates passed
      if (allowed) {
        eligibleNudges.push({
          definition,
          reason: `eligible_at_${currentTime.getHours()}h`
        });
      }
    }

    // Return candidates with reasons if requested
    if (options?.returnReasons) {
      return candidates;
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