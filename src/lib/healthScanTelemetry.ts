/**
 * Lightweight client-side telemetry for Health Scan fallbacks
 * No PII, no database writes - just console breadcrumbs
 */

interface TelemetryEvent {
  event: string;
  timestamp: number;
  data?: Record<string, any>;
}

class TelemetryLogger {
  private events: TelemetryEvent[] = [];
  private maxEvents = 100; // Keep last 100 events

  log(eventName: string, data?: Record<string, any>) {
    const event: TelemetryEvent = {
      event: eventName,
      timestamp: Date.now(),
      data: data ? { ...data } : undefined // Shallow copy to prevent mutations
    };

    // Add to internal queue
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Console breadcrumb with structured format
    const timings = data && (data.duration_ms || data.latency_ms) 
      ? ` (${data.duration_ms || data.latency_ms}ms)` 
      : '';
    
    console.log(`📊 [TELEMETRY] ${eventName}${timings}`, data || '');
  }

  // Get recent events for debugging
  getRecentEvents(count = 10): TelemetryEvent[] {
    return this.events.slice(-count);
  }

  // Clear all stored events
  clear() {
    this.events = [];
  }
}

// Singleton instance
export const telemetry = new TelemetryLogger();

// Convenience functions for common Health Scan events
export const logFallbackEvents = {
  searchStarted: (type: 'text' | 'voice', queryLength: number) => {
    telemetry.log('fallback_search_started', { type, queryLength });
  },

  resultsReceived: (count: number, hasResults: boolean, latency_ms: number, topConfidence?: number) => {
    telemetry.log('fallback_results_received', { 
      count, 
      hasResults, 
      latency_ms,
      topConfidence 
    });
  },

  resultSelected: (source: string, confidence?: number, hasNutrition?: boolean) => {
    telemetry.log('fallback_result_selected', { 
      source, 
      confidence, 
      hasNutrition 
    });
  },

  voiceStarted: (method: 'browser' | 'server', browserSupported: boolean, serverAvailable: boolean) => {
    telemetry.log('fallback_voice_started', { 
      method, 
      browserSupported, 
      serverAvailable,
      userAgent: navigator.userAgent.substring(0, 50)
    });
  },

  voiceSucceeded: (method: 'browser' | 'server', duration_ms: number, textLength: number, provider?: string) => {
    telemetry.log('fallback_voice_succeeded', { 
      method, 
      duration_ms, 
      textLength,
      provider 
    });
  },

  voiceFailed: (method: 'browser' | 'server', error: string) => {
    telemetry.log('fallback_voice_failed', { 
      method, 
      error: error.substring(0, 100) // Truncate long errors
    });
  }
};