import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SFX } from '@/lib/sfx/sfxManager';
import { Sound } from '@/lib/sound/soundManager';
import { isIOS, isStandalonePWA } from '@/lib/sound/platform';
import { FEATURE_SFX_DEBUG, FORCE_WEB_AUDIO } from '@/lib/sound/debug';

export default function IOSAudioDebug() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [platform, setPlatform] = useState({
    isIOS: false,
    isPWA: false,
    userAgent: '',
    forceWebAudio: false,
    debugEnabled: false
  });

  useEffect(() => {
    // Capture platform info
    setPlatform({
      isIOS: isIOS(),
      isPWA: isStandalonePWA(),
      userAgent: navigator.userAgent,
      forceWebAudio: FORCE_WEB_AUDIO,
      debugEnabled: FEATURE_SFX_DEBUG
    });

    // Intercept console.log to capture debug output
    const originalLog = console.log;
    console.log = (...args) => {
      originalLog.apply(console, args);
      if (args[0]?.includes?.('[SFX]') || args[0]?.includes?.('[SOUND]')) {
        setLogs(prev => [...prev.slice(-20), `${new Date().toLocaleTimeString()}: ${JSON.stringify(args)}`]);
      }
    };

    return () => {
      console.log = originalLog;
    };
  }, []);

  const handleUnlock = async () => {
    try {
      await SFX().unlock();
      setIsUnlocked(true);
      setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: SFX unlocked successfully`]);
    } catch (error) {
      setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: SFX unlock failed: ${error}`]);
    }
  };

  const testSFXBeep = async () => {
    const result = await SFX().play('scan_success');
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: SFX beep result: ${result}`]);
  };

  const testSFXShutter = async () => {
    const result = await SFX().play('shutter');
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: SFX shutter result: ${result}`]);
  };

  const testSoundBeep = async () => {
    await Sound.play('beep');
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: Sound beep played`]);
  };

  const testSoundShutter = async () => {
    await Sound.play('shutter');
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: Sound shutter played`]);
  };

  const clearLogs = () => setLogs([]);

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔊 iOS Safari Audio Debug
            {platform.isIOS && <Badge variant="default">iOS Detected</Badge>}
            {platform.isPWA && <Badge variant="secondary">PWA Mode</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Platform:</strong> {platform.isIOS ? 'iOS' : 'Other'}
            </div>
            <div>
              <strong>PWA:</strong> {platform.isPWA ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Force WebAudio:</strong> {platform.forceWebAudio ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Debug:</strong> {platform.debugEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground">
            <strong>User Agent:</strong> {platform.userAgent}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audio Tests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Button 
              onClick={handleUnlock} 
              variant={isUnlocked ? "default" : "secondary"}
              className="w-full"
            >
              {isUnlocked ? '✅ Unlocked' : '🔓 Unlock Audio'}
            </Button>
            
            <Button 
              onClick={testSFXBeep} 
              disabled={!isUnlocked}
              className="w-full"
            >
              🔊 SFX Beep
            </Button>
            
            <Button 
              onClick={testSFXShutter} 
              disabled={!isUnlocked}
              className="w-full"
            >
              📸 SFX Shutter
            </Button>
            
            <Button 
              onClick={testSoundBeep} 
              className="w-full"
            >
              🎵 Sound Beep
            </Button>
            
            <Button 
              onClick={testSoundShutter} 
              className="w-full"
            >
              📷 Sound Shutter
            </Button>
            
            <Button 
              onClick={clearLogs} 
              variant="outline"
              className="w-full"
            >
              🗑️ Clear Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Debug Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-black text-green-400 p-4 rounded font-mono text-xs max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet. Enable debug with VITE_SFX_DEBUG=1</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-1">{log}</div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expected Results on iOS (Ringer OFF)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="p-3 bg-green-50 rounded">
            <strong>✅ Expected Console Output:</strong>
            <pre className="text-xs mt-2 text-green-800">
{`[SOUND][ROUTE] { name: 'beep', path: 'WebAudio' }
[SFX][OSC_PARAMS] { key: 'scan_success', freq: 880, durationMs: 150, gain: 0.5, ctx: 'running' }
[SFX][PLAY_RESULT] { key: 'scan_success', ok: true }`}
            </pre>
          </div>
          
          <div className="p-3 bg-blue-50 rounded">
            <strong>🎯 Success Criteria:</strong>
            <ul className="list-disc list-inside mt-2 text-blue-800">
              <li>Beep and shutter sounds audible despite ringer switch OFF</li>
              <li>Console shows "WebAudio" routing on iOS</li>
              <li>Oscillator params show gain ≥ 0.5 and duration ≥ 150ms</li>
              <li>No HTMLAudio fallback attempts on iOS</li>
            </ul>
          </div>
          
          <div className="p-3 bg-orange-50 rounded">
            <strong>🔧 Build Instructions:</strong>
            <pre className="text-xs mt-2 text-orange-800">
{`VITE_SFX_FORCE_WEB_AUDIO=1 VITE_SFX_DEBUG=1 npm run build`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}