import React, { useEffect, useRef, useState } from 'react';
import { analyzePhoto } from '@/pipelines/photoPipeline';

export default function PhotoSandbox() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const logRef   = useRef<HTMLDivElement | null>(null);
  const [streamReady, setStreamReady] = useState(false);
  const [offline, setOffline] = useState(false);

  // helper
  const append = (msg: string, obj?: any) => {
    const line = obj ? `${msg} ${JSON.stringify(obj)}` : msg;
    console.log(line);
    if (logRef.current) {
      const d = document.createElement('div');
      d.textContent = line;
      logRef.current.appendChild(d);
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  };

  // start camera on mount
  useEffect(() => {
    console.log('[ROUTE]', window.location.pathname);
    append('[SANDBOX] mounted');

    let stopped = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
        if (stopped) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // On some browsers you still need an explicit play()
          await videoRef.current.play().catch(() => {});
          append('[SANDBOX] camera ready');
          setStreamReady(true);
        }
      } catch (e) {
        append('[SANDBOX][ERR] getUserMedia', String(e));
      }
    })();

    return () => {
      stopped = true;
      const v = videoRef.current as HTMLVideoElement | null;
      const s = (v?.srcObject as MediaStream | null);
      s?.getTracks().forEach(t => t.stop());
      if (v) v.srcObject = null;
    };
  }, []);

  async function captureAndAnalyze() {
    try {
      const v = videoRef.current!;
      if (!v || v.readyState < 2 || v.videoWidth === 0) {
        append('[IMG READY] video not ready');
        return;
      }
      const maxDim = 1280;
      const scale = Math.min(1, maxDim / Math.max(v.videoWidth, v.videoHeight));
      const w = Math.max(1, Math.round(v.videoWidth * scale));
      const h = Math.max(1, Math.round(v.videoHeight * scale));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(v, 0, 0, w, h);
      const blob: Blob | null = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.72));
      if (!blob) { append('[IMG BLOB] null'); return; }

      append('[IMG READY]', { w: v.videoWidth, h: v.videoHeight });
      append('[IMG BLOB]', { sizeKB: Math.round(blob.size/1024), type: blob.type });

      // optional: show the base we're calling
      const fnBase = import.meta.env.VITE_FUNCTIONS_BASE ?? '/functions/v1';
      append('[PHOTO][FN_BASE]', { fnBase });

      if (offline) {
        append('[PHOTO][OFFLINE] simulating timeout/failure');
      }

      const res = await analyzePhoto({ blob });
      append('[PHOTO][RESOLVED]', { 
        ok: res.ok, 
        reason: res.ok ? 'success' : (res as { ok: false; reason: string }).reason 
      });
    } catch (e) {
      append('[SANDBOX][ERR] captureAndAnalyze', String(e));
    }
  }

  async function ping() {
    try {
      const base = import.meta.env.VITE_FUNCTIONS_BASE ?? '/functions/v1';
      const url = `${base}/vision-ocr/ping`;
      append('[PING][START]', { url });
      const r = await fetch(url);
      const j = await r.json();
      append('[PING]', j);
    } catch (e) {
      append('[PING][ERROR]', String(e));
    }
  }

  function toggleOfflineTest() {
    setOffline(v => !v);
    append('[OFFLINE_TEST]', { enabled: !offline });
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <div style={{ background: '#ffe08a', color: '#000', padding: 10, marginBottom: 12 }}>
        <strong>DEV ONLY — Photo Pipeline Sandbox</strong>
      </div>

      <p>If you can read this, the route is mounted. Below should be camera preview and buttons.</p>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: 320, height: 240, background: '#000',
          borderRadius: 8, display: 'block'
        }}
      />

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={captureAndAnalyze} disabled={!streamReady} style={{ padding: '6px 10px' }}>
          Capture & Analyze
        </button>
        <button onClick={ping} style={{ padding: '6px 10px' }}>
          Ping
        </button>
        <button onClick={toggleOfflineTest} style={{ padding: '6px 10px' }}>
          {offline ? 'Offline Test: ON' : 'Offline Test'}
        </button>
      </div>

      <div
        ref={logRef}
        style={{
          marginTop: 12, height: 180, overflow: 'auto',
          fontFamily: 'monospace', fontSize: 12, padding: 8,
          background: 'rgba(255,255,255,0.06)', borderRadius: 8
        }}
      />
    </div>
  );
}