import { scheduleNudges, ScheduleResult, NudgeCandidate, SelectedNudge } from '../scheduler';
import { QAScenario, QASignals, QAHistory, QA_SCENARIOS, QA_TEST_USERS } from './scenarios';
import { logNudgeEvent } from '../logEvent';

export interface QAScenarioResult {
  scenarioId: string;
  scenario: QAScenario;
  selected: SelectedNudge[];
  allowed: NudgeCandidate[];
  allCandidates: NudgeCandidate[];
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
    const qaNow = new Date(scenario.at);
    
    // Create QA mock with scenario signals
    const qaMock = {
      frozenNow: scenario.at,
      bypassQuietHours: false, // Use real time windows
      qaHistory: scenario.history,
      qaFlags: scenario.flags,
      ...convertSignalsToQAMock(scenario.signals, qaNow),
    };
    
    // Use the new scheduleNudges function for real selection
    const result = await scheduleNudges({
      userId,
      now: qaNow,
      maxPerRun: 1, // QA expects 1 per scenario
      qaMode: true,
      qaMock
    });
    
    console.log(`QA Scenario ${scenario.id}:`, {
      selected: result.selected.map(s => s.id),
      allowed: result.allowed.map(a => a.id),
      expected: scenario.expect
    });
    
    // Add assertion for midday_low_hydration scenario
    if (scenario.id === 'midday_low_hydration') {
      if (result.selected.length > 0 && result.selected[0].id !== 'hydration_reminder') {
        throw new Error(`Expected hydration_reminder to be selected, got ${result.selected[0]?.id || 'none'}`);
      }
    }
    
    // Validate expectations against selected nudges
    const issues = validateScenarioExpectations(scenario, result.selected, result.allowed);
    
    return {
      scenarioId: scenario.id,
      scenario,
      selected: result.selected,
      allowed: result.allowed,
      allCandidates: result.reasons,
      passed: issues.length === 0,
      issues,
    };
    
  } catch (error) {
    return {
      scenarioId: scenario.id,
      scenario,
      selected: [],
      allowed: [],
      allCandidates: [],
      passed: false,
      issues: [`Error running scenario: ${error}`],
    };
  }
}

function convertSignalsToQAMock(signals: QASignals, qaNow: Date): any {
  const mock: any = {
    userId: 'qa-user',
    currentTime: qaNow,
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
    mock.lastBreathingSession = new Date(qaNow.getTime() - signals.lastBreathHours * 60 * 60 * 1000);
  } else if (signals.lastBreathDays !== undefined) {
    mock.lastBreathingSession = new Date(qaNow.getTime() - signals.lastBreathDays * 24 * 60 * 60 * 1000);
  }
  
  return mock;
}

function validateScenarioExpectations(
  scenario: QAScenario, 
  selectedNudges: SelectedNudge[], 
  allowedNudges: NudgeCandidate[]
): string[] {
  const issues: string[] = [];
  const selectedIds = selectedNudges.map(n => n.id);
  
  // Check expected count against selected (final) nudges
  if (selectedIds.length !== scenario.expect.length) {
    issues.push(`Expected ${scenario.expect.length} selected, got ${selectedIds.length}`);
  }
  
  // Check expected nudge IDs in selected
  for (const expectedId of scenario.expect) {
    if (!selectedIds.includes(expectedId)) {
      issues.push(`Expected nudge '${expectedId}' not selected`);
    }
  }
  
  // Check for unexpected selected nudges
  for (const selectedId of selectedIds) {
    if (!scenario.expect.includes(selectedId)) {
      issues.push(`Unexpected nudge '${selectedId}' was selected`);
    }
  }
  
  return issues;
}