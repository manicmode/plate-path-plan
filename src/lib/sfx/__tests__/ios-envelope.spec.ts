import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SFX } from '../sfxManager';

// Mock platform detection
vi.mock('@/lib/sound/platform', () => ({
  isIOS: vi.fn(() => true) // Mock iOS for these tests
}));

// Mock debug flag
vi.mock('@/lib/sound/debug', () => ({
  FEATURE_SFX_DEBUG: true
}));

// Mock AudioContext
const mockOscillator = {
  type: 'triangle',
  frequency: { value: 0 },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn()
};

const mockGainNode = {
  gain: { 
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn()
  },
  connect: vi.fn()
};

const mockAudioContext = {
  state: 'running',
  currentTime: 0,
  destination: {},
  createOscillator: vi.fn(() => mockOscillator),
  createGain: vi.fn(() => mockGainNode),
  resume: vi.fn()
};

beforeEach(() => {
  vi.clearAllMocks();
  (global as any).AudioContext = vi.fn(() => mockAudioContext);
  console.log = vi.fn(); // Mock console.log to capture debug output
});

describe('iOS Envelope Tests', () => {
  it('should use iOS-optimized parameters for scan_success', async () => {
    const sfx = SFX();
    
    // Mock unlock first
    await sfx.unlock();
    
    // Play scan_success tone
    const result = await sfx.play('scan_success');
    
    expect(result).toBe(true);
    expect(mockOscillator.frequency.value).toBe(880); // IOS_FREQ
    expect(console.log).toHaveBeenCalledWith(
      '[SFX][OSC_PARAMS]',
      expect.objectContaining({
        key: 'scan_success',
        freq: 880,
        durationMs: 150, // IOS_MIN_MS
        gain: 0.5, // IOS_MIN_GAIN
        ctx: 'running'
      })
    );
  });

  it('should use iOS-optimized parameters for shutter', async () => {
    const sfx = SFX();
    await sfx.unlock();
    
    const result = await sfx.play('shutter');
    
    expect(result).toBe(true);
    expect(console.log).toHaveBeenCalledWith(
      '[SFX][OSC_PARAMS]',
      expect.objectContaining({
        key: 'shutter',
        freq: 600,
        durationMs: 180, // part * 2 = 90 * 2
        gain: 0.5, // IOS_MIN_GAIN
        ctx: 'running'
      })
    );
  });
});