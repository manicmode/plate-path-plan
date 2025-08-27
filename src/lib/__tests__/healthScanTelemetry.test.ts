import { describe, it, expect, beforeEach } from 'vitest';
import { telemetry, logFallbackEvents } from '../healthScanTelemetry';

describe('Health Scan Telemetry', () => {
  beforeEach(() => {
    // Clear events before each test
    telemetry.clear();
  });

  describe('TelemetryLogger', () => {
    it('logs events with timestamp', () => {
      telemetry.log('test_event', { key: 'value' });
      
      const events = telemetry.getRecentEvents(1);
      expect(events).toHaveLength(1);
      expect(events[0].event).toBe('test_event');
      expect(events[0].data).toEqual({ key: 'value' });
      expect(events[0].timestamp).toBeTypeOf('number');
    });

    it('maintains event queue with max size', () => {
      // Add more than max events
      for (let i = 0; i < 110; i++) {
        telemetry.log(`event_${i}`);
      }
      
      const events = telemetry.getRecentEvents(200);
      expect(events.length).toBeLessThanOrEqual(100);
      
      // Should have the most recent events
      expect(events[events.length - 1].event).toBe('event_109');
    });

    it('handles events without data', () => {
      telemetry.log('simple_event');
      
      const events = telemetry.getRecentEvents(1);
      expect(events[0].event).toBe('simple_event');
      expect(events[0].data).toBeUndefined();
    });

    it('clears all events', () => {
      telemetry.log('event1');
      telemetry.log('event2');
      
      expect(telemetry.getRecentEvents().length).toBe(2);
      
      telemetry.clear();
      
      expect(telemetry.getRecentEvents().length).toBe(0);
    });
  });

  describe('logFallbackEvents', () => {
    it('logs search started event', () => {
      logFallbackEvents.searchStarted('text', 15);
      
      const events = telemetry.getRecentEvents(1);
      expect(events[0].event).toBe('fallback_search_started');
      expect(events[0].data).toEqual({ type: 'text', queryLength: 15 });
    });

    it('logs results received event', () => {
      logFallbackEvents.resultsReceived(5, true, 850, 0.95);
      
      const events = telemetry.getRecentEvents(1);
      expect(events[0].event).toBe('fallback_results_received');
      expect(events[0].data).toEqual({
        count: 5,
        hasResults: true,
        latency_ms: 850,
        topConfidence: 0.95
      });
    });

    it('logs result selected event', () => {
      logFallbackEvents.resultSelected('off', 0.87, true);
      
      const events = telemetry.getRecentEvents(1);
      expect(events[0].event).toBe('fallback_result_selected');
      expect(events[0].data).toEqual({
        source: 'off',
        confidence: 0.87,
        hasNutrition: true
      });
    });

    it('logs voice started event', () => {
      logFallbackEvents.voiceStarted('browser', true, false);
      
      const events = telemetry.getRecentEvents(1);
      expect(events[0].event).toBe('fallback_voice_started');
      expect(events[0].data).toMatchObject({
        method: 'browser',
        browserSupported: true,
        serverAvailable: false
      });
      expect(events[0].data?.userAgent).toBeTypeOf('string');
    });

    it('logs voice succeeded event', () => {
      logFallbackEvents.voiceSucceeded('server', 1250, 25, 'whisper');
      
      const events = telemetry.getRecentEvents(1);
      expect(events[0].event).toBe('fallback_voice_succeeded');
      expect(events[0].data).toEqual({
        method: 'server',
        duration_ms: 1250,
        textLength: 25,
        provider: 'whisper'
      });
    });

    it('logs voice failed event', () => {
      const longError = 'A'.repeat(150);
      logFallbackEvents.voiceFailed('browser', longError);
      
      const events = telemetry.getRecentEvents(1);
      expect(events[0].event).toBe('fallback_voice_failed');
      expect(events[0].data?.method).toBe('browser');
      expect(events[0].data?.error).toHaveLength(100); // Truncated
    });
  });
});