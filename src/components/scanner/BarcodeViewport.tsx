import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FF } from '@/featureFlags';
import { useSnapAndDecode } from '@/lib/barcode/useSnapAndDecode';
import { SFX } from '@/lib/sfx/sfxManager';

// Runtime override helper
function isAutoEnabledAtRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const qs = new URLSearchParams(window.location.search);
    if (qs.get('auto') === '1') return true;                          // URL override: ?auto=1
    if (localStorage.getItem('scanner:auto-override') === 'on') return true; // local override
  } catch {}
  return false;
}

// ---- AUTO CONFIG ----
const AUTO_CFG = {
  fps: 6,          // decode loop rate
  window: 4,       // sliding window size
  minMatches: 3,   // same code must appear >= 3 times in the window
  dwellMs: 700,    // time from first match to trigger
  cooldownMs: 1500 // min time between captures
};

type Sample = { t: number; code: string; cx: number; cy: number };

type Detection = { 
  ok: boolean; 
  confidence: number; 
  center: { x: number; y: number }; 
  code?: string 
};

interface BarcodeViewportProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  trackRef: React.RefObject<MediaStreamTrack | null>;
  onCapture: (decoded: { code: string }) => void;
  currentZoom: number;
  useCSSZoom: boolean;
  onZoomToggle: () => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerEnd: () => void;
  onVideoClick: () => void;
  mode?: 'auto' | 'tap'; // Add mode prop
  className?: string;
  forceDisableAutoRef?: React.MutableRefObject<() => void>; // Add ref to disable auto capture
}

export default function BarcodeViewport({
  videoRef,
  trackRef,
  onCapture,
  currentZoom,
  useCSSZoom,
  onZoomToggle,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
  onVideoClick,
  mode = 'tap', // Add mode prop with default
  className = "",
  forceDisableAutoRef // Add ref to disable auto capture
}: BarcodeViewportProps) {
  // First-gesture unlock state
  const [hasGesture, setHasGesture] = useState(false);
  const rafRef = useRef<number | null>(null);
  const capturingRef = useRef(false);
  const lastCaptureRef = useRef(0);
  const [autoOn, setAutoOn] = useState(() => {
    const allowAuto = FF.FEATURE_AUTO_CAPTURE || isAutoEnabledAtRuntime();
    if (!allowAuto) return false;
    return localStorage.getItem('scanner:auto') !== 'off';
  });
  
  // Auto-capture sliding window refs
  const samplesRef = useRef<Sample[]>([]);
  const autoIvRef = useRef<number | ReturnType<typeof setInterval> | null>(null);
  
  const [hintText, setHintText] = useState(() => {
    return mode === 'auto' 
      ? "Align the code for Auto detection"
      : "Align the code — then tap Scan.";
  });
  const [isCapturing, setIsCapturing] = useState(false);

  const { snapAndDecode } = useSnapAndDecode();
  const sfx = SFX();
  
  // Update hint text when mode changes
  useEffect(() => {
    setHintText(mode === 'auto' 
      ? "Align the code for Auto detection"
      : "Align the code — then tap Scan.");
  }, [mode]);
  
  const ROI = { 
    left: 0.1, right: 0.9, top: 0.18, bottom: 0.82,
    wPct: 0.7, hPct: 0.35
  };

  const prevCenterRef = useRef<{ x: number; y: number } | null>(null);
  const stableSinceRef = useRef<number | null>(null);
  const slowHintTimerRef = useRef<number | null>(null);

  // Window analysis functions
  const pushSample = useCallback((s: Sample) => {
    const arr = samplesRef.current;
    arr.push(s);
    while (arr.length > AUTO_CFG.window) arr.shift();
  }, []);

  const windowStats = useCallback(() => {
    const arr = samplesRef.current;
    const byCode = new Map<string, number>();
    arr.forEach(s => byCode.set(s.code, (byCode.get(s.code) ?? 0) + 1));
    let best = ''; 
    let bestCount = 0;
    byCode.forEach((cnt, code) => { if (cnt > bestCount) { bestCount = cnt; best = code; } });
    const firstT = arr[0]?.t ?? performance.now();
    const dwellMs = (arr[arr.length - 1]?.t ?? performance.now()) - firstT;
    return { best, bestCount, dwellMs };
  }, []);

    const setAuto = useCallback((v: boolean) => { 
      setAutoOn(v); 
      localStorage.setItem('scanner:auto', v ? 'on' : 'off'); 
      
      // Update hint text immediately
      if (v) {
        setHintText(mode === 'auto' ? "Align the code for Auto detection" : "Align the code — we'll capture automatically. You can also tap Scan.");
      } else {
        setHintText("Align the code — then tap Scan.");
      }
    }, []);

  // Detect from video frame
  const detectFromVideo = useCallback(async (video: HTMLVideoElement): Promise<Detection> => {
    if (!video.videoWidth || !video.videoHeight) {
      return { ok: false, confidence: 0, center: { x: 0.5, y: 0.5 } };
    }

    try {
      const result = await snapAndDecode({
        videoEl: video,
        budgetMs: 180,
        roi: ROI,
        logPrefix: '[AUTO]'
      });
      
      if (result.ok && /^\d{8,14}$/.test(result.raw)) {
        return {
          ok: true,
          confidence: 0.85, // Assume high confidence for valid barcode
          center: { x: 0.5, y: 0.5 }, // Center for now
          code: result.raw
        };
      }
    } catch (error) {
      // Silent fail for detection
    }
    
    return { ok: false, confidence: 0, center: { x: 0.5, y: 0.5 } };
  }, [snapAndDecode, ROI]);

  // Decode full frame for manual capture
  const decodeFrame = useCallback(async (video: HTMLVideoElement) => {
    if (!video.videoWidth || !video.videoHeight) {
      throw new Error('Video not ready');
    }

    const result = await snapAndDecode({
      videoEl: video,
      budgetMs: 900,
      roi: ROI,
      logPrefix: '[MANUAL]'
    });
    
    if (result.ok) {
      return { code: result.raw };
    }
    
    throw new Error('No barcode detected');
  }, [snapAndDecode, ROI]);

  // Handle detection with stability checking
  const handleDetection = useCallback((d: Detection) => {
    const now = performance.now();
    const cooldownOk = now - lastCaptureRef.current > 1500;

    // Compute movement in % of frame
    const prev = prevCenterRef.current;
    let movePct = 100;
    if (prev && d.center) {
      const dx = Math.abs(d.center.x - prev.x);
      const dy = Math.abs(d.center.y - prev.y);
      movePct = Math.max(dx, dy) * 100;
    }
    prevCenterRef.current = d.center ?? null;

    const stable = movePct < 2; // <2% of frame
    const confident = d.ok && d.confidence >= 0.8;

    if (!(stable && confident)) {
      stableSinceRef.current = null;
      return;
    }

    if (!stableSinceRef.current) {
      stableSinceRef.current = now;
      setHintText('Code found — capturing…');
    }

    const dwell = now - stableSinceRef.current;
    if (autoOn && dwell > 700 && cooldownOk) {
      triggerCapture(d);
    }
  }, [autoOn]);

  // Safe capture with cooldown protection
  const safeCapture = useCallback(async (pref?: { code?: string }) => {
    const now = performance.now();
    if (capturingRef.current || now - lastCaptureRef.current < AUTO_CFG.cooldownMs) return;
    
    capturingRef.current = true;
    setIsCapturing(true);
    lastCaptureRef.current = now;
    
    try {
      // Pulse corners green
      pulseCorners();
      
      // Light haptic if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
      setHintText('Code found — capturing…');
      
      const decoded = pref?.code 
        ? { code: pref.code }
        : await decodeFrame(videoRef.current!);
      
      // PLAY SOUND (works for both manual & auto) with fallback
      const ok = await sfx.play('scan_success');
      if (!ok) {
        const { FEATURE_SFX_DEBUG } = await import('@/lib/sound/debug');
        const { Sound } = await import('@/lib/sound/soundManager');
        await Sound.ensureUnlocked();
        Sound.play('beep');
        if (FEATURE_SFX_DEBUG) {
          console.log('[SFX][FALLBACK][BEEP]', { key: 'scan_success' });
        }
      }
      onCapture(decoded);
    } catch (error) {
      console.warn('Capture failed:', error);
      setHintText(mode === 'auto' ? 'Hold steady.' : 'Align the code — then tap Scan.');
    } finally {
      setTimeout(() => { 
        capturingRef.current = false;
        setIsCapturing(false);
        
        // Reset hint text
        if (mode === 'auto') {
          setHintText("Align the code for Auto detection");
        } else {
          setHintText("Align the code — then tap Scan.");
        }
      }, 300);
    }
  }, [onCapture, decodeFrame, autoOn, videoRef]);

  // Trigger capture with visual feedback (legacy method for manual button)
  const triggerCapture = useCallback(async (d?: Detection) => {
    await safeCapture(d?.code ? { code: d.code } : undefined);
  }, [safeCapture]);

  // Auto trigger decision
  const maybeAutoTrigger = useCallback(() => {
    const { best, bestCount, dwellMs } = windowStats();
    if (!best) return;
    if (bestCount < AUTO_CFG.minMatches) return;
    if (dwellMs < AUTO_CFG.dwellMs) return;

    const now = performance.now();
    if (now - lastCaptureRef.current < AUTO_CFG.cooldownMs) return;

    // Same code seen in window for long enough -> capture
    safeCapture({ code: best });
  }, [windowStats, safeCapture]);

  // Diagnostics helper (console only)
  const diag = {
    log: (...a: any[]) => { if (process.env.NODE_ENV !== 'production') console.log(...a); },
    warn: (...a: any[]) => { if (process.env.NODE_ENV !== 'production') console.warn(...a); },
    tick(code: string, best: string, bestCount: number, dwellMs: number) {
      if (process.env.NODE_ENV !== 'production') console.debug('[scan][tick]', { code, best, bestCount, dwellMs: Math.round(dwellMs) });
    },
    dump(video?: HTMLVideoElement | null, track?: MediaStreamTrack | null) {
      const caps = (track as any)?.getCapabilities?.() ?? {};
      const settings = (track as any)?.getSettings?.() ?? {};
      const info = { 
        featureAutoCapture: FF.FEATURE_AUTO_CAPTURE, 
        runtimeOverride: isAutoEnabledAtRuntime(),
        videoReady: !!video,
        dims: video ? { w: video.videoWidth, h: video.videoHeight, readyState: video.readyState } : null,
        caps, settings, ts: new Date().toISOString() 
      };
      console.table(info); 
      return info;
    }
  };

  // Expose diagnostics helper
  useEffect(() => {
    (window as any).scannerDiag = () => {
      const v = videoRef.current;
      const track = trackRef.current;
      return diag.dump(v, track);
    };
    return () => { try { delete (window as any).scannerDiag; } catch {} };
  }, []);

  // Auto-capture decoder loop (using interval instead of RAF for consistent timing)
  useEffect(() => {
    // Gate: modal must be open; runtime override or flag must be true; AND mode must be auto
    const allowAuto = FF.FEATURE_AUTO_CAPTURE || isAutoEnabledAtRuntime();
    if (!allowAuto || !autoOn || mode !== 'auto') return;
    if (!videoRef.current) return;

    samplesRef.current = [];
    if (autoIvRef.current) clearInterval(autoIvRef.current as any);

    const period = Math.max(1000 / AUTO_CFG.fps, 120);
    diag.log('[scan] auto loop start', { period });

    autoIvRef.current = setInterval(async () => {
      try {
        const v = videoRef.current!;
        if (!v.videoWidth) return;                    // wait until video is ready
        if (capturingRef.current) return;             // don't decode during capture

        const res = await decodeFrame(v);             // EXISTING decoder path
        if (!res || res === null) {
          // nothing decoded this pass; continue loop without touching res.ok
          return;
        }
        // only after null-guard:
        if (res?.code) {
          pushSample({ t: performance.now(), code: res.code, cx: 0.5, cy: 0.5 }); // center fallback
          const { best, bestCount, dwellMs } = windowStats();
          diag.tick(res.code, best, bestCount, dwellMs);
          if (best && bestCount >= AUTO_CFG.minMatches && dwellMs >= AUTO_CFG.dwellMs) {
            await safeCapture({ code: best });
            samplesRef.current = [];                  // reset after fire
          }
        }
      } catch (e) {
        diag.warn('[scan][err] autoLoop', e);
      }
    }, period) as any;

    return () => {
      if (autoIvRef.current) clearInterval(autoIvRef.current as any);
      autoIvRef.current = null;
      diag.log('[scan] auto loop stop');
    };
  }, [autoOn, mode, videoRef, decodeFrame, pushSample, windowStats, safeCapture]);

  // Slow hint timer
  useEffect(() => {
    if (slowHintTimerRef.current) {
      clearTimeout(slowHintTimerRef.current);
    }

    slowHintTimerRef.current = window.setTimeout(() => {
      if (!isCapturing) {
        setHintText('Hold steady or tap Scan.');
        
        // Reset after 3 seconds
        setTimeout(() => {
          if (mode === 'auto') {
            setHintText("Align the code for Auto detection");
          } else {
            setHintText("Align the code — then tap Scan.");
          }
        }, 3000);
      }
    }, 2000);

    return () => {
      if (slowHintTimerRef.current) {
        clearTimeout(slowHintTimerRef.current);
      }
    };
  }, [autoOn, isCapturing]);

  // Force capture method for manual button
  const forceCapture = useCallback(() => {
    if (!capturingRef.current) {
      triggerCapture();
    }
  }, [triggerCapture]);

  // Expose force disable auto function via ref
  useEffect(() => {
    if (forceDisableAutoRef) {
      forceDisableAutoRef.current = () => {
        console.log('[SCANNER][VIEWPORT] Force disabling auto capture');
        setAutoOn(false);
        // Also clear the interval immediately
        if (autoIvRef.current) {
          clearInterval(autoIvRef.current as any);
          autoIvRef.current = null;
        }
      };
    }
    return () => {
      if (forceDisableAutoRef) {
        forceDisableAutoRef.current = () => {};
      }
    };
  }, [forceDisableAutoRef]);

  // Expose to global for manual trigger
  useEffect(() => {
    (window as any)._barcodeViewportForceCapture = forceCapture;
    return () => {
      delete (window as any)._barcodeViewportForceCapture;
    };
  }, [forceCapture]);

  const pulseCorners = () => {
    const el = document.getElementById('barcode-corners');
    if (!el) return;
    el.style.animation = 'pulseCorners 0.18s ease-out';
    setTimeout(() => {
      el.style.animation = '';
    }, 200);
  };

  return (
    <div className={`relative w-[min(86vw,360px)] aspect-[4/5] rounded-3xl overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover ${
          useCSSZoom ? `scale-[${currentZoom.toFixed(1)}]` : ''
        }`}
        style={{ transformOrigin: 'center center' }}
        onPointerDown={async (e) => {
          // First gesture unlock for SFX
          if (!hasGesture) {
            setHasGesture(true);
            try {
              await SFX().unlock();
              const { FEATURE_SFX_DEBUG } = await import('@/lib/sound/debug');
              if (FEATURE_SFX_DEBUG) {
                console.log('[SFX][UNLOCK@VIEWPORT]', { ok: true });
              }
            } catch (error) {
              const { FEATURE_SFX_DEBUG } = await import('@/lib/sound/debug');
              if (FEATURE_SFX_DEBUG) {
                console.log('[SFX][UNLOCK@VIEWPORT]', { ok: false, error });
              }
            }
          }
          onPointerDown(e);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onPointerLeave={onPointerEnd}
        onClick={onVideoClick}
      />
      
      {/* Vignette */}
      <div 
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 42%, ' +
            'rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.08) 35%, ' +
            'rgba(0,0,0,0.18) 58%, rgba(0,0,0,0.36) 72%, ' +
            'rgba(0,0,0,0.58) 86%, rgba(0,0,0,0.72) 100%)'
        }} 
      />
      
      {/* Corners */}
      <div id="barcode-corners" className="absolute inset-10">
        <div className="absolute left-0 top-0 h-5 w-5 border-t-2 border-l-2 border-cyan-400/80 rounded-tl-md" />
        <div className="absolute right-0 top-0 h-5 w-5 border-t-2 border-r-2 border-cyan-400/80 rounded-tr-md" />
        <div className="absolute left-0 bottom-0 h-5 w-5 border-b-2 border-l-2 border-cyan-400/80 rounded-bl-md" />
        <div className="absolute right-0 bottom-0 h-5 w-5 border-b-2 border-r-2 border-cyan-400/80 rounded-br-md" />
      </div>
      
      {/* Scan line - only show in auto mode */}
      {mode === 'auto' && (
        <div className="absolute left-12 right-12 top-1/2 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent animate-[scan_2.4s_ease-in-out_infinite]" />
      )}
      
      {/* Hint (fixed height, no layout shift) */}
      <div 
        aria-live="polite" 
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-4 h-5 flex items-center justify-center text-[12px] text-white/80 text-center px-2"
      >
        <span className="animate-[fade_2.2s_ease-in-out_infinite]">
          {hintText}
        </span>
      </div>
      
      {/* Zoom chip */}
      <button
        onClick={onZoomToggle}
        className="absolute right-2 top-2 rounded-full px-2.5 py-1 text-xs bg-black/50 text-white border border-white/10"
      >
        {currentZoom <= 1.05 ? '1×' : `${currentZoom.toFixed(1)}×`}
      </button>
    </div>
  );
}

// Auto toggle chip component
export function AutoToggleChip({ className = '' }: { className?: string }) {
  const [on, setOn] = useState(() => {
    const allowAuto = FF.FEATURE_AUTO_CAPTURE || isAutoEnabledAtRuntime();
    if (!allowAuto) return false;
    return localStorage.getItem('scanner:auto') !== 'off';
  });
  
  const handleToggle = () => {
    const newValue = !on;
    setOn(newValue);
    localStorage.setItem('scanner:auto', newValue ? 'on' : 'off');
  };
  
  return (
    <button
      onClick={handleToggle}
      className={`px-2 py-1 rounded-full text-[11px] border transition-colors ${
        on 
          ? 'bg-teal-500/15 text-teal-300 border-teal-300/25' 
          : 'bg-white/10 text-white/80 border-white/15'
      } ${className}`}
    >
      {on ? 'Auto' : 'Tap to scan'}
    </button>
  );
}