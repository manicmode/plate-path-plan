/**
 * Tests for V2 Health Report Rollout System
 * Verifies safe dual-path rendering with remote kill switch
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { shouldUseV2Report, getReportFlags, clearFlagsCache } from '@/lib/health/reportFlags';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; })
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock URLSearchParams for URL parameter tests
const mockSearchParams = new Map();
Object.defineProperty(window, 'location', {
  value: { search: '' },
  writable: true
});

vi.mock('URLSearchParams', () => {
  return vi.fn().mockImplementation(() => ({
    get: vi.fn((key: string) => mockSearchParams.get(key))
  }));
});

describe('V2 Rollout System', () => {
  beforeEach(() => {
    clearFlagsCache();
    localStorageMock.clear();
    mockSearchParams.clear();
  });

  describe('Default Configuration', () => {
    it('should ship with safe defaults (V2 disabled)', async () => {
      const flags = await getReportFlags();
      
      expect(flags.health_report_v2_enabled).toBe(false);
      expect(flags.health_report_v2_routes).toEqual(['standalone']);
      expect(flags.health_report_v2_rollout_percent).toBe(0);
    });

    it('should choose V1 by default for all routes', async () => {
      const decision = await shouldUseV2Report('barcode');
      
      expect(decision.useV2).toBe(false);
      expect(decision.reason).toBe('globally_disabled');
    });
  });

  describe('URL Parameter Overrides', () => {
    it('should force V1 when ?forceReport=v1', async () => {
      mockSearchParams.set('forceReport', 'v1');
      
      const decision = await shouldUseV2Report('standalone');
      
      expect(decision.useV2).toBe(false);
      expect(decision.reason).toBe('url_force_v1');
      expect(decision.flagsHash).toBe('forced');
    });

    it('should force V2 when ?forceReport=v2', async () => {
      mockSearchParams.set('forceReport', 'v2');
      
      const decision = await shouldUseV2Report('barcode');
      
      expect(decision.useV2).toBe(true);
      expect(decision.reason).toBe('url_force_v2');
      expect(decision.flagsHash).toBe('forced');
    });
  });

  describe('localStorage Developer Overrides', () => {
    it('should enable V2 when localStorage override is set to enabled', async () => {
      localStorageMock.setItem('health_report_v2_override', 'enabled');
      
      const decision = await shouldUseV2Report('barcode');
      
      expect(decision.useV2).toBe(true);
      expect(decision.reason).toBe('dev_override_enabled');
      expect(decision.flagsHash).toBe('dev_override');
    });

    it('should disable V2 when localStorage override is set to disabled', async () => {
      localStorageMock.setItem('health_report_v2_override', 'disabled');
      
      const decision = await shouldUseV2Report('standalone');
      
      expect(decision.useV2).toBe(false);
      expect(decision.reason).toBe('dev_override_disabled');
      expect(decision.flagsHash).toBe('dev_override');
    });
  });

  describe('Route Safelist', () => {
    it('should reject routes not in safelist even when enabled', async () => {
      // Simulate enabled flags with standalone in safelist
      localStorageMock.setItem('report_flags_override', JSON.stringify({
        health_report_v2_enabled: true,
        health_report_v2_routes: ['standalone'],
        health_report_v2_rollout_percent: 100
      }));
      
      const decision = await shouldUseV2Report('barcode');
      
      expect(decision.useV2).toBe(false);
      expect(decision.reason).toBe('route_not_in_safelist');
    });

    it('should allow routes in safelist when other conditions met', async () => {
      localStorageMock.setItem('report_flags_override', JSON.stringify({
        health_report_v2_enabled: true,
        health_report_v2_routes: ['standalone', 'barcode'],
        health_report_v2_rollout_percent: 100
      }));
      
      const decision = await shouldUseV2Report('barcode');
      
      expect(decision.useV2).toBe(true);
      expect(decision.reason).toBe('rollout_criteria_met');
    });
  });

  describe('Rollout Percentage', () => {
    it('should respect rollout percentage limits', async () => {
      localStorageMock.setItem('report_flags_override', JSON.stringify({
        health_report_v2_enabled: true,
        health_report_v2_routes: ['standalone'],
        health_report_v2_rollout_percent: 0 // 0% rollout
      }));
      
      const decision = await shouldUseV2Report('standalone');
      
      // With 0% rollout, should always be false
      expect(decision.useV2).toBe(false);
      expect(decision.reason).toBe('outside_rollout_bucket');
    });
  });

  describe('Cache Behavior', () => {
    it('should cache flags and return consistent results', async () => {
      const flags1 = await getReportFlags();
      const flags2 = await getReportFlags();
      
      expect(flags1).toEqual(flags2);
    });

    it('should clear cache when requested', () => {
      expect(() => clearFlagsCache()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should fall back to defaults on any error', async () => {
      // Simulate error by setting invalid JSON
      localStorageMock.setItem('report_flags_override', 'invalid-json');
      
      const flags = await getReportFlags();
      
      expect(flags.health_report_v2_enabled).toBe(false);
      expect(flags.health_report_v2_routes).toEqual(['standalone']);
      expect(flags.health_report_v2_rollout_percent).toBe(0);
    });
  });
});