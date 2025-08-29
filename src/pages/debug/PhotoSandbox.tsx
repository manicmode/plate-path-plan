import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, AlertTriangle } from 'lucide-react';
import { blobFromVideo } from '@/pipelines/utils';
import { analyzePhoto } from '@/pipelines/photoPipeline';

export default function PhotoSandbox() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `${timestamp}: ${message}`;
    console.log(logEntry);
    setLogs(prev => [...prev.slice(-19), logEntry]);
  };

  // Key logs we care about monitoring
  const monitoredLogs = [
    '[IMG READY]',
    '[IMG BLOB]', 
    '[PHOTO][FN_BASE]',
    '[PHOTO][FETCH_START]',
    '[PHOTO][FETCH_DONE]',
    '[PHOTO][OCR][RESP]',
    '[PHOTO][RESOLVED]'
  ];

  // Override console.log to capture monitored logs
  useEffect(() => {
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      const message = typeof args[0] === 'string' ? args[0] : '';
      if (monitoredLogs.some(log => message.includes(log))) {
        const fullMessage = args.join(' ');
        addLog(`🔍 ${fullMessage}`);
      }
      originalLog(...args);
    };

    return () => {
      console.log = originalLog;
    };
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      addLog('[CAMERA] Requesting camera access...');
      
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
        setStream(mediaStream);
        addLog('[CAMERA] Camera started successfully');
      }
    } catch (err) {
      const errorMsg = `Camera error: ${err instanceof Error ? err.message : String(err)}`;
      setError(errorMsg);
      addLog(`❌ ${errorMsg}`);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      addLog('[CAMERA] Camera stopped');
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || !stream) {
      addLog('❌ No video stream available');
      return;
    }

    setIsCapturing(true);
    
    try {
      addLog('[CAPTURE] Starting photo capture...');
      
      // Extract blob from video using pipeline utility
      const { blob, outW, outH } = await blobFromVideo(videoRef.current);
      addLog(`[IMG READY] Blob created: ${blob.size} bytes, ${outW}x${outH}`);
      addLog(`[IMG BLOB] type=${blob.type}, size=${blob.size}`);

      // Call the isolated photo pipeline
      addLog('[PHOTO] Calling analyzePhoto pipeline...');
      const result = await analyzePhoto({ blob });
      
      if (result.ok) {
        addLog(`✅ [PHOTO][RESOLVED] Success: ${JSON.stringify(result.report)}`);
      } else {
        addLog(`❌ [PHOTO][RESOLVED] Failed: ${(result as { ok: false; reason: string }).reason}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      addLog(`❌ [PHOTO] Capture failed: ${errorMsg}`);
    } finally {
      setIsCapturing(false);
    }
  };

  useEffect(() => {
    if (import.meta.env.DEV) {
      addLog('[SANDBOX] Photo sandbox mounted');
    }
    
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        {/* Dev Warning Banner */}
        <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4 text-yellow-200">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-5 w-5" />
            DEV ONLY — Photo sandbox (barcode/manual/voice unaffected)
          </div>
          <p className="text-sm mt-1 text-yellow-300">
            Isolated photo pipeline testing. Only photo analysis runs here.
          </p>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Photo Pipeline Sandbox</h1>
          <p className="text-slate-300">Test isolated photo analysis pipeline</p>
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
              <Button 
                onClick={handleCapture} 
                disabled={!stream || isCapturing}
                className="bg-primary hover:bg-primary/90"
              >
                {isCapturing ? 'Capturing...' : 'Capture & Analyze'}
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

        {/* Log Panel */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Pipeline Logs</CardTitle>
            <p className="text-slate-400 text-sm">
              Monitoring: {monitoredLogs.join(', ')}
            </p>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-900 p-4 rounded text-sm text-slate-300 space-y-1 max-h-80 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-slate-500">No logs yet... Start camera and capture to see pipeline activity</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="font-mono text-xs">
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