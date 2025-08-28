import React, { useEffect, useRef, useState } from 'react';

export default function DebugCamPure() {
  const videoRef = useRef<HTMLVideoElement|null>(null);
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    const log = (...a:any[]) => console.warn('[DEBUG][cam-pure]', ...a);

    const tapStream = (s: MediaStream) => {
      s.addEventListener?.('inactive', () => log('[STREAM][inactive]'));
      for (const t of s.getTracks()) {
        t.addEventListener?.('ended',  () => log('[TRACK][ended]',  { kind: t.kind }));
        t.addEventListener?.('mute',   () => log('[TRACK][mute]',   { kind: t.kind }));
        t.addEventListener?.('unmute', () => log('[TRACK][unmute]', { kind: t.kind }));
      }
    };

    (async () => {
      try {
        log('requesting GUM…');
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        stream = s;
        tapStream(s);
        const v = videoRef.current;
        if (v) {
          v.srcObject = s;
          try { await v.play(); } catch {}
        }
        log('started', { vTracks: s.getVideoTracks().length, aTracks: s.getAudioTracks().length });
      } catch (e:any) {
        setErr(e?.name ? `${e.name}: ${e.message || ''}` : String(e));
        log('ERROR starting camera', e);
      }
    })();

    return () => {
      try {
        const v = videoRef.current;
        if (v) v.srcObject = null;
        stream?.getTracks().forEach(t => t.stop());
        log('cleanup complete');
      } catch {}
    };
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1>/debug/cam-pure</h1>
      {err && <p style={{color:'tomato'}}>Error: {err}</p>}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: '100%', maxWidth: 480, background: '#111', borderRadius: 8 }}
      />
      <p style={{opacity:.6}}>Live video with audio:false. Check console for [INTCPT] and [TRACK] logs.</p>
    </div>
  );
}