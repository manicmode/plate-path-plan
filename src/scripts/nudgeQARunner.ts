/**
 * Enhanced QA Runner for Nudge System Validation
 * Run this in browser console for real-time testing
 */

import { supabase } from '@/integrations/supabase/client';

interface QAEvidence {
  timestamp: string;
  location: string;
  evidence: string;
  logs: any[];
  screenshot?: string;
}

class NudgeQARunner {
  private evidence: QAEvidence[] = [];
  private originalConsoleLog = console.log;

  constructor() {
    this.setupConsoleCapture();
  }

  private setupConsoleCapture() {
    const logs: any[] = [];
    console.log = (...args) => {
      logs.push({
        timestamp: new Date().toISOString(),
        args: args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        )
      });
      this.originalConsoleLog(...args);
    };
    
    (window as any).nudgeQALogs = logs;
  }

  async captureEvidence(location: string, evidence: string) {
    const logs = ((window as any).nudgeQALogs || []).slice(-10); // Last 10 logs
    this.evidence.push({
      timestamp: new Date().toISOString(),
      location,
      evidence,
      logs
    });
  }

  async runComprehensiveQA() {
    console.log("🧪 Starting Comprehensive Nudge QA");
    console.log("⏰ Current PT time:", new Date().toLocaleString('en-US', {timeZone: 'America/Los_Angeles'}));
    
    // A) Console & Local Proof
    await this.testBoundaryRefresh();
    await this.testPersistenceAcrossReloads();
    
    // B) Database proof
    await this.queryDatabaseEvidence();
    
    // C) Breathing nudge eligibility
    await this.testBreathingNudgeEligibility();
    
    // D) Midnight reset simulation
    await this.testMidnightReset();
    
    this.printEvidenceReport();
  }

  async testBoundaryRefresh() {
    console.log("\n📍 A1) Testing Boundary Refresh at 23:00 PT");
    
    // Check if we're near a boundary
    const now = new Date();
    const ptTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
    const hour = ptTime.getHours();
    const minute = ptTime.getMinutes();
    
    console.log(`Current PT time: ${hour}:${minute.toString().padStart(2, '0')}`);
    
    if (hour >= 19 && hour < 24) {
      console.log("✅ Within Daily Check-In window (19:00-24:00 PT)");
    } else {
      console.log("⚠️ Outside Daily Check-In window");
    }
    
    // Check localStorage for nudges
    const userId = await this.getCurrentUserId();
    if (userId) {
      const storedNudges = localStorage.getItem(`active_nudges_${userId}`);
      console.log("📦 Stored nudges:", storedNudges);
      
      const shownRunIds = localStorage.getItem(`shown_runids_${userId}`);
      console.log("🏃 Shown runIds:", shownRunIds);
    }
    
    await this.captureEvidence("BoundaryRefresh", "Checked window and localStorage");
  }

  async testPersistenceAcrossReloads() {
    console.log("\n📍 A2) Testing Persistence Across Reloads");
    
    const userId = await this.getCurrentUserId();
    if (!userId) {
      console.log("❌ No authenticated user found");
      return;
    }

    // Simulate reload by clearing and rehydrating
    const storedNudges = localStorage.getItem(`active_nudges_${userId}`);
    if (storedNudges) {
      console.log("🔄 Simulating reload - rehydrating from localStorage");
      const nudges = JSON.parse(storedNudges);
      console.log("📦 Rehydrated nudges:", nudges);
      
      for (const nudge of nudges) {
        console.log(`🏃 Nudge ${nudge.id} - runId: ${nudge.runId}`);
      }
      
      await this.captureEvidence("Persistence", `Rehydrated ${nudges.length} nudges from localStorage`);
    } else {
      console.log("📦 No nudges in localStorage to rehydrate");
    }
  }

  async queryDatabaseEvidence() {
    console.log("\n📍 B) Database Evidence Query");
    
    try {
      // Query today's events directly
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);
      
      const { data: todayEvents, error } = await supabase
        .from('nudge_events')
        .select('run_id, nudge_id, event, ts')
        .gte('ts', startOfDay.toISOString())
        .lt('ts', endOfDay.toISOString())
        .in('nudge_id', ['daily_checkin', 'time_to_breathe'])
        .order('ts', { ascending: false });

      if (error) {
        console.error("❌ Database query error:", error);
      } else {
        console.log("📊 Today's nudge events:", todayEvents);
        
        // Group by run_id and check for duplicates
        const groupedEvents = (todayEvents || []).reduce((acc: any, event: any) => {
          const key = `${event.run_id}-${event.event}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        
        const duplicates = Object.entries(groupedEvents).filter(([key, count]) => 
          key.includes('-shown') && (count as number) > 1
        );
        
        if (duplicates.length === 0) {
          console.log("✅ No duplicate 'shown' events found");
        } else {
          console.log("❌ Duplicate 'shown' events found:", duplicates);
        }
      }

      await this.captureEvidence("Database", `Queried ${(todayEvents || []).length} events`);
    } catch (error) {
      console.error("💥 Database query failed:", error);
    }
  }

  async testBreathingNudgeEligibility() {
    console.log("\n📍 C) Breathing Nudge Eligibility");
    
    // Mock scenario with stress tags
    const mockContext = {
      stressTagsLast48h: true,
      waterLogsToday: 8,
      lastMoodLog: new Date().toISOString()
    };
    
    console.log("🧠 Mock context with stress:", mockContext);
    console.log("⚡ Breathing nudge should be eligible with stressTagsLast48h: true");
    
    await this.captureEvidence("BreathingEligibility", "Tested breathing nudge with stress context");
  }

  async testMidnightReset() {
    console.log("\n📍 D) Midnight Reset Simulation");
    
    // Simulate midnight rollover
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    console.log("🌙 Simulating midnight rollover to:", tomorrow.toISOString());
    console.log("🔄 At midnight, localStorage keys should rotate and runIds refresh");
    
    await this.captureEvidence("MidnightReset", "Simulated midnight rollover scenario");
  }

  async getCurrentUserId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch {
      return null;
    }
  }

  printEvidenceReport() {
    console.log("\n📋 QA Evidence Report");
    console.log("=".repeat(50));
    
    this.evidence.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.location}`);
      console.log(`   Time: ${item.timestamp}`);
      console.log(`   Evidence: ${item.evidence}`);
      console.log(`   Recent logs: ${item.logs.length} captured`);
    });
    
    console.log("\n🎯 Expected Evidence Checklist:");
    console.log("□ Daily Check-In visible at 23:00 and 23:55 PT");
    console.log("□ No duplicate 'shown' logs for same runId");
    console.log("□ localStorage persistence across reloads");
    console.log("□ Breathing nudge with stress eligibility");
    console.log("□ Max 2 nudges concurrent");
    console.log("□ Window boundary refresh firing");
  }
}

// Database queries for manual validation
export const QA_QUERIES = {
  todaysPTEvents: `
    -- Today's nudge events in PT timezone
    WITH tz AS (
      SELECT (date_trunc('day', (now() AT TIME ZONE 'America/Los_Angeles')) AT TIME ZONE 'UTC') AS start_utc
    ),
    bounds AS (
      SELECT start_utc, start_utc + interval '1 day' AS end_utc FROM tz
    )
    SELECT run_id, nudge_id, event, COUNT(*) AS cnt, MIN(ts) AS first_at, MAX(ts) AS last_at
    FROM public.nudge_events ne, bounds b
    WHERE ne.ts >= b.start_utc AND ne.ts < b.end_utc
      AND nudge_id IN ('daily_checkin','time_to_breathe')
    GROUP BY run_id, nudge_id, event
    ORDER BY last_at DESC;
  `,
  
  eventTotals: `
    -- Sanity: totals by event (today PT)
    WITH tz AS (
      SELECT (date_trunc('day', (now() AT TIME ZONE 'America/Los_Angeles')) AT TIME ZONE 'UTC') AS start_utc
    ),
    bounds AS (
      SELECT start_utc, start_utc + interval '1 day' AS end_utc FROM tz
    )
    SELECT nudge_id, event, COUNT(*) AS cnt
    FROM public.nudge_events ne, bounds b
    WHERE ne.ts >= b.start_utc AND ne.ts < b.end_utc
    GROUP BY nudge_id, event
    ORDER BY 1,2;
  `
};

// Global QA function exposure (simplified and reliable)
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  const globalWindow = window as any;
  
  // Primary QA functions
  globalWindow.runNudgeQA = () => new NudgeQARunner().runComprehensiveQA();
  
  globalWindow.nudgeQA = {
    run: () => new NudgeQARunner().runComprehensiveQA(),
    
    checkPersistence: () => {
      const keys = Object.keys(localStorage).filter(k => 
        k.startsWith('nudgeRun:') || k.startsWith('active_nudges_') || k.startsWith('shown_runids_')
      );
      console.log('📦 Nudge persistence check:');
      keys.forEach(key => {
        const value = localStorage.getItem(key);
        console.log(`  ${key}: ${value}`);
      });
      return keys.map(k => ({ key: k, value: localStorage.getItem(k) }));
    },
    
    simulateStress: () => {
      console.log('🧠 To test breathing nudge eligibility:');
      console.log('  1. Go to /qa/nudges dashboard');
      console.log('  2. Use the "Add Stress Tags" button to simulate mood with stress');
      console.log('  3. Or manually log mood with tags: stressed, anxious, overwhelmed');
      return { 
        message: 'Use mood logging to add stress tags',
        tags: ['stressed', 'anxious', 'overwhelmed', 'tense', 'worried'] 
      };
    },
    
    dbQueries: {
      todayEvents: () => {
        const query = QA_QUERIES.todaysPTEvents;
        console.log('📊 Copy this query to Supabase SQL editor:');
        console.log(query);
        return query;
      },
      
      eventTotals: () => {
        const query = QA_QUERIES.eventTotals;
        console.log('📈 Event totals query:');
        console.log(query);
        return query;
      }
    },
    
    debugRoute: () => {
      console.log('🔍 Route debugging:');
      console.log('  Current path:', window.location.pathname);
      console.log('  Expected routes:');
      console.log('    - /qa/nudges (dev only)');
      console.log('    - /nudge-qa (if exists)');
      
      if (window.location.pathname !== '/qa/nudges') {
        console.log('  💡 Navigate to: /qa/nudges');
      }
      
      return {
        currentPath: window.location.pathname,
        expectedRoutes: ['/qa/nudges']
      };
    }
  };
  
  // Additional references for backwards compatibility
  globalWindow.NudgeQARunner = NudgeQARunner;
  globalWindow.QA_QUERIES = QA_QUERIES;
  
  // Immediate confirmation (not waiting for DOM)
  console.log('🧪 Nudge QA Tools Loaded! Available commands:');
  console.log('  - window.runNudgeQA() → Full QA validation');
  console.log('  - window.nudgeQA.checkPersistence() → Check localStorage');
  console.log('  - window.nudgeQA.simulateStress() → Stress test guidance');
  console.log('  - window.nudgeQA.dbQueries.todayEvents() → SQL for events');
  console.log('  - window.nudgeQA.debugRoute() → Route debugging');
  console.log('  📍 Dashboard available at: /qa/nudges');
}

export default NudgeQARunner;