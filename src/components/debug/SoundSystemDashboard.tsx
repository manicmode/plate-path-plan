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

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(soundManager.getStatus());
    }, 1000);
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
            <div>Loaded Sounds: {status.loadedSounds}/{status.totalSounds}</div>
            <div>AudioContext: {status.audioContextState}</div>
            <div>User Interaction: {status.hasUserInteracted ? '✅' : '❌'}</div>
          </div>
          
          <Progress value={soundManager.getHealthScore()} className="w-full" />
          
          {status.lastError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
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

      {/* Sound Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Sound Tests</CardTitle>
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
              >
                <span className="truncate">{soundKey}</span>
                {testResults[soundKey] === true && <CheckCircle className="w-4 h-4 text-green-500" />}
                {testResults[soundKey] === false && <XCircle className="w-4 h-4 text-red-500" />}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mobile Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Mobile Device Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>• Tap anywhere on the screen to activate audio</p>
          <p>• Check device volume settings</p>
          <p>• iOS: Ensure silent mode is off</p>
          <p>• PWA: Sounds work better in fullscreen mode</p>
        </CardContent>
      </Card>
    </div>
  );
};