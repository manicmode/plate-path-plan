import { useEffect, useRef, useState } from 'react';
import { FF } from '@/featureFlags';
import ZoomChip from '@/components/scanner/ZoomChip';
import { useSnapAndDecode } from '@/lib/barcode/useSnapAndDecode';

type Props = { isOpen:boolean; autoOn:boolean; onCapture:(d:{code:string})=>void };
type Detection = { ok:boolean; confidence:number; center:{x:number;y:number}; code?:string };

export default function BarcodeViewport({ isOpen, autoOn, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number|null>(null);
  const streamRef = useRef<MediaStream|null>(null);
  const trackRef  = useRef<MediaStreamTrack|null>(null);
  const [zoom, setZoom] = useState(1.3);
  const cssZoomFallbackRef = useRef(false);

  const capturingRef = useRef(false);
  const lastCapture  = useRef(0);
  const prevCenterRef = useRef<{x:number;y:number}|null>(null);
  const stableSinceRef = useRef<number|null>(null);

  const { snapAndDecode } = useSnapAndDecode();

  useEffect(() => {
    if (!isOpen || typeof navigator === 'undefined') return;
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode:{ ideal:'environment' }, width:{ ideal:1920 }, height:{ ideal:1080 }, aspectRatio:16/9 },
          audio: false
        });
        if (cancelled) { stream.getTracks().forEach(t=>t.stop()); return; }
        streamRef.current = stream;

        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play().catch(()=>{});

        const track = stream.getVideoTracks()[0];
        trackRef.current = track;

        // try real zoom; else CSS scale
        const caps:any = track.getCapabilities?.() ?? {};
        if (caps.zoom) {
          const z = Math.min(2.0, caps.zoom.max ?? 2.0);
          await track.applyConstraints({ advanced:[{ zoom: z } as any] }).catch(()=>{});
          setZoom(z);
        } else {
          cssZoomFallbackRef.current = true;
          setZoom(1.3);
        }

        const loop = () => {
          if (cancelled) return;
          rafRef.current = requestAnimationFrame(loop);
          const det = detectFromVideo(video);
          handleDetection(det);
        };
        loop();
      } catch (e) {
        console.warn('[scanner] init failed', e);
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      rafRef.current = null; streamRef.current = null; trackRef.current = null;
    };
  }, [isOpen]);

  const ROI = { left:0.1, right:0.9, top:0.18, bottom:0.82 };

  function detectFromVideo(video: HTMLVideoElement): Detection {
    if (!video.videoWidth || !video.videoHeight) {
      return { ok: false, confidence: 0, center: { x: 0.5, y: 0.5 } };
    }

    // Basic detection stub - replace with actual detection logic
    return { ok:false, confidence:0, center:{x:.5,y:.5} };
  }

  async function decodeFrame(video: HTMLVideoElement){ 
    if (!video.videoWidth || !video.videoHeight) {
      throw new Error('Video not ready');
    }

    const result = await snapAndDecode({
      videoEl: video,
      budgetMs: 900,
      roi: { wPct: 0.7, hPct: 0.35 },
      logPrefix: '[MANUAL]'
    });
    
    if (result.ok) {
      return { code: result.raw };
    }
    
    throw new Error('No barcode detected');
  }

  function handleDetection(d: Detection) {
    const now = performance.now();
    const cooldownOk = now - lastCapture.current > 1500;

    // movement in % of frame
    const prev = prevCenterRef.current;
    let movePct = 100;
    if (prev && d.center) {
      const dx = Math.abs(d.center.x - prev.x);
      const dy = Math.abs(d.center.y - prev.y);
      movePct = Math.max(dx, dy) * 100;
    }
    prevCenterRef.current = d.center ?? null;

    const stable     = movePct < 2;
    const confident  = d.ok && d.confidence >= 0.8;

    if (!(stable && confident)) { stableSinceRef.current = null; return; }
    if (!stableSinceRef.current) stableSinceRef.current = now;

    const dwell = now - stableSinceRef.current;
    if (autoOn && dwell > 700 && cooldownOk) triggerCapture(d);
  }

  async function triggerCapture(d?:Detection) {
    if (capturingRef.current) return;
    const now = performance.now();
    if (now - lastCapture.current < 1500) return;
    capturingRef.current = true; lastCapture.current = now;

    try {
      pulseCorners();
      const decoded = d?.code ? { code: d.code } : await decodeFrame(videoRef.current!);
      onCapture(decoded);
    } catch (e) {
      console.warn('[scanner] capture error', e);
    } finally {
      setTimeout(()=>{ capturingRef.current = false; }, 300);
    }
  }

  async function toggleZoom() {
    const track = trackRef.current;
    if (!track) return;
    try {
      // @ts-ignore
      const caps:any = track.getCapabilities?.() ?? {};
      if (caps.zoom) {
        const max = caps.zoom.max ?? 2.0;
        const next = zoom < max * 0.6 ? Math.min(2.0, max) : 1.0;
        await track.applyConstraints({ advanced:[{ zoom: next } as any] }).catch(()=>{});
        setZoom(next);
      } else {
        setZoom(prev => prev < 1.6 ? 2.0 : 1.3);
      }
    } catch {}
  }

  // Expose manual capture to parent
  useEffect(() => {
    // @ts-ignore
    window._barcodeViewportForceCapture = () => triggerCapture();
    return () => {
      // @ts-ignore
      delete window._barcodeViewportForceCapture;
    };
  }, []);

  function pulseCorners(){ 
    const el = document.getElementById('barcode-corners'); 
    if(!el) return; 
    el.style.animation = 'pulseCorners .18s ease-out'; 
    setTimeout(()=>{ el.style.animation = ''; }, 200); 
  }

  return (
    <div className="relative w-[min(86vw,360px)] aspect-[4/5] rounded-3xl overflow-hidden">
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover ${cssZoomFallbackRef.current ? `scale-[${zoom}]` : ''}`}
        playsInline
      />
      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0"
           style={{ background:
             'radial-gradient(ellipse at 50% 42%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.08) 35%, rgba(0,0,0,0.18) 58%, rgba(0,0,0,0.36) 72%, rgba(0,0,0,0.58) 86%, rgba(0,0,0,0.72) 100%)' }} />
      {/* Corners */}
      <div id="barcode-corners" className="absolute inset-10">
        <div className="absolute left-0 top-0 h-5 w-5 border-t-2 border-l-2 border-cyan-400/80 rounded-tl-md" />
        <div className="absolute right-0 top-0 h-5 w-5 border-t-2 border-r-2 border-cyan-400/80 rounded-tr-md" />
        <div className="absolute left-0 bottom-0 h-5 w-5 border-b-2 border-l-2 border-cyan-400/80 rounded-bl-md" />
        <div className="absolute right-0 bottom-0 h-5 w-5 border-b-2 border-r-2 border-cyan-400/80 rounded-br-md" />
      </div>
      {/* Scan line */}
      <div className="absolute left-12 right-12 top-1/2 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent animate-[scan_2.4s_ease-in-out_infinite]" />
      {/* Hint */}
      <div aria-live="polite" className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-4 h-5 flex items-center justify-center text-[12px] text-white/80">
        <span className="animate-[fade_2.2s_ease-in-out_infinite]">
          {autoOn ? 'Align the code — we\'ll capture automatically. You can also tap Scan.' : 'Align the code — then tap Scan.'}
        </span>
      </div>
      {/* Zoom chip */}
      <ZoomChip value={zoom} onToggle={toggleZoom} className="absolute right-2 top-2" />
    </div>
  );
}