// Camera Inquiry Diagnostic System - Dev Only
// Enable via ?camInq=1 or window.__cam_inq_enable = true

declare global {
  interface Window {
    __cam_inq_enable?: boolean;
    __camRegistry?: {
      streams: Record<string, {
        streamId: string;
        owner: string;
        createdAt: number;
        tracks: Array<{ kind: string; label: string; id: string; stopped: boolean }>;
        callSite: string[];
      }>;
      events: Array<{ timestamp: number; event: string; data: any }>;
    };
    __camDump?: () => void;
    __camInqDisable?: () => void;
    MediaRecorder?: any;
  }
}

let enabled = false;
let originalGetUserMedia: typeof navigator.mediaDevices.getUserMedia | null = null;
let originalMediaRecorder: typeof MediaRecorder | null = null;

// Rate limiting for logs (≥200ms between identical tags)
const logThrottle = new Map<string, number>();
const throttleLog = (tag: string, data?: any) => {
  const now = Date.now();
  const lastLog = logThrottle.get(tag) || 0;
  if (now - lastLog >= 200) {
    console.log(tag, data || '');
    logThrottle.set(tag, now);
  }
};

// Generate unique stream ID
const generateStreamId = () => Date.now() + Math.random().toString(36).slice(2);

// Parse call site from stack trace
const parseCallSite = (stack?: string): string[] => {
  if (!stack) return ['unknown'];
  const lines = stack.split('\n').slice(2, 6); // Skip first 2 lines, take next 4
  return lines.map(line => {
    const match = line.match(/at\s+(.+?)\s+\((.+?)\)/);
    if (match) {
      const [, func, location] = match;
      const fileMatch = location.match(/([^/]+):(\d+):(\d+)$/);
      if (fileMatch) {
        const [, file, lineNum] = fileMatch;
        return `${func}@${file}:${lineNum}`;
      }
    }
    return line.trim();
  }).filter(Boolean);
};

// Initialize registry
const initRegistry = () => {
  if (!window.__camRegistry) {
    window.__camRegistry = {
      streams: {},
      events: []
    };
  }
};

// Add event to registry
const addEvent = (event: string, data: any) => {
  if (!enabled) return;
  initRegistry();
  
  const registry = window.__camRegistry!;
  registry.events.push({
    timestamp: Date.now(),
    event,
    data
  });
  
  // Keep only last 200 events
  if (registry.events.length > 200) {
    registry.events.shift();
  }
};

// Setup stream tracking
const setupStreamTracking = (stream: MediaStream, streamId: string, callSite: string[]) => {
  if (!enabled) return;
  initRegistry();
  
  const registry = window.__camRegistry!;
  const tracks = stream.getTracks().map(track => ({
    kind: track.kind,
    label: track.label,
    id: track.id,
    stopped: false
  }));
  
  registry.streams[streamId] = {
    streamId,
    owner: 'pending', // Will be updated by components
    createdAt: Date.now(),
    tracks,
    callSite
  };
  
  // Patch track.stop() to log
  stream.getTracks().forEach((track, index) => {
    const originalStop = track.stop.bind(track);
    track.stop = () => {
      throttleLog(`[CAM][INQ][TRACK][STOP]`, {
        streamId,
        kind: track.kind,
        label: track.label
      });
      
      // Update registry
      if (registry.streams[streamId]) {
        registry.streams[streamId].tracks[index].stopped = true;
      }
      
      addEvent('TRACK_STOP', { streamId, kind: track.kind, label: track.label });
      return originalStop();
    };
    
    // Listen for ended event
    track.addEventListener('ended', () => {
      throttleLog(`[CAM][INQ][TRACK][ENDED]`, {
        streamId,
        kind: track.kind,
        label: track.label
      });
      
      addEvent('TRACK_ENDED', { streamId, kind: track.kind, label: track.label });
    });
  });
  
  // Listen for stream inactive
  stream.addEventListener('inactive', () => {
    throttleLog(`[CAM][INQ][STREAM][INACTIVE]`, { streamId });
    addEvent('STREAM_INACTIVE', { streamId });
  });
};

// Wrap getUserMedia
const wrapGetUserMedia = () => {
  if (!navigator.mediaDevices?.getUserMedia || originalGetUserMedia) return;
  
  originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  
  navigator.mediaDevices.getUserMedia = async (constraints: MediaStreamConstraints) => {
    const streamId = generateStreamId();
    const callSite = parseCallSite(new Error().stack);
    const caller = callSite[0] || 'unknown';
    
    throttleLog(`[CAM][INQ][GUM][CALL]`, {
      constraints,
      caller,
      streamId,
      ts: Date.now()
    });
    
    addEvent('GUM_CALL', { constraints, caller, streamId });
    
    try {
      const stream = await originalGetUserMedia!(constraints);
      
      throttleLog(`[CAM][INQ][GUM][OK]`, {
        streamId,
        tracks: stream.getTracks().map(t => ({
          kind: t.kind,
          label: t.label,
          id: t.id
        })),
        ts: Date.now()
      });
      
      addEvent('GUM_SUCCESS', { streamId, trackCount: stream.getTracks().length });
      setupStreamTracking(stream, streamId, callSite);
      
      return stream;
    } catch (error) {
      throttleLog(`[CAM][INQ][GUM][ERROR]`, {
        streamId,
        error: String(error),
        ts: Date.now()
      });
      
      addEvent('GUM_ERROR', { streamId, error: String(error) });
      throw error;
    }
  };
};

// Wrap MediaRecorder constructor
const wrapMediaRecorder = () => {
  if (!window.MediaRecorder || originalMediaRecorder) return;
  
  originalMediaRecorder = window.MediaRecorder;
  
  window.MediaRecorder = class extends originalMediaRecorder {
    constructor(stream: MediaStream, options?: any) {
      const streamId = findStreamId(stream);
      const callSite = parseCallSite(new Error().stack);
      
      throttleLog(`[CAM][INQ][REC][NEW]`, {
        streamId: streamId || 'unknown',
        hasAudio: stream.getAudioTracks().length > 0,
        hasVideo: stream.getVideoTracks().length > 0,
        opts: options,
        caller: callSite[0] || 'unknown'
      });
      
      addEvent('MEDIA_RECORDER_NEW', {
        streamId: streamId || 'unknown',
        hasAudio: stream.getAudioTracks().length > 0,
        hasVideo: stream.getVideoTracks().length > 0,
        options
      });
      
      super(stream, options);
    }
  } as any;
};

// Helper to find stream ID in registry
const findStreamId = (stream: MediaStream): string | null => {
  if (!window.__camRegistry) return null;
  
  const streamTracks = stream.getTracks().map(t => t.id);
  for (const [id, streamData] of Object.entries(window.__camRegistry.streams)) {
    const registryTrackIds = streamData.tracks.map(t => t.id);
    if (streamTracks.some(id => registryTrackIds.includes(id))) {
      return id;
    }
  }
  return null;
};

// Public API functions
const setupPublicAPI = () => {
  window.__camDump = () => {
    if (!window.__camRegistry) {
      console.log('Camera diagnostic registry not initialized');
      return;
    }
    
    const registry = window.__camRegistry;
    console.group('🎥 Camera Diagnostic Dump');
    
    console.log('Active Streams:', Object.keys(registry.streams).length);
    Object.entries(registry.streams).forEach(([id, data]) => {
      const activeTracksCount = data.tracks.filter(t => !t.stopped).length;
      const age = Date.now() - data.createdAt;
      console.log(`Stream ${id}:`, {
        owner: data.owner,
        age: `${Math.round(age / 1000)}s`,
        activeTracks: activeTracksCount,
        totalTracks: data.tracks.length,
        callSite: data.callSite[0] || 'unknown'
      });
    });
    
    console.log('Recent Events:', registry.events.slice(-10));
    
    // Check for potential leaks
    const activeStreams = Object.values(registry.streams).filter(stream => 
      stream.tracks.some(track => !track.stopped)
    );
    
    if (activeStreams.length > 0) {
      console.warn('⚠️ Potential stream leaks detected:', activeStreams.length, 'active streams');
      activeStreams.forEach(stream => {
        const activeTracks = stream.tracks.filter(t => !t.stopped);
        console.warn(`Leak: ${stream.streamId} (${stream.owner}) - ${activeTracks.length} active tracks`);
      });
    }
    
    console.groupEnd();
  };
  
  window.__camInqDisable = () => {
    enabled = false;
    console.log('[CAM][INQ] Diagnostic logging disabled');
  };
};

// Main initialization
const init = () => {
  // Check if enabled
  const urlParams = new URLSearchParams(window.location.search);
  const urlEnabled = urlParams.get('camInq') === '1';
  const windowEnabled = window.__cam_inq_enable === true;
  
  enabled = urlEnabled || windowEnabled;
  
  if (!enabled) {
    return; // Exit early if not enabled
  }
  
  console.log('[CAM][INQ] Camera diagnostic logging enabled');
  
  // Setup wrappers
  wrapGetUserMedia();
  wrapMediaRecorder();
  setupPublicAPI();
  
  // Performance markers
  console.log('[PERF][CAM][INIT]', { timestamp: Date.now() });
};

// Auto-initialize when loaded
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

// Export functions for manual component usage
export const updateStreamOwner = (streamId: string, owner: string) => {
  if (!enabled || !window.__camRegistry) return;
  
  const registry = window.__camRegistry;
  if (registry.streams[streamId]) {
    registry.streams[streamId].owner = owner;
  }
};

export const logOwnerAcquire = (owner: string, streamId?: string) => {
  if (!enabled) return;
  
  throttleLog(`[CAM][INQ][OWNER_ACQUIRE]`, {
    owner,
    streamId: streamId || 'pending',
    ts: Date.now()
  });
  
  addEvent('OWNER_ACQUIRE', { owner, streamId });
};

export const logOwnerAttach = (owner: string, streamId: string) => {
  if (!enabled) return;
  
  throttleLog(`[CAM][INQ][ATTACH]`, {
    owner,
    streamId,
    ts: Date.now()
  });
  
  addEvent('OWNER_ATTACH', { owner, streamId });
};

export const logOwnerRelease = (owner: string, stoppedKinds: string[]) => {
  if (!enabled) return;
  
  throttleLog(`[CAM][INQ][OWNER_RELEASE]`, {
    owner,
    stopped: stoppedKinds,
    ts: Date.now()
  });
  
  addEvent('OWNER_RELEASE', { owner, stoppedKinds });
};

export const logPerfOpen = (owner: string) => {
  if (!enabled) return;
  
  console.log(`[PERF][CAM][OPEN]`, { owner, timestamp: Date.now() });
  addEvent('PERF_OPEN', { owner });
};

export const logPerfClose = (owner: string, startTime: number) => {
  if (!enabled) return;
  
  const dtMs = Date.now() - startTime;
  console.log(`[PERF][CAM][CLOSE]`, { owner, dtMs, timestamp: Date.now() });
  addEvent('PERF_CLOSE', { owner, dtMs });
};

export const checkForLeaks = (owner: string) => {
  if (!enabled || !window.__camRegistry) return;
  
  const registry = window.__camRegistry;
  const activeStreams = Object.values(registry.streams).filter(stream => 
    stream.owner === owner && stream.tracks.some(track => !track.stopped)
  );
  
  if (activeStreams.length > 0) {
    activeStreams.forEach(stream => {
      const liveTrackKinds = stream.tracks
        .filter(t => !t.stopped)
        .map(t => t.kind);
      
      throttleLog(`[CAM][INQ][LEAK]`, {
        owner,
        streamId: stream.streamId,
        tracksStillLive: liveTrackKinds
      });
      
      addEvent('STREAM_LEAK', {
        owner,
        streamId: stream.streamId,
        liveTrackKinds
      });
    });
  }
};

export { enabled as isCameraInqEnabled };
