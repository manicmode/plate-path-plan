import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Sound } from '../soundManager';

// Mock the SFX manager
const mockSFXPlay = vi.fn();
vi.mock('@/lib/sfx/sfxManager', () => ({
  SFX: () => ({
    play: mockSFXPlay
  })
}));

// Mock debug flags
vi.mock('@/lib/sound/debug', () => ({
  FEATURE_SFX_DEBUG: true,
  FORCE_WEB_AUDIO: false
}));

describe('Sound Routing Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
  });

  it('should route to WebAudio on iOS for beep', async () => {
    // Mock iOS detection
    vi.doMock('@/lib/sound/platform', () => ({
      isIOS: () => true
    }));

    const { Sound } = await import('../soundManager');
    mockSFXPlay.mockResolvedValue(true);

    await Sound.play('beep');

    expect(console.log).toHaveBeenCalledWith('[SOUND][ROUTE]', { name: 'beep', path: 'WebAudio' });
    expect(mockSFXPlay).toHaveBeenCalledWith('scan_success');
  });

  it('should route to WebAudio on iOS for shutter', async () => {
    // Mock iOS detection
    vi.doMock('@/lib/sound/platform', () => ({
      isIOS: () => true
    }));

    const { Sound } = await import('../soundManager');
    mockSFXPlay.mockResolvedValue(true);

    await Sound.play('shutter');

    expect(console.log).toHaveBeenCalledWith('[SOUND][ROUTE]', { name: 'shutter', path: 'WebAudio' });
    expect(mockSFXPlay).toHaveBeenCalledWith('shutter');
  });

  it('should route to HTMLAudio on non-iOS', async () => {
    // Mock non-iOS detection
    vi.doMock('@/lib/sound/platform', () => ({
      isIOS: () => false
    }));

    vi.doMock('@/lib/sound/debug', () => ({
      FEATURE_SFX_DEBUG: true,
      FORCE_WEB_AUDIO: false
    }));

    const { Sound } = await import('../soundManager');

    // Mock AudioContext for HTMLAudio path
    const mockAudioContext = {
      state: 'running',
      createOscillator: vi.fn(() => ({
        type: 'square',
        frequency: { value: 0 },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn()
      })),
      createGain: vi.fn(() => ({
        gain: { 
          value: 0,
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn()
        },
        connect: vi.fn()
      })),
      currentTime: 0,
      destination: {}
    };

    (global as any).AudioContext = vi.fn(() => mockAudioContext);

    await Sound.ensureUnlocked();
    await Sound.play('beep');

    expect(console.log).toHaveBeenCalledWith('[SOUND][ROUTE]', { name: 'beep', path: 'HTMLAudio' });
    expect(mockSFXPlay).not.toHaveBeenCalled();
  });

  it('should force WebAudio when FORCE_WEB_AUDIO is true', async () => {
    // Mock non-iOS but force WebAudio
    vi.doMock('@/lib/sound/platform', () => ({
      isIOS: () => false
    }));

    vi.doMock('@/lib/sound/debug', () => ({
      FEATURE_SFX_DEBUG: true,
      FORCE_WEB_AUDIO: true
    }));

    const { Sound } = await import('../soundManager');
    mockSFXPlay.mockResolvedValue(true);

    await Sound.play('beep');

    expect(console.log).toHaveBeenCalledWith('[SOUND][ROUTE]', { name: 'beep', path: 'WebAudio' });
    expect(mockSFXPlay).toHaveBeenCalledWith('scan_success');
  });
});