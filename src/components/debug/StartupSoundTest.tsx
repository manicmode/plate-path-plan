import React from 'react';
import { useSound } from '@/contexts/SoundContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Volume2, VolumeX, Play } from 'lucide-react';

export const StartupSoundTest: React.FC = () => {
  const { playStartupChime, isEnabled, setSoundEnabled, getAudioStatus } = useSound();
  
  const audioStatus = getAudioStatus();
  
  const handleTestSound = async () => {
    try {
      console.log('🔊 Testing startup chime...');
      await playStartupChime();
      console.log('🔊 Startup chime played successfully');
    } catch (error) {
      console.error('🔊 Failed to play startup chime:', error);
      alert(`Sound failed: ${error}`);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Startup Sound Debug
        </CardTitle>
        <CardDescription>
          Test the splash screen startup chime
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sound Status */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Sound Enabled:</span>
            <span className={isEnabled ? 'text-green-600' : 'text-red-600'}>
              {isEnabled ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Audio Context:</span>
            <span className={audioStatus.audioContextState === 'running' ? 'text-green-600' : 'text-yellow-600'}>
              {audioStatus.audioContextState}
            </span>
          </div>
          <div className="flex justify-between">
            <span>User Interaction:</span>
            <span className={audioStatus.hasUserInteracted ? 'text-green-600' : 'text-red-600'}>
              {audioStatus.hasUserInteracted ? 'Yes' : 'No'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-2">
          <Button
            onClick={() => setSoundEnabled(!isEnabled)}
            variant="outline"
            className="w-full"
          >
            {isEnabled ? <VolumeX className="w-4 h-4 mr-2" /> : <Volume2 className="w-4 h-4 mr-2" />}
            {isEnabled ? 'Disable' : 'Enable'} Sounds
          </Button>
          
          <Button
            onClick={handleTestSound}
            className="w-full"
            disabled={!isEnabled}
          >
            <Play className="w-4 h-4 mr-2" />
            Test Startup Chime
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>Missing Sound File:</strong></p>
          <p>You need to add a real audio file at:</p>
          <code className="bg-muted px-2 py-1 rounded text-xs">
            public/sounds/startup_chime.wav
          </code>
          <p>Current file is just a placeholder. Replace it with a 2-3 second ambient chime sound.</p>
        </div>
      </CardContent>
    </Card>
  );
};