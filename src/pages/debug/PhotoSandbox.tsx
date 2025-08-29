import React, { useEffect, useRef } from 'react';

export default function PhotoSandbox() {
  useEffect(() => {
    console.log('[ROUTE]', window.location.pathname);
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <div style={{ background: '#ffe08a', color: '#000', padding: 10, marginBottom: 12 }}>
        <strong>DEV ONLY — Photo Pipeline Sandbox</strong>
      </div>

      <p>If you can read this, the route is mounted. Below should be camera preview and buttons.</p>

      <video id="ps-video" autoPlay playsInline muted style={{ width: 320, height: 240, background: '#000' }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button id="ps-capture">Capture & Analyze</button>
        <button id="ps-ping">Ping</button>
        <button id="ps-offline">Offline Test</button>
      </div>
      <div id="ps-log" style={{ marginTop: 12, fontFamily: 'monospace', fontSize: 12 }} />

      {/* Minimal bootstrap JS so even if hooks fail, page still shows */}
      <script dangerouslySetInnerHTML={{
        __html: `
          (function(){
            const logEl = document.getElementById('ps-log');
            const log = (msg) => { const d=document.createElement('div'); d.textContent = msg; logEl.appendChild(d); };
            log('[SANDBOX] mounted');
            const vid = document.getElementById('ps-video');
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
              .then(s => { vid.srcObject = s; log('[SANDBOX] camera ready'); })
              .catch(e => log('[SANDBOX][ERR] getUserMedia ' + e));
          })();
        `
      }} />
    </div>
  );
}