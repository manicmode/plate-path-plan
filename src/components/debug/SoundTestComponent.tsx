import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { useSound } from '@/contexts/SoundContext';
import { Volume2, VolumeX, Play, Settings } from 'lucide-react';

export const SoundTestComponent: React.FC = () => {
  const {
    isEnabled,
    setSoundEnabled,
    playSound,
    getAudioStatus,
    forceInitialize,
    playAIThought,
    playBodyScanCapture,
    playChallengeWin,
    playFoodLogConfirm,
    playFriendAdded,
    playGoalHit,
    playHealthScanCapture,
    playProgressUpdate,
    playReminderChime,
    setVolume
  } = useSound();

  const audioStatus = getAudioStatus();

  const soundTests = [
    { name: 'AI Thought', key: 'ai_thought', action: playAIThought, description: 'AI coach thinking sound' },
    { name: 'Body Scan Capture', key: 'body_scan_camera', action: playBodyScanCapture, description: 'Body scan photo capture' },
    { name: 'Challenge Win', key: 'challenge_win', action: playChallengeWin, description: 'Challenge completion celebration' },
    { name: 'Food Log Confirm', key: 'food_log_confirm', action: playFoodLogConfirm, description: 'Food logging confirmation' },
    { name: 'Friend Added', key: 'friend_added', action: playFriendAdded, description: 'New friend connection' },
    { name: 'Goal Hit', key: 'goal_hit', action: playGoalHit, description: 'Daily goal achievement' },
    { name: 'Health Scan Capture', key: 'health_scan_capture', action: playHealthScanCapture, description: 'Health scan photo capture' },
    { name: 'Progress Update', key: 'progress_update', action: playProgressUpdate, description: 'Progress milestone reached' },
    { name: 'Reminder Chime', key: 'reminder_chime', action: playReminderChime, description: 'Notification reminder' }
  ];

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0] / 100);
  };

  const getStatusBadgeColor = (status: string | undefined) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'suspended': return 'bg-yellow-500';
      case 'closed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          Sound System Test
        </CardTitle>
        <CardDescription>
          Test and debug the app's sound effects system
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* System Status */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Settings className="h-4 w-4" />
            System Status
          </h3>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span>Sound Enabled:</span>
              <Badge variant={audioStatus.enabled ? 'default' : 'secondary'}>
                {audioStatus.enabled ? 'Yes' : 'No'}
              </Badge>
            </div>
            
            <div className="flex justify-between">
              <span>User Interaction:</span>
              <Badge variant={audioStatus.hasUserInteracted ? 'default' : 'secondary'}>
                {audioStatus.hasUserInteracted ? 'Yes' : 'No'}
              </Badge>
            </div>
            
            <div className="flex justify-between">
              <span>Audio Context:</span>
              <Badge className={getStatusBadgeColor(audioStatus.audioContextState)}>
                {audioStatus.audioContextState || 'Not Created'}
              </Badge>
            </div>
            
            <div className="flex justify-between">
              <span>Cached Sounds:</span>
              <Badge variant="outline">{audioStatus.cachedSounds}</Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Controls */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Controls</h3>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Enable Sounds</span>
            <Switch
              checked={isEnabled}
              onCheckedChange={setSoundEnabled}
            />
          </div>

          <div className="space-y-2">
            <span className="text-sm">Volume</span>
            <Slider
              value={[70]}
              onValueChange={handleVolumeChange}
              max={100}
              min={0}
              step={5}
              className="w-full"
            />
          </div>

          <Button
            onClick={forceInitialize}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Force Initialize Audio System
          </Button>
        </div>

        <Separator />

        {/* Sound Tests */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Sound Tests</h3>
          
          <div className="grid gap-2">
            {soundTests.map((sound) => (
              <div key={sound.key} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex-1">
                  <div className="font-medium text-sm">{sound.name}</div>
                  <div className="text-xs text-muted-foreground">{sound.description}</div>
                </div>
                <Button
                  onClick={sound.action}
                  variant="outline"
                  size="sm"
                  disabled={!isEnabled}
                  className="ml-2"
                >
                  <Play className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground">
          <strong>Note:</strong> On mobile devices, sounds may not play until after the first user interaction. 
          If sounds aren't working, try tapping "Force Initialize" after interacting with the page.
        </div>
      </CardContent>
    </Card>
  );
};