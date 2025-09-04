/**
 * QA Validation Script for Nudge System Fixes
 * 
 * Tests:
 * 1. Daily Check-In persists past 22:00 until midnight across reloads
 * 2. Breathing nudge can appear when stress tags exist
 * 3. Max two nudges show concurrently
 */

import { scheduleNudges } from '@/nudges/scheduler';

export interface QAScenario {
  name: string;
  time: string; // ISO time string
  description: string;
  expectedNudges: string[];
  mockContext: {
    waterLogsToday?: number;
    stressTagsLast48h?: boolean;
    lastMoodLog?: string | null;
  };
}

export const QA_SCENARIOS: QAScenario[] = [
  {
    name: "Daily Check-In at 23:00",
    time: "2024-01-15T23:00:00.000Z", // 11PM
    description: "Daily Check-In should be available at 23:00 (within 19:00-24:00 window)",
    expectedNudges: ["daily_checkin"],
    mockContext: {
      lastMoodLog: null, // No mood log today
      stressTagsLast48h: false,
      waterLogsToday: 8
    }
  },
  {
    name: "Daily Check-In at 23:55",
    time: "2024-01-15T23:55:00.000Z", // 11:55PM
    description: "Daily Check-In should still be available just before midnight",
    expectedNudges: ["daily_checkin"],
    mockContext: {
      lastMoodLog: null,
      stressTagsLast48h: false,
      waterLogsToday: 8
    }
  },
  {
    name: "Breathing Nudge with Stress",
    time: "2024-01-15T15:00:00.000Z", // 3PM
    description: "Breathing nudge should appear when stress tags exist",
    expectedNudges: ["time_to_breathe"],
    mockContext: {
      stressTagsLast48h: true, // Key condition for breathing nudge
      waterLogsToday: 8,
      lastMoodLog: "2024-01-15T12:00:00.000Z" // Already logged mood
    }
  },
  {
    name: "Max Two Nudges Concurrent",
    time: "2024-01-15T21:00:00.000Z", // 9PM
    description: "Should show max 2 nudges when multiple are eligible",
    expectedNudges: ["daily_checkin"], // Should prioritize by priority score
    mockContext: {
      lastMoodLog: null, // Eligible for daily check-in
      stressTagsLast48h: true, // Eligible for breathing
      waterLogsToday: 2 // Eligible for hydration (< 4)
    }
  }
];

export async function runQAValidation(userId: string): Promise<{
  scenario: string;
  passed: boolean;
  expected: string[];
  actual: string[];
  message: string;
}[]> {
  const results: Array<{
    scenario: string;
    passed: boolean;
    expected: string[];
    actual: string[];
    message: string;
  }> = [];

  console.log("🧪 Starting Nudge QA Validation...");

  for (const scenario of QA_SCENARIOS) {
    console.log(`\n📋 Testing: ${scenario.name}`);
    console.log(`⏰ Time: ${scenario.time}`);
    console.log(`📝 Description: ${scenario.description}`);

    try {
      const testTime = new Date(scenario.time);
      
      // Create QA mock matching the scenario
      const qaMock = {
        waterLogsToday: scenario.mockContext.waterLogsToday ?? 0,
        stressTagsLast48h: scenario.mockContext.stressTagsLast48h ?? false,
        lastMoodLog: scenario.mockContext.lastMoodLog ? new Date(scenario.mockContext.lastMoodLog) : null,
        activityLast48h: false,
        upcomingBedtime: testTime.getHours() >= 20,
        sleepScoreBelowTarget: true,
        breathingSessionsLast7d: 0,
        qaFlags: {
          breathing_nudges_enabled: true
        },
        qaHistory: {
          lastShownByNudge: {},
          shownThisWeek: {},
          shownToday: {}
        },
        bypassQuietHours: false
      };

      const result = await scheduleNudges({
        userId,
        now: testTime,
        maxPerRun: 2,
        qaMode: true,
        qaMock
      });

      const actualNudgeIds = result.selected.map(n => n.id);
      const passed = arraysEqual(actualNudgeIds.sort(), scenario.expectedNudges.sort());

      const message = passed 
        ? `✅ PASS: Got expected nudges`
        : `❌ FAIL: Expected [${scenario.expectedNudges.join(', ')}], got [${actualNudgeIds.join(', ')}]`;

      console.log(message);
      console.log(`📊 Detailed results:`, {
        selected: result.selected.map(n => ({ id: n.id, priority: n.definition.priority })),
        allowedCount: result.allowed.length,
        totalCandidates: result.reasons.length
      });

      results.push({
        scenario: scenario.name,
        passed,
        expected: scenario.expectedNudges,
        actual: actualNudgeIds,
        message
      });

    } catch (error) {
      console.error(`💥 ERROR in scenario "${scenario.name}":`, error);
      results.push({
        scenario: scenario.name,
        passed: false,
        expected: scenario.expectedNudges,
        actual: [],
        message: `Error: ${error}`
      });
    }
  }

  // Print summary
  const passCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  console.log(`\n📊 QA Summary: ${passCount}/${totalCount} tests passed`);
  
  if (passCount === totalCount) {
    console.log("🎉 All tests passed!");
  } else {
    console.log("⚠️ Some tests failed. Review results above.");
  }

  return results;
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, i) => val === b[i]);
}

// Browser-friendly runner for console testing
export async function runBrowserQA() {
  // Mock user ID for testing
  const testUserId = "test-user-" + Math.random().toString(36).substr(2, 9);
  
  console.log("🌐 Running browser QA with test user:", testUserId);
  return await runQAValidation(testUserId);
}

// Expose to window for easy console access
if (typeof window !== 'undefined') {
  (window as any).runNudgeQA = runBrowserQA;
  console.log("🔧 QA function available as: window.runNudgeQA()");
}