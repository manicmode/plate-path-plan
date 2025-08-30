import React, { useEffect, useRef, useState } from 'react';
import { runPhotoPipeline } from '@/pipelines/photoPipeline';
import { resolveFunctionsBase } from '@/lib/net/functionsBase';
import { getSupabaseAuthHeaders, getAuthHeaders } from '@/lib/net/authHeaders';

interface PingStatus {
  status: 'loading' | 'ok' | 'fail';
  data?: any;
  lastPing?: Date;
}

export default function PhotoSandbox() {
  const videoRef = useRef<HTMLVideoElement|null>(null);
  const logRef   = useRef<HTMLDivElement|null>(null);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const [pingStatus, setPingStatus] = useState<PingStatus>({ status: 'loading' });

  const log = (msg: string, data?: any) => {
    const line = data ? `${msg} ${JSON.stringify(data)}` : msg;
    console.log(line);
    if (logRef.current) {
      const row = document.createElement('div');
      row.textContent = line;
      logRef.current.appendChild(row);
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    console.log('[ROUTE]', window.location.pathname);
    // Ensure nothing overlays our controls
    (document.getElementById('root') || document.body).style.pointerEvents = 'auto';

    (async () => {
      // Auto-ping on mount
      await ping({ withAuth: true });
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }, audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setReady(true);
          log('[SANDBOX] camera ready');
        }
      } catch (e) {
        log('[SANDBOX][ERR] getUserMedia', String(e));
      }
    })();

    // expose helpers for quick manual retries
    (window as any).ps = {
      ping, captureAndAnalyze, toggleOffline: () => setOffline(v => !v)
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function captureAndAnalyze() {
    const v = videoRef.current;
    if (!v || v.readyState < 2 || v.videoWidth === 0) { log('[IMG READY] not ready'); return; }
    const maxDim = 1280;
    const scale = Math.min(1, maxDim / Math.max(v.videoWidth, v.videoHeight));
    const w = Math.max(1, Math.round(v.videoWidth * scale));
    const h = Math.max(1, Math.round(v.videoHeight * scale));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true })!; ctx.drawImage(v, 0, 0, w, h);
    const blob: Blob|null = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.72));
    if (!blob) { log('[IMG BLOB] null'); return; }
    log('[IMG READY]', { w: v.videoWidth, h: v.videoHeight });
    log('[IMG BLOB]', { sizeKB: Math.round(blob.size/1024), type: blob.type });

    if (offline) {
      log('[PHOTO][OFFLINE] simulating timeout/failure');
    }

    try {
      const res = await runPhotoPipeline(blob, {
        onTimeout: () => log('[PHOTO][WATCHDOG] timeout'),
        onFail: (r) => log('[PHOTO][FAIL]', r),
        onSuccess: (r) => log('[PHOTO][SUCCESS]', { score: r?.health?.score ?? 0 })
      }, { force: true, offline });

      log('[PHOTO][RESOLVED]', { success: res.success, error: res.error ?? null });
    } catch (e) {
      log('[PHOTO][ERROR]', String(e));
    }
  }

  async function ping(options: { withAuth?: boolean } = { withAuth: true }) {
    try {
      console.log('[FN][BASE]', resolveFunctionsBase());
      const base = resolveFunctionsBase();
      const url = `${base}/vision-ocr/ping`;
      log('[PING][START]', { url, withAuth: options.withAuth });

      const headers = await getAuthHeaders(options.withAuth ?? true);
      console.log('[PING][HEADERS]', {
        hasAuth: !!headers?.Authorization,
        authPrefix: headers?.Authorization?.slice(0, 20),
        hasApikey: !!headers?.apikey
      });

      console.log('[FETCH][START]', { url, method: 'GET', headers: Object.keys(headers) });
      
      const r = await fetch(url, { headers: { ...headers, 'Accept': 'application/json' } });
      
      console.log('[FETCH][DONE]', { status: r.status, ok: r.ok });

      if (!r.ok) {
        const text = await r.text().catch(() => '');
        log('[PING][HTTP]', { status: r.status, ok: r.ok, text: text.slice(0, 120) });
        setPingStatus({ status: 'fail', data: { status: r.status, text } });
        return;
      }

      const ct = r.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        const txt = await r.text();
        log('[PING][ERROR]', `Non-JSON response: ${r.status} ${txt.slice(0,120)}…`);
        setPingStatus({ status: 'fail', data: { error: 'non_json' } });
        return;
      }

      const j = await r.json();
      log('[PING][RESULT]', j);
      setPingStatus({ status: j.status === 'ok' ? 'ok' : 'fail', data: j, lastPing: new Date() });
    } catch (e) { 
      log('[PING][ERROR]', String(e));
      setPingStatus({ status: 'fail', data: { error: String(e) } });
    }
  }

  async function runTestOCR() {
    try {
      const base = resolveFunctionsBase();
      const url = `${base}/vision-ocr`;
      log('[OCR][TEST][START]', { url });

      // 1x1 PNG transparent pixel
      const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=";
      
      // Convert to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('image', blob, 'test.png');

      const headers = await getAuthHeaders(true);
      console.log('[OCR][TEST][HEADERS]', Object.keys(headers));

      const r = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: headers
      });

      console.log('[OCR][TEST][DONE]', { status: r.status, ok: r.ok });

      const result = await r.json();
      log('[OCR][RESULT]', { status: r.status, result });

    } catch (e) {
      log('[OCR][ERROR]', String(e));
    }
  }

  const formatTime = (date: Date | undefined) => {
    if (!date) return '-';
    const diff = Date.now() - date.getTime();
    if (diff < 1000) return 'just now';
    if (diff < 60000) return `${Math.floor(diff/1000)}s ago`;
    return `${Math.floor(diff/60000)}m ago`;
  };

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', pointerEvents: 'auto', position: 'relative', zIndex: 99999 }}>
      <div style={{ background: '#ffe08a', color: '#000', padding: 10, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>DEV ONLY — Photo Pipeline Sandbox</strong>
        <span style={{ 
          background: pingStatus.status === 'ok' ? '#4ade80' : pingStatus.status === 'fail' ? '#ef4444' : '#94a3b8',
          color: 'white',
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 'bold'
        }}>
          PING: {pingStatus.status.toUpperCase()}
        </span>
      </div>

      {pingStatus.data && (
        <div style={{ marginBottom: 12, fontSize: 12, background: 'rgba(0,0,0,0.1)', padding: 8, borderRadius: 4 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '2px 8px', fontWeight: 'bold' }}>Origin:</td>
                <td style={{ padding: '2px 8px' }}>{pingStatus.data.origin || '-'}</td>
                <td style={{ padding: '2px 8px', fontWeight: 'bold' }}>HasAuth:</td>
                <td style={{ padding: '2px 8px' }}>{pingStatus.data.hasAuth ? 'true' : 'false'}</td>
              </tr>
              <tr>
                <td style={{ padding: '2px 8px', fontWeight: 'bold' }}>HasApiKey:</td>
                <td style={{ padding: '2px 8px' }}>{pingStatus.data.apikey ? 'true' : 'false'}</td>
                <td style={{ padding: '2px 8px', fontWeight: 'bold' }}>Last Ping:</td>
                <td style={{ padding: '2px 8px' }}>{formatTime(pingStatus.lastPing)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <video ref={videoRef} autoPlay playsInline muted
        style={{ width: 320, height: 240, background: '#000', borderRadius: 8, display: 'block' }} />

      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={captureAndAnalyze} disabled={!ready} style={{ padding: '8px 12px', cursor: ready ? 'pointer' : 'not-allowed' }}>
          Capture & Analyze
        </button>
        <button type="button" onClick={() => ping({ withAuth: true })} style={{ padding: '8px 12px' }}>
          Ping (Auth)
        </button>
        <button type="button" onClick={() => ping({ withAuth: false })} style={{ padding: '8px 12px' }}>
          Ping (No Auth)
        </button>
        <button type="button" onClick={runTestOCR} style={{ padding: '8px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 4 }}>
          Run Test OCR
        </button>
        <button type="button" onClick={() => { setOffline(v => !v); log('[OFFLINE_TEST]', { enabled: !offline }); }} style={{ padding: '8px 12px' }}>
          {offline ? 'Offline Test: ON' : 'Offline Test'}
        </button>
      </div>

      <div ref={logRef} style={{ marginTop: 12, height: 200, overflow: 'auto', fontFamily: 'monospace',
        fontSize: 12, padding: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 8 }} />
    </div>
  );
}