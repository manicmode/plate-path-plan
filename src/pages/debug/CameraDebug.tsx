import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Lightbulb, Info } from 'lucide-react';
import { useTorch } from '@/lib/camera/useTorch';

export default function CameraDebug() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  
  const { supported, ready, on, toggle, attach } = useTorch();

  const addLog = (message: string) => {
    setLogs(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const startCamera = async () => {
    try {
      setError(null);
      addLog('Requesting camera access...');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        
        const track = mediaStream.getVideoTracks()[0];
        trackRef.current = track;
        setStream(mediaStream);
        
        // Get capabilities
        const caps = track.getCapabilities?.();
        setCapabilities(caps);
        
        addLog(`Camera started. Track: ${track.id}`);
        addLog(`Torch supported: ${!!(caps && 'torch' in caps)}`);
        
        // Set up track event listeners
        track.addEventListener('ended', () => {
          addLog('Track ended');
        });
      }
    } catch (err) {
      const errorMsg = `Camera error: ${err instanceof Error ? err.message : String(err)}`;
      setError(errorMsg);
      addLog(errorMsg);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      trackRef.current = null;
      setCapabilities(null);
      addLog('Camera stopped');
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleTorchOn = async () => {
    addLog('Attempting to turn torch ON...');
    await toggle(true);
    addLog(`Torch ON completed`);
  };

  const handleTorchOff = async () => {
    addLog('Attempting to turn torch OFF...');
    await toggle(false);
    addLog(`Torch OFF completed`);
  };

  const handleTorchToggle = async () => {
    addLog(`Toggling torch (currently ${on ? 'ON' : 'OFF'})...`);
    await toggle();
    addLog(`Torch toggle completed`);
  };

  const handleEnsureState = async () => {
    addLog('Ensuring torch state...');
    // No ensureTorchState in new hook, but we can re-attach
    if (trackRef.current) {
      attach(trackRef.current);
    }
    addLog('Torch state ensured');
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Camera Debug</h1>
          <p className="text-slate-300">Test camera capabilities and torch functionality</p>
        </div>

        {/* Camera Controls */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Camera Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={startCamera} disabled={!!stream}>
                Start Camera
              </Button>
              <Button onClick={stopCamera} disabled={!stream} variant="outline">
                Stop Camera
              </Button>
            </div>
            
            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded p-3 text-red-200">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Video Preview */}
        {stream && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Camera Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-w-md mx-auto rounded-lg bg-black"
              />
            </CardContent>
          </Card>
        )}

        {/* Torch Controls */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Torch Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <Badge variant={supported ? "default" : "secondary"}>
                Torch Supported: {supported ? 'YES' : 'NO'}
              </Badge>
              <Badge variant={on ? "default" : "outline"}>
                Current State: {on ? 'ON' : 'OFF'}
              </Badge>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={handleTorchOn} 
                disabled={!supported}
                variant={on ? "default" : "outline"}
              >
                Turn On
              </Button>
              <Button 
                onClick={handleTorchOff} 
                disabled={!supported}
                variant={!on ? "default" : "outline"}
              >
                Turn Off
              </Button>
              <Button 
                onClick={handleTorchToggle} 
                disabled={!supported}
              >
                Toggle
              </Button>
              <Button 
                onClick={handleEnsureState} 
                disabled={!supported}
                variant="secondary"
              >
                Ensure State
              </Button>
            </div>
            
            {!supported && (
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-3 text-yellow-200 flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="text-sm">
                  Flash not available on this camera. This is normal for front cameras and some devices.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Capabilities */}
        {capabilities && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Camera Capabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-900 p-4 rounded text-green-300 text-sm overflow-auto">
                {JSON.stringify(capabilities, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Logs */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Debug Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-900 p-4 rounded text-sm text-slate-300 space-y-1 max-h-60 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-slate-500">No logs yet...</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="font-mono">
                    {log}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}