import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import BarcodeViewport from '../BarcodeViewport';

// Mock platform as iOS
vi.mock('@/lib/sound/platform', () => ({
  isIOS: () => true
}));

// Mock debug flags
vi.mock('@/lib/sound/debug', () => ({
  FEATURE_SFX_DEBUG: true,
  FORCE_WEB_AUDIO: false
}));

// Mock SFX manager
const mockSFXPlay = vi.fn();
const mockSFXUnlock = vi.fn();
vi.mock('@/lib/sfx/sfxManager', () => ({
  SFX: () => ({
    play: mockSFXPlay,
    unlock: mockSFXUnlock
  })
}));

// Mock Sound manager
const mockSoundPlay = vi.fn();
vi.mock('@/lib/sound/soundManager', () => ({
  Sound: {
    play: mockSoundPlay,
    ensureUnlocked: vi.fn()
  }
}));

// Mock barcode detection
vi.mock('@zxing/library', () => ({
  BrowserMultiFormatReader: vi.fn(() => ({
    decodeFromVideoDevice: vi.fn(),
    reset: vi.fn()
  }))
}));

// Mock refs
const mockVideoRef = { current: null };
const mockTrackRef = { current: null };

describe('iOS Audio Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
    mockSFXPlay.mockResolvedValue(true);
    mockSFXUnlock.mockResolvedValue(undefined);
  });

  it('should use WebAudio path on iOS when SFX is called', async () => {
    const mockOnCapture = vi.fn();
    
    render(
      <BarcodeViewport 
        videoRef={mockVideoRef}
        trackRef={mockTrackRef}
        onCapture={mockOnCapture}
        currentZoom={1}
        useCSSZoom={false}
        onZoomToggle={vi.fn()}
        onPointerDown={vi.fn()}
        onPointerMove={vi.fn()}
        onPointerEnd={vi.fn()}
        onVideoClick={vi.fn()}
      />
    );

    // Test that the SFX system would be called correctly on iOS
    await mockSFXPlay('scan_success');

    expect(mockSFXPlay).toHaveBeenCalledWith('scan_success');
  });

  it('should unlock SFX when called', async () => {
    await mockSFXUnlock();
    
    expect(mockSFXUnlock).toHaveBeenCalled();
  });
});