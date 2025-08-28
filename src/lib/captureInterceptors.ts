// ========= PHASE 2: GLOBAL CAPTURE INTERCEPTORS =========
// This module MUST load first to intercept all capture APIs with full stack traces
// Remove this file after forensic investigation is complete

const FF = (window as any).__featureFlags || {};
console.warn('[CAPTURE-GUARD][boot]', { 
  path: location.pathname, 
  ua: navigator.userAgent,
  standalone: (navigator as any).standalone,
  timestamp: Date.now(),
  flags: FF
});

function safePatch(label: string, fn: () => void) {
  try { fn(); console.warn(`[CAPTURE-GUARD][ok] ${label}`); }
  catch (err) { console.error(`[CAPTURE-GUARD][patch-failed] ${label}`, err); }
}

// Helper function for logging with stack traces
function tag(k: string, extra?: any) { 
  console.warn(k, extra ?? ''); 
  try { 
    console.trace(k); 
  } catch {} 
}

// ========= getUserMedia INTERCEPTORS =========

if (FF.MEDIA_INTERCEPTORS_ENABLED) safePatch('getUserMedia', () => {
  const md = navigator.mediaDevices;
  if (!md?.getUserMedia) return;
  const orig = md.getUserMedia.bind(md);
  md.getUserMedia = (c: any = {}) => {
    console.warn('[INTCPT][GUM][CALL]', { 
      path: location.pathname, 
      constraints: c,
      video: !!c?.video,
      audio: !!c?.audio,
      timestamp: Date.now()
    });
    try { console.trace('[INTCPT][GUM][TRACE]'); } catch {}
    return orig(c)
      .then((s: MediaStream) => { 
        console.warn('[INTCPT][GUM][OK]', { 
          videoTracks: s.getVideoTracks().length, 
          audioTracks: s.getAudioTracks().length,
          streamId: s.id
        }); 
        return s; 
      })
      .catch((e: any) => { 
        console.warn('[INTCPT][GUM][ERR]', { 
          name: e?.name, 
          message: e?.message,
          code: e?.code
        }); 
        throw e; 
      });
  };
});

if (FF.MEDIA_INTERCEPTORS_ENABLED) safePatch('legacy getUserMedia', () => {
  const anyNav: any = navigator;
  ['getUserMedia', 'webkitGetUserMedia', 'mozGetUserMedia'].forEach(m => {
    if (anyNav[m]) {
      const o = anyNav[m].bind(anyNav);
      anyNav[m] = function(...args: any[]) {
        console.warn(`[INTCPT][${m}][CALL]`, { path: location.pathname, args });
        try { console.trace(`[INTCPT][${m}][TRACE]`); } catch {}
        return o(...args);
      };
    }
  });
});

if (FF.MEDIA_INTERCEPTORS_ENABLED) safePatch('getDisplayMedia', () => {
  const mdd: any = navigator.mediaDevices;
  if (!mdd?.getDisplayMedia) return;
  const g = mdd.getDisplayMedia.bind(mdd);
  mdd.getDisplayMedia = (c: any = {}) => { 
    console.warn('[INTCPT][GDM][CALL]', { 
      path: location.pathname,
      constraints: c 
    }); 
    try { console.trace('[INTCPT][GDM][TRACE]'); } catch {}
    return g(c)
      .then((s: MediaStream) => { 
        console.warn('[INTCPT][GDM][OK]', {
          videoTracks: s.getVideoTracks().length,
          audioTracks: s.getAudioTracks().length,
          streamId: s.id
        }); 
        return s; 
      })
      .catch((e: any) => { 
        console.warn('[INTCPT][GDM][ERR]', { 
          name: e?.name, 
          message: e?.message 
        }); 
        throw e; 
      }); 
  };
});

if (FF.MEDIA_INTERCEPTORS_ENABLED) safePatch('HTMLMediaElement.captureStream', () => {
  if (!(HTMLMediaElement.prototype as any).captureStream) return;
  const o = (HTMLMediaElement.prototype as any).captureStream;
  (HTMLMediaElement.prototype as any).captureStream = function(...args: any[]) { 
    console.warn('[INTCPT][HTMLMediaElement.captureStream][CALL]', { 
      path: location.pathname, 
      args,
      tagName: this?.tagName,
      src: this?.src || this?.currentSrc
    }); 
    try { console.trace('[INTCPT][HTMLMediaElement.captureStream][TRACE]'); } catch {}
    return o.apply(this, args); 
  };
});

if (FF.MEDIA_INTERCEPTORS_ENABLED) safePatch('HTMLCanvasElement.captureStream', () => {
  if (!HTMLCanvasElement.prototype.captureStream) return;
  const o = HTMLCanvasElement.prototype.captureStream;
  HTMLCanvasElement.prototype.captureStream = function(...args: any[]) { 
    console.warn('[INTCPT][HTMLCanvasElement.captureStream][CALL]', { 
      path: location.pathname, 
      args
    }); 
    try { console.trace('[INTCPT][HTMLCanvasElement.captureStream][TRACE]'); } catch {}
    return o.apply(this, args); 
  };
});

if (FF.MEDIA_INTERCEPTORS_ENABLED && typeof OffscreenCanvas !== 'undefined') safePatch('OffscreenCanvas.captureStream', () => {
  if (!(window as any).OffscreenCanvas?.prototype?.captureStream) return;
  const o = (window as any).OffscreenCanvas.prototype.captureStream;
  (window as any).OffscreenCanvas.prototype.captureStream = function(...args: any[]) { 
    console.warn('[INTCPT][OffscreenCanvas.captureStream][CALL]', { 
      path: location.pathname, 
      args
    }); 
    try { console.trace('[INTCPT][OffscreenCanvas.captureStream][TRACE]'); } catch {}
    return o.apply(this, args); 
  };
});

if (FF.MEDIA_INTERCEPTORS_ENABLED) safePatch('MediaRecorder', () => {
  const MR: any = (window as any).MediaRecorder;
  if (!MR) return;
  const Orig = MR;
  (window as any).MediaRecorder = function(...args: any[]) {
    console.warn('[INTCPT][MR][NEW]', { 
      streamId: args[0]?.id,
      options: args[1],
      path: location.pathname
    });
    try { console.trace('[INTCPT][MR][TRACE]'); } catch {}
    const inst = new Orig(...args);
    inst.addEventListener('start', () => console.warn('[INTCPT][MR][start]', { streamId: args[0]?.id }));
    inst.addEventListener('stop', () => console.warn('[INTCPT][MR][stop]', { streamId: args[0]?.id }));
    inst.addEventListener('dataavailable', (e: any) => console.warn('[INTCPT][MR][data]', { 
      size: e.data?.size, 
      type: e.data?.type 
    }));
    return inst;
  } as any;
  (window as any).MediaRecorder.prototype = Orig.prototype;
});

if (FF.MEDIA_INTERCEPTORS_ENABLED) safePatch('ImageCapture', () => {
  const IC: any = (window as any).ImageCapture;
  if (!IC) return;
  const Orig = IC;
  (window as any).ImageCapture = function(...args: any[]) { 
    console.warn('[INTCPT][ImageCapture][NEW]', { 
      trackKind: args?.[0]?.kind,
      trackLabel: args?.[0]?.label,
      trackId: args?.[0]?.id
    }); 
    try { console.trace('[INTCPT][ImageCapture][TRACE]'); } catch {}
    const inst = new Orig(...args);
    
    const gf = inst.grabFrame?.bind(inst); 
    if (gf) {
      inst.grabFrame = () => { 
        console.warn('[INTCPT][ImageCapture][grabFrame]'); 
        return gf(); 
      };
    }
    
    const tp = inst.takePhoto?.bind(inst); 
    if (tp) {
      inst.takePhoto = (...a: any[]) => { 
        console.warn('[INTCPT][ImageCapture][takePhoto]', a); 
        return tp(...a); 
      };
    }
    
    return inst;
  } as any;
  (window as any).ImageCapture.prototype = Orig.prototype;
});

if (FF.MEDIA_INTERCEPTORS_ENABLED) safePatch('video.srcObject setter', () => {
  const desc: any = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype as any, 'srcObject');
  if (!desc?.set) return;
  Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
    configurable: true,
    set: function(v: any) { 
      try {
        const vt = v?.getVideoTracks?.().length || 0;
        const at = v?.getAudioTracks?.().length || 0;
        console.warn('[INTCPT][video.srcObject][SET]', { 
          tag: this?.tagName, 
          vt, 
          at, 
          path: location.pathname,
          streamId: v?.id
        }); 
        try { console.trace('[INTCPT][video.srcObject][TRACE]'); } catch {}
      } catch {}
      return desc.set!.call(this, v); 
    },
    get: desc.get
  });
});

if (FF.MEDIA_INTERCEPTORS_ENABLED) safePatch('applyConstraints', () => {
  const MediaStreamTrackProto = (window as any).MediaStreamTrack?.prototype;
  if (!MediaStreamTrackProto?.applyConstraints) return;
  const origApply = MediaStreamTrackProto.applyConstraints;
  MediaStreamTrackProto.applyConstraints = function(constraints: any) {
    console.warn('[INTCPT][applyConstraints][CALL]', {
      trackKind: this.kind,
      trackId: this.id,
      trackLabel: this.label,
      constraints,
      path: location.pathname
    });
    try { console.trace('[INTCPT][applyConstraints][TRACE]'); } catch {}
    return origApply.call(this, constraints)
      .then((result: any) => {
        console.warn('[INTCPT][applyConstraints][OK]', { trackId: this.id });
        return result;
      })
      .catch((e: any) => {
        console.warn('[INTCPT][applyConstraints][ERR]', { 
          trackId: this.id, 
          name: e?.name, 
          message: e?.message 
        });
        throw e;
      });
  };
});

if (FF.MEDIA_INTERCEPTORS_ENABLED) safePatch('AudioContext', () => {
  const anyWin = window as any;
  anyWin.__activeAudioContexts = anyWin.__activeAudioContexts || [];
  const AC = (window as any).AudioContext;
  const WAC = (window as any).webkitAudioContext;
  function wrap(Ctor:any){
    if (!Ctor) return;
    const Orig = Ctor;
    (window as any)[Orig.name] = function(...args:any[]){
      const inst = new Orig(...args);
      try { anyWin.__activeAudioContexts.push(inst); } catch {}
      console.warn('[INTCPT][AudioContext][NEW]');
      try { console.trace('[INTCPT][AudioContext][TRACE]'); } catch {}
      return inst;
    } as any;
    (window as any)[Orig.name].prototype = Orig.prototype;
  }
  wrap(AC); wrap(WAC);
});

if (FF.MEDIA_INTERCEPTORS_ENABLED) safePatch('createMediaStreamSource', () => {
  const AC: any = (window as any).AudioContext?.prototype || (window as any).webkitAudioContext?.prototype;
  if (!AC?.createMediaStreamSource) return;
  const orig = AC.createMediaStreamSource;
  AC.createMediaStreamSource = function(stream: any) {
    console.warn('[INTCPT][createMediaStreamSource][CALL]', {
      streamId: stream?.id,
      tracks: stream?.getTracks?.().length || 0
    });
    try { console.trace('[INTCPT][createMediaStreamSource][TRACE]'); } catch {}
    return orig.call(this, stream);
  };
});

// ========= PREVENT CACHED REFERENCES (optional) =========
if (FF.MEDIA_STRICT_LOCKDOWN) safePatch('lock getUserMedia', () => {
  Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { 
    configurable: false, 
    writable: false, 
    value: navigator.mediaDevices.getUserMedia 
  });
});

// ========= PERMISSIONS SNAPSHOT HELPER =========
(window as any).checkPermissionsAndContext = async function() {
  try {
    const cam = await navigator.permissions.query({ name: 'camera' as any });
    const mic = await navigator.permissions.query({ name: 'microphone' as any });
    console.warn('[PERMS]', { 
      cam: cam?.state, 
      mic: mic?.state, 
      standalone: (navigator as any).standalone, 
      ua: navigator.userAgent.slice(0, 100) + '...',
      tethered: navigator.platform.includes('Mac') && /WebKit/.test(navigator.userAgent)
    });
  } catch (e) {
    console.warn('[PERMS][ERROR]', e);
  }
};

console.warn('[CAPTURE-GUARD][boot-ok]');