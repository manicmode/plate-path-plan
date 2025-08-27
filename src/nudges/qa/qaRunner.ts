import { selectNudgesForUser, NudgeCandidate, SchedulerOptions } from '../scheduler';
import { QAScenario, QASignals, QA_SCENARIOS, QA_TEST_USERS } from './scenarios';
import { logNudgeEvent } from '../logEvent';

export interface QAScenarioResult {
  scenarioId: string;
  scenario: QAScenario;
  candidates: NudgeCandidate[];
  passed: boolean;
  issues: string[];
}

export interface QAMatrixResult {
  results: QAScenarioResult[];
  overallPass: boolean;
  summary: {
    totalScenarios: number;
    passedScenarios: number;
    failedScenarios: number;
  };
}

export async function runQAMatrix(userId: string, dryRun = true): Promise<QAMatrixResult> {
  const results: QAScenarioResult[] = [];
  
  for (const scenario of QA_SCENARIOS) {
    const result = await runQAScenario(userId, scenario, dryRun);
    results.push(result);
  }
  
  const passedScenarios = results.filter(r => r.passed).length;
  const failedScenarios = results.length - passedScenarios;
  
  return {
    results,
    overallPass: failedScenarios === 0,
    summary: {
      totalScenarios: results.length,
      passedScenarios,
      failedScenarios,
    },
  };
}

export async function runQAScenario(
  userId: string, 
  scenario: QAScenario, 
  dryRun = true
): Promise<QAScenarioResult> {
  try {
    const currentTime = new Date(scenario.at);
    
    // Create QA mock with scenario signals
    const qaMock = {
      frozenNow: scenario.at,
      bypassQuietHours: true,
      ...convertSignalsToQAMock(scenario.signals, currentTime),
    };
    
    // Call scheduler with QA options (force flags on, get detailed reasons)
    const schedulerOptions: SchedulerOptions = {
      dryRun,
      ignoreFeatureFlags: true, // Force feature flags on in QA
      ignoreCooldowns: false, // We want to test cooldowns
      ignoreDailyCaps: false, // We want to test daily caps
      ignoreWeeklyCaps: false, // We want to test weekly caps
      returnReasons: true, // Get detailed gate reasons
    };
    
    const candidates = await selectNudgesForUser(
      userId,
      10, // Get all candidates for analysis
      currentTime,
      qaMock,
      schedulerOptions
    ) as NudgeCandidate[];
    
    // Log QA events if not dry run
    if (!dryRun) {
      const runId = `qa-${new Date().toISOString().split('T')[0]}-${userId}-${scenario.id}`;
      const allowedNudges = candidates.filter(c => c.allowed);
      
      for (const nudge of allowedNudges) {
        await logNudgeEvent({
          nudgeId: nudge.id,
          event: 'shown',
          reason: 'qa',
          runId,
        });
        
        // Simulate interaction (80% dismiss, 20% CTA)
        const interactionEvent = Math.random() < 0.2 ? 'cta' : 'dismissed';
        await logNudgeEvent({
          nudgeId: nudge.id,
          event: interactionEvent,
          reason: 'qa',
          runId,
        });
      }
    }
    
    // Validate expectations
    const issues = validateScenarioExpectations(scenario, candidates);
    
    return {
      scenarioId: scenario.id,
      scenario,
      candidates,
      passed: issues.length === 0,
      issues,
    };
    
  } catch (error) {
    return {
      scenarioId: scenario.id,
      scenario,
      candidates: [],
      passed: false,
      issues: [`Error running scenario: ${error}`],
    };
  }
}

function convertSignalsToQAMock(signals: QASignals, currentTime: Date): any {
  const mock: any = {
    userId: 'qa-user',
    currentTime,
    timezone: signals.timezone || 'America/Los_Angeles',
  };
  
  // Convert signals to mock context
  if (signals.waterLogsToday !== undefined) {
    mock.waterLogsToday = signals.waterLogsToday;
  }
  
  if (signals.activityLast48h !== undefined) {
    mock.activityLast48h = signals.activityLast48h;
  }
  
  if (signals.upcomingBedtime !== undefined) {
    mock.upcomingBedtime = signals.upcomingBedtime;
  }
  
  if (signals.sleepScoreBelowTarget !== undefined) {
    mock.sleepScoreBelowTarget = signals.sleepScoreBelowTarget;
  }
  
  if (signals.stressTagsLast48h !== undefined) {
    mock.stressTagsLast48h = signals.stressTagsLast48h;
  }
  
  if (signals.breathingSessionsLast7d !== undefined) {
    mock.breathingSessionsLast7d = signals.breathingSessionsLast7d;
  }
  
  if (signals.lastMoodLog !== undefined) {
    mock.lastMoodLog = signals.lastMoodLog;
  }
  
  if (signals.lastBreathingSession !== undefined) {
    mock.lastBreathingSession = signals.lastBreathingSession;
  } else if (signals.lastBreathHours !== undefined) {
    mock.lastBreathingSession = new Date(currentTime.getTime() - signals.lastBreathHours * 60 * 60 * 1000);
  } else if (signals.lastBreathDays !== undefined) {
    mock.lastBreathingSession = new Date(currentTime.getTime() - signals.lastBreathDays * 24 * 60 * 60 * 1000);
  }
  
  return mock;
}

function validateScenarioExpectations(scenario: QAScenario, candidates: NudgeCandidate[]): string[] {
  const issues: string[] = [];
  const allowedNudges = candidates.filter(c => c.allowed);
  const allowedIds = allowedNudges.map(n => n.id);
  
  // Check expected count
  if (allowedNudges.length !== scenario.expect.length) {
    issues.push(`Expected ${scenario.expect.length} nudges, got ${allowedNudges.length}`);
  }
  
  // Check expected nudge IDs
  for (const expectedId of scenario.expect) {
    if (!allowedIds.includes(expectedId)) {
      issues.push(`Expected nudge '${expectedId}' not found`);
    }
  }
  
  // Check for unexpected nudges
  for (const allowedId of allowedIds) {
    if (!scenario.expect.includes(allowedId)) {
      issues.push(`Unexpected nudge '${allowedId}' was allowed`);
    }
  }
  
  return issues;
}