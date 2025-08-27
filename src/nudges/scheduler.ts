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
  ignoreFeatureFlags?: boolean;
  qaNow?: Date; // Fixed time for QA scenarios
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

export type ScheduleResult = {
  selected: SelectedNudge[];
  allowed: NudgeCandidate[];
  reasons: NudgeCandidate[];
};

export async function scheduleNudges(options: {
  userId: string;
  now?: Date;
  maxPerRun?: number;
  qaMode?: boolean;
  qaMock?: QAMock;
}): Promise<ScheduleResult> {
  const { userId, now = new Date(), maxPerRun = 1, qaMode = false, qaMock } = options;
  
  const schedulerOptions: SchedulerOptions = {
    dryRun: qaMode,
    ignoreFeatureFlags: qaMode,
    returnReasons: true,
    qaNow: now,
  };
  
  // Get all candidates with gate reasons
  const candidates = await selectNudgesForUser(
    userId,
    10, // Get all for analysis
    now,
    qaMock,
    schedulerOptions
  ) as NudgeCandidate[];
  
  // Filter allowed candidates and sort by priority
  const allowedCandidates = candidates.filter(c => c.allowed);
  allowedCandidates.sort((a, b) => b.definition.priority - a.definition.priority);
  
  // Select top N based on maxPerRun
  const selectedCandidates = allowedCandidates.slice(0, maxPerRun);
  
  // Convert to SelectedNudge format
  const selected: SelectedNudge[] = selectedCandidates.map(candidate => ({
    id: candidate.id,
    definition: candidate.definition,
    runId: `nudge-${candidate.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    reason: `selected_priority_${candidate.definition.priority}`
  }));
  
  return {
    selected,
    allowed: allowedCandidates,
    reasons: candidates // All candidates with reasons
  };
}

export async function selectNudgesForUser(
  userId: string, 
  limit = 2,
  currentTime = new Date(),
  qaMock?: QAMock,
  options?: SchedulerOptions
): Promise<SelectedNudge[] | NudgeCandidate[]> {
  try {
    // Use QA time if provided, otherwise use currentTime
    const now = options?.qaNow || currentTime;
    
    // Load nudge history (synthetic for QA, real for production)
    let lastShownDates: Record<string, Date> = {};
    let weeklyShownCounts: Record<string, number> = {};
    
    if (qaMock?.qaHistory) {
      // Use synthetic history from QA scenario
      const history = qaMock.qaHistory;
      for (const [nudgeId, dateStr] of Object.entries(history.lastShownByNudge || {})) {
        lastShownDates[nudgeId] = new Date(dateStr);
      }
      weeklyShownCounts = history.shownThisWeek || {};
    } else {
      // Load real history from database
      const [realLastShownDates, realWeeklyShownCounts] = await Promise.all([
        getLastShownDates(userId),
        get7DayCounts(userId)
      ]);
      lastShownDates = realLastShownDates;
      weeklyShownCounts = realWeeklyShownCounts;
    }

    // Build user context (with QA mocks if provided)
    let context = await buildUserContext(userId, now);
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
        let flagEnabled = false;
        
        if (options?.ignoreFeatureFlags) {
          // In QA mode, use flags from scenario or default to enabled
          flagEnabled = qaMock?.qaFlags?.[definition.enabledFlag] ?? true;
        } else {
          const { data: flagData } = await supabase
            .from('feature_flags')
            .select('enabled')
            .eq('key', definition.enabledFlag)
            .maybeSingle();
          
          flagEnabled = qaMock ? true : (flagData?.enabled || false);
        }
        
        reasons.push({
          gate: 'featureFlag',
          pass: flagEnabled,
          detail: definition.enabledFlag + (options?.ignoreFeatureFlags ? ' (QA mode)' : '')
        });
        
        if (!flagEnabled) {
          allowed = false;
        }
      } else {
        reasons.push({ gate: 'featureFlag', pass: true, detail: 'no flag required' });
      }

      // Check time window (use QA time if available)
      if (definition.window) {
        const currentHour = now.getHours();
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

      // Check cooldown (use QA history if available)
      const lastShown = lastShownDates[definition.id];
      if (lastShown) {
        const cooldownMs = definition.cooldownDays * 24 * 60 * 60 * 1000;
        const timeSinceLastShown = now.getTime() - lastShown.getTime();
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
          detail: 'never shown' 
        });
      }

      // Check daily cap (use QA history if available)
      let todayCount = 0;
      
      if (qaMock?.qaHistory) {
        // Use synthetic history
        todayCount = qaMock.qaHistory.shownToday?.[definition.id] || 0;
      } else {
        // Query real database
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        
        const { data: todayShownCount } = await supabase
          .from('nudge_events')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .eq('nudge_id', definition.id)
          .eq('event', 'shown')
          .gte('ts', todayStart.toISOString());

        todayCount = todayShownCount?.length || 0;
      }
      
      const dailyCapPass = todayCount < definition.dailyCap;
      
      reasons.push({
        gate: 'dailyCap',
        pass: dailyCapPass,
        detail: `${todayCount}/${definition.dailyCap} today`
      });
      
      if (!dailyCapPass) {
        allowed = false;
      }

      // Check weekly cap (use QA history if available)  
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
          reason: `eligible_at_${now.getHours()}h`
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