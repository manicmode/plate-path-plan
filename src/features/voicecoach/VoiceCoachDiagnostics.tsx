import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFeatureFlagOptimized } from "@/hooks/useFeatureFlagOptimized";
import { useMyFeatureFlags } from "@/hooks/useMyFeatureFlags";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

export function VoiceCoachDiagnostics() {
  const { enabled: killSwitchDisabled } = useFeatureFlagOptimized("voice_coach_disabled");
  const { enabled: mvpEnabled } = useFeatureFlagOptimized("voice_coach_mvp");
  const { flags, flagsMap, loading: swrLoading } = useMyFeatureFlags();
  
  const [rpcResult, setRpcResult] = useState<boolean | null>(null);
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<string>("");
  const [micPermission, setMicPermission] = useState<string>("checking...");
  const [micTestResult, setMicTestResult] = useState<string>("");
  const [deviceCount, setDeviceCount] = useState<number>(0);
  const [isTestingMic, setIsTestingMic] = useState(false);

  // Environment checks
  const isSecureContext = typeof window !== 'undefined' ? window.isSecureContext : false;
  const protocol = typeof window !== 'undefined' ? window.location.protocol : '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const inIframe = typeof window !== 'undefined' && window.top !== window.self;
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const platform = typeof navigator !== 'undefined' ? navigator.platform : '';

  // Display mode detection
  const [displayMode, setDisplayMode] = useState<string>("unknown");
  const [mediaDevicesSupported, setMediaDevicesSupported] = useState(false);
  const [getUserMediaSupported, setGetUserMediaSupported] = useState(false);

  useEffect(() => {
    console.info('[VC-DIAG] Diagnostics component mounted');
    
    // Check display mode
    if (typeof window !== 'undefined') {
      const standalone = window.matchMedia('(display-mode: standalone)').matches;
      setDisplayMode(standalone ? 'standalone' : 'browser');
    }

    // Check media device support
    setMediaDevicesSupported(!!navigator.mediaDevices);
    setGetUserMediaSupported(!!navigator.mediaDevices?.getUserMedia);

    // Check microphone permission if supported
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      navigator.permissions.query({ name: 'microphone' as PermissionName })
        .then(result => {
          setMicPermission(result.state);
          console.info('[VC-DIAG] Mic permission:', result.state);
        })
        .catch(() => {
          setMicPermission('unsupported');
        });
    } else {
      setMicPermission('unsupported');
    }

    // Test RPC call
    testRpcCall();
    
    // Count audio devices
    countAudioDevices();

    // Update fetch time
    setLastFetchTime(new Date().toISOString());
  }, []);

  const testRpcCall = async () => {
    try {
      const { data, error } = await supabase.rpc('is_feature_enabled', { 
        feature_key: 'voice_coach_mvp' 
      });
      if (error) throw error;
      setRpcResult(data);
      setRpcError(null);
      console.info('[VC-DIAG] RPC result:', data);
    } catch (error: any) {
      setRpcError(error.message);
      console.error('[VC-DIAG] RPC error:', error);
    }
  };

  const countAudioDevices = async () => {
    try {
      if (navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(d => d.kind === 'audioinput');
        setDeviceCount(audioInputs.length);
        console.info('[VC-DIAG] Audio input devices:', audioInputs.length);
      }
    } catch (error: any) {
      console.error('[VC-DIAG] Device enumeration error:', error);
    }
  };

  const runMicTest = async () => {
    setIsTestingMic(true);
    setMicTestResult("Testing...");
    
    try {
      console.info('[VC-DIAG] Starting mic test');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Count tracks
      const audioTracks = stream.getAudioTracks();
      const result = `✅ Stream acquired! ${audioTracks.length} audio track(s)`;
      setMicTestResult(result);
      console.info('[VC-DIAG] Mic test success:', audioTracks.length, 'tracks');
      
      // Stop the stream
      stream.getTracks().forEach(track => track.stop());
      
      // Recount devices now that we have permission
      await countAudioDevices();
      
      notify.success("Microphone test successful!");
    } catch (error: any) {
      const result = `❌ Error: ${error.name} - ${error.message}`;
      setMicTestResult(result);
      console.error('[VC-DIAG] Mic test failed:', error.name, error.message);
      notify.error(`Mic test failed: ${error.name}`);
    } finally {
      setIsTestingMic(false);
    }
  };

  return (
    <Card className="mb-4 bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          🔍 Voice Coach Diagnostics
          <Badge variant="outline" className="text-xs">Debug Mode</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        {/* Feature Flags */}
        <div>
          <h4 className="font-semibold mb-2">🏳️ Feature Flags</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>killSwitch: <Badge variant={killSwitchDisabled ? "destructive" : "secondary"}>{String(killSwitchDisabled)}</Badge></div>
            <div>mvpEnabled: <Badge variant={mvpEnabled ? "default" : "secondary"}>{String(mvpEnabled)}</Badge></div>
            <div>RPC Result: <Badge variant={rpcResult ? "default" : "secondary"}>{rpcResult !== null ? String(rpcResult) : "loading..."}</Badge></div>
            <div>SWR Loading: <Badge variant={swrLoading ? "destructive" : "secondary"}>{String(swrLoading)}</Badge></div>
          </div>
          {rpcError && <div className="text-red-600 text-xs mt-1">RPC Error: {rpcError}</div>}
          <div className="text-gray-600 text-xs mt-1">Last fetch: {lastFetchTime}</div>
          <div className="text-xs mt-1">Flags in cache: {Object.keys(flagsMap).length}</div>
        </div>

        {/* Environment */}
        <div>
          <h4 className="font-semibold mb-2">🌍 Environment</h4>
          <div className="grid grid-cols-1 gap-1">
            <div>Secure Context: <Badge variant={isSecureContext ? "default" : "destructive"}>{String(isSecureContext)}</Badge></div>
            <div>Protocol: {protocol}</div>
            <div>Origin: {origin}</div>
            <div>In iFrame: <Badge variant={inIframe ? "destructive" : "default"}>{String(inIframe)}</Badge></div>
            <div>Display Mode: {displayMode}</div>
            <div className="text-xs text-gray-600 break-all">UA: {userAgent.slice(0, 60)}...</div>
            <div>Platform: {platform}</div>
          </div>
        </div>

        {/* Media Capabilities */}
        <div>
          <h4 className="font-semibold mb-2">🎤 Media Capabilities</h4>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>mediaDevices: <Badge variant={mediaDevicesSupported ? "default" : "destructive"}>{String(mediaDevicesSupported)}</Badge></div>
            <div>getUserMedia: <Badge variant={getUserMediaSupported ? "default" : "destructive"}>{String(getUserMediaSupported)}</Badge></div>
            <div>Mic Permission: <Badge variant={micPermission === 'granted' ? "default" : micPermission === 'denied' ? "destructive" : "secondary"}>{micPermission}</Badge></div>
            <div>Audio Devices: {deviceCount}</div>
          </div>
          
          <Button 
            size="sm" 
            onClick={runMicTest}
            disabled={isTestingMic || !getUserMediaSupported}
            className="w-full"
          >
            {isTestingMic ? "Testing..." : "Run Mic Test"}
          </Button>
          
          {micTestResult && (
            <div className={`text-xs mt-2 p-2 rounded ${
              micTestResult.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {micTestResult}
            </div>
          )}
        </div>

        {/* Routing Info */}
        <div>
          <h4 className="font-semibold mb-2">🧭 Routing</h4>
          <div className="text-xs">
            <div>Current path: {typeof window !== 'undefined' ? window.location.pathname + window.location.search : ''}</div>
            <div>Referrer: {typeof document !== 'undefined' ? document.referrer || 'none' : ''}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}