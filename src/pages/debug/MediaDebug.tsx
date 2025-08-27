/**
 * Media devices debug page - QA only
 * Shows active media streams and provides emergency controls
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, Mic, MicOff, VideoOff, AlertTriangle, Zap } from 'lucide-react';
import { getActiveMediaInfo, stopAllMedia, useCamera, useMicrophone } from '@/lib/media/useMediaDevices';

export default function MediaDebug() {
  const [mediaInfo, setMediaInfo] = useState<any>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [autoShutdownTimer, setAutoShutdownTimer] = useState<number | null>(null);

  // Test hooks
  const camera = useCamera({ facingMode: 'environment' });
  const microphone = useMicrophone();

  // Refresh media info
  const refreshInfo = () => {
    const info = getActiveMediaInfo();
    setMediaInfo(info);
    setRefreshCount(c => c + 1);
  };

  // Auto-refresh every 2 seconds
  useEffect(() => {
    const interval = setInterval(refreshInfo, 2000);
    refreshInfo(); // Initial load
    return () => clearInterval(interval);
  }, []);

  // Mock idle timer display (for testing auto-shutdown behavior)
  useEffect(() => {
    if (camera.isActive || microphone.isActive) {
      setAutoShutdownTimer(30); // Start at 30 seconds
      const timer = setInterval(() => {
        setAutoShutdownTimer(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else {
      setAutoShutdownTimer(null);
    }
  }, [camera.isActive, microphone.isActive]);

  const handleStopAllCameras = () => {
    console.log('🚨 [DEBUG] Stopping all cameras');
    if (camera.isActive) {
      camera.stop();
    }
    stopAllMedia();
    refreshInfo();
  };

  const handleStopAllMics = () => {
    console.log('🚨 [DEBUG] Stopping all microphones');
    if (microphone.isActive) {
      microphone.stop();
    }
    stopAllMedia();
    refreshInfo();
  };

  const handleTestCamera = async () => {
    try {
      if (camera.isActive) {
        camera.stop();
      } else {
        await camera.start();
      }
    } catch (error) {
      console.error('Camera test failed:', error);
    }
  };

  const handleTestMicrophone = async () => {
    try {
      if (microphone.isActive) {
        microphone.stop();
      } else {
        await microphone.start();
      }
    } catch (error) {
      console.error('Microphone test failed:', error);
    }
  };

  const handleTorchToggle = async () => {
    if (camera.torch.supported) {
      // Toggle torch state (we don't track current state, so just try both)
      await camera.torch.off();
      setTimeout(() => camera.torch.on(), 100);
      setTimeout(() => camera.torch.off(), 2000); // Auto-off after 2s for safety
    }
  };

  // Only show in development or when debug flag is set
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_DEBUG !== 'true') {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Debug Page Not Available</h1>
        <p className="text-muted-foreground">This page is only available in development mode.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <Zap className="h-6 w-6 text-yellow-500" />
        <h1 className="text-2xl font-bold">Media Devices Debug</h1>
        <Badge variant="outline" className="ml-2">QA Only</Badge>
      </div>

      {/* Quick Actions */}
      <Card className="p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Emergency Controls</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleStopAllCameras}
            className="flex items-center gap-2"
          >
            <VideoOff className="h-4 w-4" />
            Stop All Cameras
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={handleStopAllMics}
            className="flex items-center gap-2"
          >
            <MicOff className="h-4 w-4" />
            Stop All Mics
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshInfo}
          >
            Refresh ({refreshCount})
          </Button>
        </div>
      </Card>

      {/* Test Controls */}
      <Card className="p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Test Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Video className="h-4 w-4" />
              <span className="font-medium">Camera Test</span>
              {camera.isActive && <Badge variant="default">Active</Badge>}
            </div>
            <div className="space-y-2">
              <Button
                variant={camera.isActive ? "destructive" : "default"}
                size="sm"
                onClick={handleTestCamera}
                className="w-full"
              >
                {camera.isActive ? 'Stop Camera' : 'Start Camera'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleTorchToggle}
                disabled={!camera.isActive || !camera.torch.supported}
                className="w-full"
              >
                Test Torch {camera.torch.supported ? '🔦' : '❌'}
              </Button>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Mic className="h-4 w-4" />
              <span className="font-medium">Microphone Test</span>
              {microphone.isActive && <Badge variant="default">Active</Badge>}
            </div>
            <Button
              variant={microphone.isActive ? "destructive" : "default"}
              size="sm"
              onClick={handleTestMicrophone}
              className="w-full"
            >
              {microphone.isActive ? 'Stop Microphone' : 'Start Microphone'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Auto-shutdown Timer */}
      {autoShutdownTimer !== null && (
        <Card className="p-4 mb-6 border-orange-200 bg-orange-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span className="font-medium">Auto-shutdown in {autoShutdownTimer}s</span>
            <Badge variant="outline">Idle Timer</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Media streams will auto-stop after 30 seconds of inactivity
          </p>
        </Card>
      )}

      {/* Active Media Info */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Active Media Streams</h2>
        
        {mediaInfo && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Video className="h-4 w-4" />
                Video Tracks ({mediaInfo.videoTracks.length})
              </h3>
              {mediaInfo.videoTracks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active video tracks</p>
              ) : (
                <div className="space-y-2">
                  {mediaInfo.videoTracks.map((track: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <span className="font-mono text-sm">{track.label || 'Unnamed'}</span>
                        <div className="text-xs text-muted-foreground">
                          {track.kind} • {track.readyState} • 
                          {track.enabled ? ' enabled' : ' disabled'} •
                          {track.muted ? ' muted' : ' unmuted'}
                        </div>
                      </div>
                      <Badge 
                        variant={track.readyState === 'live' ? 'default' : 'secondary'}
                      >
                        {track.readyState}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Audio Tracks ({mediaInfo.audioTracks.length})
              </h3>
              {mediaInfo.audioTracks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active audio tracks</p>
              ) : (
                <div className="space-y-2">
                  {mediaInfo.audioTracks.map((track: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <span className="font-mono text-sm">{track.label || 'Unnamed'}</span>
                        <div className="text-xs text-muted-foreground">
                          {track.kind} • {track.readyState} • 
                          {track.enabled ? ' enabled' : ' disabled'} •
                          {track.muted ? ' muted' : ' unmuted'}
                        </div>
                      </div>
                      <Badge 
                        variant={track.readyState === 'live' ? 'default' : 'secondary'}
                      >
                        {track.readyState}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                Total active streams: {mediaInfo.totalStreams} • 
                Last updated: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}