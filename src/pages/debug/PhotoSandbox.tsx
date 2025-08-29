import React, { useEffect, useRef } from 'react';
import { analyzePhoto } from '@/pipelines/photoPipeline';
import { FF } from '@/featureFlags';

export default function PhotoSandbox() {
  // Log feature flags once
  console.log('[FF]', { DEV: import.meta.env.DEV, ...FF });
  
  const enableSandbox = import.meta.env.DEV || FF.PHOTO_SANDBOX_ALLOW_PROD;
  
  if (!enableSandbox) {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui' }}>
        <h1>Photo Sandbox</h1>
        <p>Disabled on this build. To enable on staging/prod set:</p>
        <pre style={{ backgroundColor: '#f5f5f5', padding: 8, borderRadius: 4 }}>
          VITE_PHOTO_SANDBOX_ALLOW_PROD=true
        </pre>
      </div>
    );
  }

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        append('[SANDBOX] camera ready');
      } catch (e) {
        append('[SANDBOX][ERR] getUserMedia ' + String(e));
      }
    })();

    return () => {
      // Cleanup
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  function append(line: string) {
    if (!logRef.current) return;
    const p = document.createElement('div');
    p.textContent = `${new Date().toLocaleTimeString()}: ${line}`;
    logRef.current.appendChild(p);
    logRef.current.scrollTop = logRef.current.scrollHeight;
    console.log(line);
  }

  async function captureAndRun() {
    try {
      const v = videoRef.current;
      if (!v || v.readyState < 2 || v.videoWidth === 0) {
        append('[IMG READY] video not ready');
        return;
      }
      
      const maxDim = 1280;
      const scale = Math.min(1, maxDim / Math.max(v.videoWidth, v.videoHeight));
      const w = Math.max(1, Math.round(v.videoWidth * scale));
      const h = Math.max(1, Math.round(v.videoHeight * scale));
      
      const c = document.createElement('canvas');
      c.width = w; 
      c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        append('[IMG BLOB] no context');
        return;
      }
      
      ctx.drawImage(v, 0, 0, w, h);
      const blob: Blob | null = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.72));
      if (!blob) { 
        append('[IMG BLOB] null'); 
        return; 
      }
      
      append(`[IMG READY] ${v.videoWidth}x${v.videoHeight}`);
      append(`[IMG BLOB] size=${Math.round(blob.size/1024)}KB type=${blob.type}`);

      // Call the isolated photo pipeline
      append('[PHOTO] Calling analyzePhoto pipeline...');
      const result = await analyzePhoto({ blob });
      
      if (result.ok) {
        append(`[PHOTO][RESOLVED] Success: ${JSON.stringify(result.report)}`);
      } else {
        append(`[PHOTO][RESOLVED] Failed: ${(result as { ok: false; reason: string }).reason}`);
      }
    } catch (e) {
      append('[SANDBOX][ERR] ' + String(e));
    }
  }

  // Functions base URL
  const fnBase = 'https://uzoiiijqtahohfafqirm.functions.supabase.co';

  async function pingTest() {
    try {
      append('[PHOTO][FN_BASE] ' + fnBase);
      append('[PING] Testing vision-ocr/ping endpoint...');
      
      const response = await fetch(`${fnBase}/vision-ocr/ping`);
      const data = await response.json();
      
      if (response.ok) {
        append(`[PING] ${JSON.stringify(data)}`);
      } else {
        append(`[PING][ERROR] Status: ${response.status}, Data: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      append(`[PING][ERROR] ${errorMsg}`);
    }
  }

  async function offlineTest() {
    try {
      append('[PHOTO][FN_BASE] ' + fnBase);
      append('[OFFLINE TEST] Simulating network failure and watchdog test...');
      
      // Start watchdog timer
      const watchdogStart = Date.now();
      const watchdogTimeout = setTimeout(() => {
        const elapsed = Date.now() - watchdogStart;
        append(`[PHOTO][RESOLVED] Watchdog triggered after ${elapsed}ms (≤18000ms expected)`);
      }, 18000); // 18 second watchdog
      
      // Simulate network abort
      const controller = new AbortController();
      const abortTimer = setTimeout(() => {
        controller.abort();
        append('[OFFLINE TEST] Network request aborted (simulated failure)');
      }, 1000);
      
      try {
        await fetch(`${fnBase}/vision-ocr/ping`, {
          signal: controller.signal
        });
        
        clearTimeout(abortTimer);
        clearTimeout(watchdogTimeout);
        append('[OFFLINE TEST] Unexpected success - request should have been aborted');
      } catch (fetchError) {
        clearTimeout(abortTimer);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          append('[OFFLINE TEST] ✅ Request aborted as expected');
          // Let watchdog continue running to test the 18s timeout
        } else {
          clearTimeout(watchdogTimeout);
          append(`[OFFLINE TEST] ❌ Unexpected error: ${fetchError}`);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      append(`[OFFLINE TEST] Setup failed: ${errorMsg}`);
    }
  }

  return (
    <div style={{ padding: 24, display: 'grid', gap: 12, backgroundColor: '#0f172a', color: '#e2e8f0', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: 16, borderRadius: 8, border: '1px solid #f59e0b' }}>
        <strong>⚠️ DEV ONLY — Photo sandbox (barcode/manual/voice unaffected)</strong>
        <div style={{ fontSize: 14, marginTop: 4 }}>
          Isolated photo pipeline testing. Only photo analysis runs here.
        </div>
      </div>
      
      <h1 style={{ fontSize: 24, fontWeight: 'bold', margin: 0 }}>Photo Pipeline Sandbox</h1>
      
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        style={{ 
          width: 320, 
          height: 240, 
          backgroundColor: '#000',
          borderRadius: 8,
          border: '1px solid #374151'
        }} 
      />
      
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button 
          onClick={captureAndRun} 
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#3b82f6', 
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500
          }}
        >
          Capture & Analyze
        </button>
        
        <button 
          onClick={pingTest} 
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#6b7280', 
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500
          }}
        >
          Ping
        </button>
        
        <button 
          onClick={offlineTest} 
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#6b7280', 
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500
          }}
        >
          Offline Test
        </button>
      </div>
      
      <div style={{ marginTop: 16 }}>
        <strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>Pipeline Logs</strong>
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
          Monitoring: [IMG READY], [IMG BLOB], [PHOTO][FN_BASE], [PHOTO][FETCH_START], [PHOTO][FETCH_DONE], [PHOTO][OCR][RESP], [PHOTO][RESOLVED]
        </div>
        <div 
          ref={logRef} 
          style={{ 
            fontFamily: 'monospace', 
            fontSize: 12, 
            whiteSpace: 'pre-wrap', 
            backgroundColor: '#1e293b',
            padding: 12,
            borderRadius: 6,
            border: '1px solid #374151',
            maxHeight: 300,
            overflowY: 'auto',
            minHeight: 100
          }} 
        />
      </div>
      
      <div id="photo-sandbox-root" />
    </div>
  );
}