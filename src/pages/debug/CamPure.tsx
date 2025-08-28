// ========= PHASE 7: MINIMAL REPRO ROUTE - CAM PURE =========
// Pure getUserMedia test to isolate iOS red pill behavior

import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

// Use global permissions checker from interceptors
const checkPermissionsAndContext = (window as any).checkPermissionsAndContext;

export default function CamPure() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);

  console.warn('[FLOW][enter] CamPure', location.pathname + location.search);

  useEffect(() => {
    checkPermissionsAndContext();
    
    return () => {
      if (stream) {
        console.warn('[CLEANUP][tracks]', { 
          videoTracks: stream.getVideoTracks().length, 
          audioTracks: stream.getAudioTracks().length,
          component: 'CamPure' 
        });
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startPureCamera = async () => {
    console.warn('[DEBUG][cam-pure] Starting pure getUserMedia test');
    checkPermissionsAndContext();
    
    try {
      setError(null);
      setIsStarted(true);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
      
      console.warn('[DEBUG][cam-pure] Stream received:', {
        videoTracks: mediaStream.getVideoTracks().length,
        audioTracks: mediaStream.getAudioTracks().length,
        streamId: mediaStream.id
      });
      
      // Add track listeners
      for (const track of mediaStream.getTracks()) {
        track.addEventListener('ended', () => console.warn('[TRACK][ended]', { 
          kind: track.kind, 
          component: 'CamPure',
          reason: 'iOS red pill tap?' 
        }));
        track.addEventListener('mute', () => console.warn('[TRACK][mute]', { kind: track.kind }));
        track.addEventListener('unmute', () => console.warn('[TRACK][unmute]', { kind: track.kind }));
      }
      
      mediaStream.addEventListener?.('inactive', () => console.warn('[STREAM][inactive]', { component: 'CamPure' }));
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      
      setStream(mediaStream);
      
    } catch (err: any) {
      console.warn('[DEBUG][cam-pure] Error:', err);
      setError(err.message || 'Unknown error');
      setIsStarted(false);
    }
  };

  const stopCamera = () => {
    console.warn('[DEBUG][cam-pure] Stopping camera');
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsStarted(false);
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-center">🔬 Camera Debug - Pure Test</h1>
        
        <div className="bg-gray-900 p-4 rounded-lg mb-4">
          <h2 className="text-lg font-semibold mb-2">Purpose</h2>
          <p className="text-sm text-gray-300">
            Pure getUserMedia({'{'}"video": true, "audio": false{'}'}) test.
            Check if iOS red pill appears with minimal code.
          </p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 p-4 rounded-lg mb-4">
            <h3 className="font-semibold">Error:</h3>
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={startPureCamera} 
              disabled={isStarted}
              className="bg-green-600 hover:bg-green-700"
            >
              Start Pure Camera
            </Button>
            <Button 
              onClick={stopCamera}
              disabled={!stream}
              className="bg-red-600 hover:bg-red-700"
            >
              Stop Camera
            </Button>
            <Button 
              onClick={checkPermissionsAndContext}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Check Permissions
            </Button>
          </div>

          {stream && (
            <div className="bg-gray-800 p-2 rounded-lg">
              <p className="text-sm text-green-400 mb-2">✅ Stream Active</p>
              <video 
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-w-md mx-auto rounded border-2 border-green-500"
                style={{ aspectRatio: '4/3' }}
              />
            </div>
          )}
        </div>

        <div className="mt-6 bg-gray-900 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">🔍 Test Instructions</h3>
          <ol className="text-sm text-gray-300 space-y-1">
            <li>1. Open browser dev tools console</li>
            <li>2. Click "Start Pure Camera"</li>
            <li>3. Look for iOS red recording pill</li>
            <li>4. If pill appears, tap it and choose "Stop"</li>
            <li>5. Check console for [TRACK][ended] logs</li>
            <li>6. Note if video preview goes black</li>
          </ol>
        </div>

        <div className="mt-4 bg-blue-900/30 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">📝 Expected Results</h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• <strong>Without Red Pill:</strong> Normal camera preview, no issues</li>
            <li>• <strong>With Red Pill:</strong> Pill appears → tap → [TRACK][ended] → black preview</li>
            <li>• All activity logged with [INTCPT] and [TRACK] prefixes</li>
          </ul>
        </div>
      </div>
    </div>
  );
}