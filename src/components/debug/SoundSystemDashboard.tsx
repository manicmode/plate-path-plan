import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { useSound } from '@/contexts/SoundContext';
import { soundManager } from '@/utils/SoundManager';
import { toast } from 'sonner';
import { Play, Volume2, VolumeX, RefreshCw, CheckCircle, XCircle, AlertTriangle, Smartphone } from 'lucide-react';

interface SoundSystemDashboardProps {
  className?: string;
}

export const SoundSystemDashboard: React.FC<SoundSystemDashboardProps> = ({ className }) => {
  const { isEnabled, setSoundEnabled, playSound, forceInitialize } = useSound();
  const [status, setStatus] = useState(soundManager.getStatus());
  const [volume, setVolumeState] = useState(70);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [progressDetails, setProgressDetails] = useState<string>('');

  useEffect(() => {
    const interval = setInterval(() => {
      const newStatus = soundManager.getStatus();
      setStatus(newStatus);
      
      // Update progress details
      if (newStatus.isInitializing) {
        setProgressDetails('Loading audio buffers...');
      } else if (newStatus.isInitialized) {
        setProgressDetails('System ready');
      } else if (!newStatus.hasUserInteracted) {
        setProgressDetails('Waiting for user interaction');
      } else {
        setProgressDetails('Initializing...');
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolumeState(newVolume);
    soundManager.setVolume(newVolume / 100);
  };

  const runSoundTest = async (soundKey: string) => {
    try {
      await playSound(soundKey);
      setTestResults(prev => ({ ...prev, [soundKey]: true }));
      toast.success(`✅ ${soundKey} played successfully`);
    } catch (error) {
      setTestResults(prev => ({ ...prev, [soundKey]: false }));
      toast.error(`❌ ${soundKey} failed: ${error.message}`);
    }
  };

  const playRawBeep = async () => {
    try {
      // Debug logging before playback
      const preState = soundManager.getStatus();
      console.log('🔊 [DEBUG] Pre-beep AudioContext state:', preState.audioContextState);
      console.log('🔊 [DEBUG] Pre-beep user interaction:', preState.hasUserInteracted);
      
      const audioContext = soundManager.isAudioContextReady() ? soundManager.getStatus().audioContextState : 'not-ready';
      
      if (!soundManager.isAudioContextReady()) {
        throw new Error('AudioContext not ready');
      }

      // Generate raw 400Hz sine wave
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('🔊 [DEBUG] During-beep new AudioContext state:', context.state);
      
      if (context.state === 'suspended') {
        await context.resume();
        console.log('🔊 [DEBUG] During-beep resumed AudioContext state:', context.state);
      }

      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.frequency.setValueAtTime(400, context.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.5);
      
      console.log('🔊 [DEBUG] Post-beep oscillator started successfully');
      
      oscillator.onended = () => {
        console.log('🔊 [DEBUG] Raw beep playback completed');
        context.close();
      };
      
      setTestResults(prev => ({ ...prev, 'raw_beep': true }));
      toast.success('✅ Raw beep played successfully');
      
    } catch (error) {
      console.error('🔊 [DEBUG] Raw beep failed:', error);
      setTestResults(prev => ({ ...prev, 'raw_beep': false }));
      toast.error(`❌ Raw beep failed: ${error.message}`);
    }
  };

  const getHealthBadge = () => {
    const health = status.systemHealth;
    const colors = {
      excellent: 'bg-green-500',
      good: 'bg-blue-500', 
      warning: 'bg-yellow-500',
      critical: 'bg-red-500'
    };
    return <Badge className={colors[health]}>{health.toUpperCase()}</Badge>;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* System Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔊 Sound System Status
            {getHealthBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>Health Score: {soundManager.getHealthScore()}/100</div>
            <div>Loaded Buffers: {status.loadedSounds}/{status.totalSounds}</div>
            <div>AudioContext: {status.audioContextState}</div>
            <div>User Interaction: {status.hasUserInteracted ? '✅' : '❌'}</div>
            <div>System Status: {status.isInitialized ? '✅ Ready' : status.isInitializing ? '⏳ Loading' : '❌ Not Init'}</div>
            <div>Web Audio API: {soundManager.isAudioContextReady() ? '✅ Running' : '❌ Not Ready'}</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>System Health</span>
              <span>{Math.round(soundManager.getHealthScore())}%</span>
            </div>
            <Progress value={soundManager.getHealthScore()} className="w-full" />
            <div className="text-xs text-muted-foreground">{progressDetails}</div>
          </div>
          
          {status.lastError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
              <strong>Last Error:</strong> {status.lastError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={() => setSoundEnabled(!isEnabled)}
              variant={isEnabled ? "default" : "outline"}
            >
              {isEnabled ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
              {isEnabled ? 'Disable' : 'Enable'} Sound
            </Button>
            
            <Button onClick={forceInitialize} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Force Initialize
            </Button>
            
            <Button onClick={playRawBeep} variant="outline">
              <Play className="w-4 h-4 mr-2" />
              Play Raw Beep
            </Button>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Volume: {volume}%</label>
            <Slider
              value={[volume]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Audio Buffer Status */}
      <Card>
        <CardHeader>
          <CardTitle>Audio Buffer Status & Files</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(status.soundLoadingStatus).map(([soundKey, loadingStatus]) => {
              const config = status.soundConfigs?.[soundKey];
              const fileName = config?.url?.split('/').pop() || 'unknown.wav';
              const fallbackName = config?.fallbackUrl?.split('/').pop() || 'unknown.wav';
              
              return (
                <div key={soundKey} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{soundKey}</span>
                    <span className="text-xs text-muted-foreground">
                      {fileName} → {fallbackName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {loadingStatus === 'loaded' && <Badge variant="default">Loaded</Badge>}
                    {loadingStatus === 'loading' && <Badge variant="secondary">Loading...</Badge>}
                    {loadingStatus === 'failed' && <Badge variant="destructive">Failed</Badge>}
                    {loadingStatus === 'pending' && <Badge variant="outline">Pending</Badge>}
                    
                    {soundManager.isSoundCached(soundKey) && <CheckCircle className="w-4 h-4 text-green-500" />}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sound Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Web Audio API Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(soundManager.getStatus().soundLoadingStatus).map(soundKey => (
              <Button
                key={soundKey}
                onClick={() => runSoundTest(soundKey)}
                variant="outline"
                size="sm"
                className="flex items-center justify-between"
                disabled={!soundManager.isAudioContextReady()}
              >
                <span className="truncate">{soundKey}</span>
                {testResults[soundKey] === true && <CheckCircle className="w-4 h-4 text-green-500" />}
                {testResults[soundKey] === false && <XCircle className="w-4 h-4 text-red-500" />}
                {soundManager.isSoundCached(soundKey) && <Play className="w-3 h-3 text-blue-500" />}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Diagnostics */}
      <Card>
        <CardHeader>
          <CardTitle>System Diagnostics</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div>AudioContext State: <Badge variant="outline">{status.audioContextState}</Badge></div>
          <div>Buffers Cached: {Object.values(status.soundLoadingStatus).filter(s => s === 'loaded').length}</div>
          <div>Failed Loads: {Object.values(status.soundLoadingStatus).filter(s => s === 'failed').length}</div>
          <div>System: {status.isInitialized ? 'Ready' : 'Not Ready'}</div>
          
          {status.stateChangeLog && status.stateChangeLog.length > 0 && (
            <div className="mt-4">
              <div className="font-medium mb-2">Recent Events:</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {status.stateChangeLog.slice(-5).map((log, index) => (
                  <div key={index} className="text-xs p-1 bg-muted rounded">
                    <strong>{log.action}:</strong> {log.state}
                    {log.details && <div className="text-muted-foreground">{log.details}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobile & PWA Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Platform Support
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>• <strong>Web Audio API:</strong> Modern browser compatibility</p>
          <p>• <strong>Mobile:</strong> Tap anywhere to activate audio</p>
          <p>• <strong>iOS Safari:</strong> Check silent mode and volume</p>
          <p>• <strong>PWA:</strong> Full audio support after interaction</p>
          <p>• <strong>Fallbacks:</strong> Visual feedback when audio fails</p>
          
          {/* Mobile fallback warning */}
          {Object.values(testResults).some(result => result === false) && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              <strong>Mobile Audio Issue:</strong> Your browser may be blocking sound. Try tapping 'Enable Sound' after interacting with the page.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};