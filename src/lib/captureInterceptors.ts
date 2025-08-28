// ========= PHASE 2: GLOBAL CAPTURE INTERCEPTORS =========
// This module MUST load first to intercept all capture APIs with full stack traces
// Remove this file after forensic investigation is complete

// BOOT MARKER
console.warn('[CAPTURE-GUARD][boot]', { 
  path: location.pathname, 
  ua: navigator.userAgent,
  standalone: (navigator as any).standalone,
  timestamp: Date.now()
});

// Helper function for logging with stack traces
function tag(k: string, extra?: any) { 
  console.warn(k, extra ?? ''); 
  try { 
    console.trace(k); 
  } catch {} 
}

// ========= getUserMedia INTERCEPTORS =========

// Modern getUserMedia
const md = navigator.mediaDevices;
if (md?.getUserMedia) {
  const orig = md.getUserMedia.bind(md);
  md.getUserMedia = (c: any = {}) => {
    tag('[INTCPT][GUM][CALL]', { 
      path: location.pathname, 
      constraints: c,
      video: !!c?.video,
      audio: !!c?.audio,
      timestamp: Date.now()
    });
    return orig(c)
      .then((s: MediaStream) => { 
        tag('[INTCPT][GUM][OK]', { 
          videoTracks: s.getVideoTracks().length, 
          audioTracks: s.getAudioTracks().length,
          streamId: s.id
        }); 
        return s; 
      })
      .catch((e: any) => { 
        tag('[INTCPT][GUM][ERR]', { 
          name: e?.name, 
          message: e?.message,
          code: e?.code
        }); 
        throw e; 
      });
  };
}

// Legacy getUserMedia (all prefixed variants)
const anyNav: any = navigator;
['getUserMedia', 'webkitGetUserMedia', 'mozGetUserMedia'].forEach(m => {
  if (anyNav[m]) {
    const o = anyNav[m].bind(anyNav);
    anyNav[m] = function(...args: any[]) {
      tag(`[INTCPT][${m}][CALL]`, { path: location.pathname, args });
      return o(...args);
    };
  }
});

// ========= getDisplayMedia INTERCEPTORS =========
const mdd: any = navigator.mediaDevices;
if (mdd?.getDisplayMedia) {
  const g = mdd.getDisplayMedia.bind(mdd);
  mdd.getDisplayMedia = (c: any = {}) => { 
    tag('[INTCPT][GDM][CALL]', { 
      path: location.pathname,
      constraints: c 
    }); 
    return g(c)
      .then((s: MediaStream) => { 
        tag('[INTCPT][GDM][OK]', {
          videoTracks: s.getVideoTracks().length,
          audioTracks: s.getAudioTracks().length,
          streamId: s.id
        }); 
        return s; 
      })
      .catch((e: any) => { 
        tag('[INTCPT][GDM][ERR]', { 
          name: e?.name, 
          message: e?.message 
        }); 
        throw e; 
      }); 
  };
}

// ========= captureStream INTERCEPTORS =========
function wrapCaptureStream(proto: any, label: string) {
  if (!proto || !(proto as any).captureStream) return;
  const o = (proto as any).captureStream;
  (proto as any).captureStream = function(...args: any[]) { 
    tag(`[INTCPT][${label}.captureStream][CALL]`, { 
      path: location.pathname, 
      args,
      tagName: this?.tagName,
      src: this?.src || this?.currentSrc
    }); 
    return o.apply(this, args); 
  };
}

wrapCaptureStream(HTMLMediaElement.prototype, 'HTMLMediaElement');
wrapCaptureStream(HTMLCanvasElement.prototype, 'HTMLCanvasElement');

// OffscreenCanvas if available
if ((window as any).OffscreenCanvas) {
  wrapCaptureStream((window as any).OffscreenCanvas.prototype, 'OffscreenCanvas');
}

// ========= MediaRecorder INTERCEPTORS =========
const MR: any = (window as any).MediaRecorder;
if (MR) {
  const Orig = MR;
  (window as any).MediaRecorder = function(...args: any[]) {
    tag('[INTCPT][MR][NEW]', { 
      streamId: args[0]?.id,
      options: args[1],
      path: location.pathname
    });
    const inst = new Orig(...args);
    inst.addEventListener('start', () => tag('[INTCPT][MR][start]', { streamId: args[0]?.id }));
    inst.addEventListener('stop', () => tag('[INTCPT][MR][stop]', { streamId: args[0]?.id }));
    inst.addEventListener('dataavailable', (e: any) => tag('[INTCPT][MR][data]', { 
      size: e.data?.size, 
      type: e.data?.type 
    }));
    return inst;
  } as any;
  (window as any).MediaRecorder.prototype = Orig.prototype;
}

// ========= ImageCapture INTERCEPTORS =========
const IC: any = (window as any).ImageCapture;
if (IC) {
  const Orig = IC;
  (window as any).ImageCapture = function(...args: any[]) { 
    tag('[INTCPT][ImageCapture][NEW]', { 
      trackKind: args?.[0]?.kind,
      trackLabel: args?.[0]?.label,
      trackId: args?.[0]?.id
    }); 
    const inst = new Orig(...args);
    
    const gf = inst.grabFrame?.bind(inst); 
    if (gf) {
      inst.grabFrame = () => { 
        tag('[INTCPT][ImageCapture][grabFrame]'); 
        return gf(); 
      };
    }
    
    const tp = inst.takePhoto?.bind(inst); 
    if (tp) {
      inst.takePhoto = (...a: any[]) => { 
        tag('[INTCPT][ImageCapture][takePhoto]', a); 
        return tp(...a); 
      };
    }
    
    return inst;
  } as any;
  (window as any).ImageCapture.prototype = Orig.prototype;
}

// ========= video.srcObject INTERCEPTORS =========
const desc: any = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype as any, 'srcObject');
if (desc?.set) {
  Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
    configurable: true,
    set: function(v: any) { 
      tag('[INTCPT][video.srcObject][SET]', { 
        videoTracks: v?.getVideoTracks?.().length || 0, 
        audioTracks: v?.getAudioTracks?.().length || 0, 
        tagName: this?.tagName,
        streamId: v?.id,
        path: location.pathname
      }); 
      return desc.set!.call(this, v); 
    },
    get: desc.get
  });
}

// ========= applyConstraints INTERCEPTORS =========
const MediaStreamTrackProto = (window as any).MediaStreamTrack?.prototype;
if (MediaStreamTrackProto?.applyConstraints) {
  const origApply = MediaStreamTrackProto.applyConstraints;
  MediaStreamTrackProto.applyConstraints = function(constraints: any) {
    tag('[INTCPT][applyConstraints][CALL]', {
      trackKind: this.kind,
      trackId: this.id,
      trackLabel: this.label,
      constraints,
      path: location.pathname
    });
    return origApply.call(this, constraints)
      .then((result: any) => {
        tag('[INTCPT][applyConstraints][OK]', { trackId: this.id });
        return result;
      })
      .catch((e: any) => {
        tag('[INTCPT][applyConstraints][ERR]', { 
          trackId: this.id, 
          name: e?.name, 
          message: e?.message 
        });
        throw e;
      });
  };
}

// ========= AUDIOCONTEXT TRACKING =========
(function tapAudioContext(){
  const anyWin = window as any;
  anyWin.__activeAudioContexts = [];
  const AC = (window as any).AudioContext;
  const WAC = (window as any).webkitAudioContext;
  function wrap(Ctor:any){
    if (!Ctor) return;
    const Orig = Ctor;
    (window as any)[Orig.name] = function(...args:any[]){
      const inst = new Orig(...args);
      try { anyWin.__activeAudioContexts.push(inst); } catch {}
      tag('[INTCPT][AudioContext][NEW]');
      return inst;
    } as any;
    (window as any)[Orig.name].prototype = Orig.prototype;
  }
  wrap(AC); wrap(WAC);
})();

// ========= AUDIO STREAM SOURCE TRACKING =========
const AC: any = (window as any).AudioContext?.prototype || (window as any).webkitAudioContext?.prototype;
if (AC?.createMediaStreamSource) {
  const orig = AC.createMediaStreamSource;
  AC.createMediaStreamSource = function(stream: any) {
    tag('[INTCPT][createMediaStreamSource][CALL]', {
      streamId: stream?.id,
      tracks: stream?.getTracks?.().length || 0
    });
    return orig.call(this, stream);
  };
}

// ========= PREVENT CACHED REFERENCES =========
// Make getUserMedia non-replaceable to prevent cached refs from bypassing
try {
  Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { 
    configurable: false, 
    writable: false, 
    value: navigator.mediaDevices.getUserMedia 
  });
} catch (e) {
  tag('[INTCPT][LOCK][ERR]', { message: 'Could not lock getUserMedia' });
}

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

console.warn('[CAPTURE-GUARD][boot-complete]', { 
  interceptorsInstalled: {
    getUserMedia: !!md?.getUserMedia,
    getDisplayMedia: !!mdd?.getDisplayMedia,
    captureStream: !!(HTMLMediaElement.prototype as any).captureStream,
    mediaRecorder: !!MR,
    imageCapture: !!IC,
    srcObjectSetter: !!desc?.set,
    applyConstraints: !!MediaStreamTrackProto?.applyConstraints,
    audioContext: !!(window as any).AudioContext,
    createMediaStreamSource: !!AC?.createMediaStreamSource,
    getUserMediaLocked: !Object.getOwnPropertyDescriptor(navigator.mediaDevices, 'getUserMedia')?.configurable
  }
});