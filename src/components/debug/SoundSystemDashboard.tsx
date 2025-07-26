import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useSound } from '@/contexts/SoundContext';
import { soundManager } from '@/utils/SoundManager';
import { toast } from 'sonner';
import { Play, Volume2, VolumeX, RefreshCw, CheckCircle, XCircle, AlertTriangle, Smartphone } from 'lucide-react';

interface SoundSystemDashboardProps {
  className?: string;
}

export const SoundSystemDashboard: React.FC<SoundSystemDashboardProps> = ({ className }) => {
  const {
    isEnabled,
    setSoundEnabled,
    playSound,
    getAudioStatus,
    forceInitialize,
    playFoodLogConfirm,
    setVolume
  } = useSound();

  const [status, setStatus] = useState(getAudioStatus());
  const [volume, setVolumeState] = useState(70);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Update status every second
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getAudioStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, [getAudioStatus]);

  const handleVolumeChange = (newVolume: number) => {
    setVolumeState(newVolume);
    setVolume(newVolume / 100);
  };

  const runSoundTest = async (soundKey: string) => {
    console.log(`🔊 [Dashboard] Testing sound: ${soundKey}`);
    try {
      await playSound(soundKey);
      setTestResults(prev => ({ ...prev, [soundKey]: true }));
      toast.success(`✅ ${soundKey} test passed`);
      return true;
    } catch (error) {
      console.error(`🔊 [Dashboard] Test failed for ${soundKey}:`, error);
      setTestResults(prev => ({ ...prev, [soundKey]: false }));
      toast.error(`❌ ${soundKey} test failed`);
      return false;
    }
  };

  const runAllTests = async () => {
    setIsRunningTests(true);
    setTestResults({});
    
    const soundsToTest = [
      'food_log_confirm',
      'goal_hit',
      'challenge_win',
      'ai_thought',
      'progress_update'
    ];

    console.log('🔊 [Dashboard] === RUNNING COMPREHENSIVE SOUND TESTS ===');
    
    for (const sound of soundsToTest) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Delay between tests
      await runSoundTest(sound);
    }
    
    setIsRunningTests(false);
    console.log('🔊 [Dashboard] === SOUND TESTS COMPLETED ===');
  };

  const getStatusBadgeColor = (state?: string) => {
    switch (state) {
      case 'running': return 'bg-green-500';
      case 'suspended': return 'bg-yellow-500';
      case 'closed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = () => {
    if (!status.enabled) return <VolumeX className="h-4 w-4" />;
    if (!status.hasUserInteracted) return <AlertTriangle className="h-4 w-4" />;
    if (status.audioContextState === 'running') return <CheckCircle className="h-4 w-4" />;
    return <XCircle className="h-4 w-4" />;
  };

  const getSystemHealth = () => {
    if (!status.enabled) return { level: 0, text: 'Disabled', color: 'bg-gray-500' };
    if (!status.hasUserInteracted) return { level: 25, text: 'Waiting for User', color: 'bg-yellow-500' };
    if (status.audioContextState === 'suspended') return { level: 50, text: 'Suspended', color: 'bg-orange-500' };
    if (status.audioContextState === 'running') return { level: 100, text: 'Ready', color: 'bg-green-500' };
    return { level: 75, text: 'Initializing', color: 'bg-blue-500' };
  };

  const health = getSystemHealth();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* System Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Sound System Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>System Health</span>
            <div className="flex items-center gap-2">
              <Progress value={health.level} className="w-32" />
              <Badge className={health.color}>{health.text}</Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span>Enabled:</span>
              <Badge variant={status.enabled ? 'default' : 'destructive'}>
                {status.enabled ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>User Interaction:</span>
              <Badge variant={status.hasUserInteracted ? 'default' : 'destructive'}>
                {status.hasUserInteracted ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Audio Context:</span>
              <Badge className={getStatusBadgeColor(status.audioContextState)}>
                {status.audioContextState || 'N/A'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Cached Sounds:</span>
              <Badge>{status.cachedSounds}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Sound Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={() => setSoundEnabled(!isEnabled)} 
              variant={isEnabled ? 'destructive' : 'default'}
            >
              {isEnabled ? <VolumeX className="h-4 w-4 mr-2" /> : <Volume2 className="h-4 w-4 mr-2" />}
              {isEnabled ? 'Disable' : 'Enable'} Sounds
            </Button>
            
            <Button onClick={forceInitialize} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Force Initialize
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Volume: {volume}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Food Log Sound Test */}
      <Card>
        <CardHeader>
          <CardTitle>🍽️ Food Log Sound Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Test the primary food logging sound that should play when logging food from any route.
            </p>
            
            <Button 
              onClick={() => runSoundTest('food_log_confirm')} 
              className="w-full"
              size="lg"
            >
              <Play className="h-4 w-4 mr-2" />
              Test Food Log Confirm Sound
            </Button>

            <Button 
              onClick={playFoodLogConfirm} 
              variant="outline"
              className="w-full"
            >
              Test via Context Hook
            </Button>

            {testResults['food_log_confirm'] !== undefined && (
              <Badge 
                variant={testResults['food_log_confirm'] ? 'default' : 'destructive'}
                className="w-full justify-center"
              >
                {testResults['food_log_confirm'] ? '✅ Test Passed' : '❌ Test Failed'}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comprehensive Test Suite */}
      <Card>
        <CardHeader>
          <CardTitle>🧪 Comprehensive Test Suite</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={runAllTests} 
              disabled={isRunningTests}
              className="w-full"
              size="lg"
            >
              {isRunningTests ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              {isRunningTests ? 'Running Tests...' : 'Run All Sound Tests'}
            </Button>

            {Object.keys(testResults).length > 0 && (
              <div className="space-y-2">
                <Separator />
                <h4 className="font-medium">Test Results:</h4>
                {Object.entries(testResults).map(([sound, passed]) => (
                  <div key={sound} className="flex justify-between items-center">
                    <span className="text-sm">{sound}</span>
                    <Badge variant={passed ? 'default' : 'destructive'}>
                      {passed ? '✅ Pass' : '❌ Fail'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mobile Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Mobile Device Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>• Tap anywhere on the screen to enable audio</p>
            <p>• iOS Safari may require multiple interactions</p>
            <p>• Use headphones for best experience</p>
            <p>• Check device volume and sound settings</p>
            <p>• PWA mode may have different audio behavior</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};