import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, AlertTriangle, ExternalLink } from "lucide-react";
import { useFeatureFlagOptimized } from "@/hooks/useFeatureFlagOptimized";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { handleToolCall } from "./agentTools";

type CallState = "idle" | "connecting" | "live";

export default function VoiceAgentPage() {
  const { enabled: killSwitchDisabled } = useFeatureFlagOptimized("voice_coach_disabled");
  const { enabled: mvpEnabled } = useFeatureFlagOptimized("voice_coach_mvp");
  const { isAdmin } = useAdminRole();

  const [callState, setCallState] = useState<CallState>("idle");
  const [micDevice, setMicDevice] = useState<string>("");
  const [lastError, setLastError] = useState<string>("");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Feature gating: allow if not kill-switched AND (admin OR MVP enabled) AND env enabled
  const envEnabled = import.meta.env.VITE_VOICE_AGENT_ENABLED !== 'false';
  const isAllowed = !killSwitchDisabled && (isAdmin || mvpEnabled) && envEnabled;

  // Debug mode from URL params
  const debugMode = new URLSearchParams(window.location.search).get('debug') === '1';

  // Debug logging helper
  const debugLog = (message: string, data?: any) => {
    if (debugMode) {
      console.debug(`[VoiceAgent] ${message}`, data || '');
    }
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      handleEnd();
    };
  }, []);

  const handleStart = async () => {
    try {
      setCallState("connecting");
      setLastError("");

      debugLog('start', 'Starting voice session');

      // Step 1: Get user media (microphone)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;

      // Get microphone device label for debug
      const audioTrack = stream.getAudioTracks()[0];
      setMicDevice(audioTrack.label || "Unknown microphone");
      debugLog('microphone-access', { label: audioTrack.label });

      // Step 2: Create RTCPeerConnection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Step 2.5: Set up data channel for tool calls
      const toolsChannel = pc.createDataChannel("tools", { ordered: true });
      
      toolsChannel.onopen = () => {
        debugLog('dc-open', 'Tools data channel opened');
      };

      toolsChannel.onmessage = async (event) => {
        debugLog('dc-message', 'Tool call received');
        
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === "tool_call") {
            const { name, args, id } = message;
            
            // Handle tool call
            const result = await handleToolCall(name, args);
            
            // Send response back
            const response = {
              type: "tool_result",
              id: id,
              ok: result.ok,
              message: result.message
            };
            
            if (toolsChannel.readyState === 'open') {
              toolsChannel.send(JSON.stringify(response));
              debugLog('tool-result-sent', { id, ok: result.ok });
            }
          }
        } catch (error) {
          debugLog('tool-call-error', error);
          
          // Send error response if we can parse the ID
          try {
            const message = JSON.parse(event.data);
            if (message.id) {
              const errorResponse = {
                type: "tool_result", 
                id: message.id,
                ok: false,
                message: "Failed to process tool call"
              };
              
              if (toolsChannel.readyState === 'open') {
                toolsChannel.send(JSON.stringify(errorResponse));
              }
            }
          } catch (parseError) {
            debugLog('error-response-failed', parseError);
          }
        }
      };

      toolsChannel.onerror = (error) => {
        debugLog('dc-error', error);
      };

      // Step 3: Add local track
      pc.addTrack(audioTrack, stream);
      debugLog('local-track-added', 'Audio track added to peer connection');

      // Step 4: Handle remote audio stream
      pc.ontrack = (event) => {
        debugLog('ontrack', 'Remote audio track received');
        if (audioRef.current && event.streams[0]) {
          audioRef.current.srcObject = event.streams[0];
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        debugLog('connection-state-change', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setCallState("live");
          notify.success("Voice chat connected!");
        } else if (pc.connectionState === 'failed') {
          setLastError("WebRTC connection failed");
          handleEnd();
        }
      };

      // Step 5: Create SDP offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true
      });
      await pc.setLocalDescription(offer);
      debugLog('sdp-offer-created', 'SDP offer created');

      // Step 6: Get ephemeral token from our edge function
      debugLog('token-request-start', 'Fetching ephemeral token');
      const { data: tokenResponse, error: tokenError } = await supabase.functions.invoke('realtime-token');

      if (tokenError) {
        throw new Error(`Token fetch failed: ${tokenError.message}`);
      }

      if (!tokenResponse?.ok || !tokenResponse?.session?.client_secret?.value) {
        throw new Error("Failed to get ephemeral token");
      }

      const ephemeralToken = tokenResponse.session.client_secret.value;
      debugLog('token-received', 'Ephemeral token received');

      // Step 7: POST SDP offer to OpenAI Realtime API
      debugLog('realtime-api-connect', 'Connecting to OpenAI Realtime API');
      const realtimeResponse = await fetch(
        "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
        {
          method: "POST",
          body: offer.sdp,
          headers: {
            "Authorization": `Bearer ${ephemeralToken}`,
            "Content-Type": "application/sdp"
          },
        }
      );

      if (!realtimeResponse.ok) {
        const errorText = await realtimeResponse.text();
        throw new Error(`OpenAI API error: ${realtimeResponse.status} - ${errorText}`);
      }

      // Step 8: Set remote description with answer
      const answerSdp = await realtimeResponse.text();
      const answer = {
        type: "answer" as RTCSdpType,
        sdp: answerSdp,
      };
      
      await pc.setRemoteDescription(answer);
      debugLog('answer-received', 'Remote description set, WebRTC connection establishing');

    } catch (error) {
      debugLog('start-error', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setLastError(errorMsg);
      
      if (errorMsg.includes('Permission denied') || errorMsg.includes('NotAllowedError')) {
        notify.error('Microphone access denied. Please allow microphone access and try again.');
      } else if (errorMsg.includes('Token fetch failed')) {
        notify.error('Unable to connect to voice service. Please try again.');
      } else if (errorMsg.includes('OpenAI API error')) {
        notify.error('Voice service temporarily unavailable. Please try again later.');
      } else {
        notify.error(`Voice chat failed: ${errorMsg}`);
      }
      
      handleEnd();
    }
  };

  const handleEnd = () => {
    debugLog('end', 'Ending voice session');
    
    // Stop media stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        debugLog('track-stopped', track.kind);
      });
      streamRef.current = null;
    }

    // Close peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
      debugLog('peer-connection-closed', 'Peer connection closed');
    }

    // Clear audio element
    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }

    setCallState("idle");
    setMicDevice("");
    notify.info("Voice chat ended");
  };

  if (!isAllowed) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Voice Agent (Beta)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-3 bg-muted rounded-lg border text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {!envEnabled ? "Voice Agent Disabled" : "Access Restricted"}
                </span>
              </div>
              <div className="text-sm text-muted-foreground mb-4">
                {!envEnabled 
                  ? "Voice Agent is currently disabled by environment configuration."
                  : "Voice Agent is currently in beta and access is limited."
                }
              </div>
              {isAdmin && envEnabled && (
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href="/feature-flags" 
                    className="inline-flex items-center gap-1"
                  >
                    Manage Access <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              )}
              {!isAdmin && envEnabled && (
                <div className="text-xs text-muted-foreground">
                  Contact your administrator for access
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice Agent (Beta)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Instructions */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Tap Start, speak naturally. The coach will talk back. Tap End to hang up.
            </p>
          </div>

          {/* Main Action Button */}
          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={callState === "idle" ? handleStart : handleEnd}
              disabled={callState === "connecting"}
              variant={callState === "live" ? "destructive" : "default"}
              className={`w-48 h-16 text-lg ${
                callState === "live" 
                  ? "animate-pulse" 
                  : callState === "connecting" 
                  ? "opacity-50" 
                  : ""
              }`}
            >
              {callState === "idle" && (
                <>
                  <Mic className="h-6 w-6 mr-2" />
                  Start
                </>
              )}
              {callState === "connecting" && (
                <>
                  <Mic className="h-6 w-6 mr-2 animate-pulse" />
                  Connecting...
                </>
              )}
              {callState === "live" && (
                <>
                  <MicOff className="h-6 w-6 mr-2" />
                  End
                </>
              )}
            </Button>
          </div>

          {/* Hidden Audio Element for Assistant Voice */}
          <audio
            ref={audioRef}
            id="assistant-audio"
            autoPlay
            style={{ display: 'none' }}
          />

          {/* Debug Panel */}
          {debugMode && (
            <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1 font-mono">
              <div className="font-semibold text-sm mb-2">Debug Info:</div>
              <div>Call State: {callState}</div>
              <div>Mic Device: {micDevice || 'None'}</div>
              <div>Last Error: {lastError || 'None'}</div>
              <div>PC State: {pcRef.current?.connectionState || 'None'}</div>
              <div>Stream Active: {streamRef.current?.active ? 'Yes' : 'No'}</div>
              <div>Audio Tracks: {streamRef.current?.getAudioTracks().length || 0}</div>
            </div>
          )}

          {/* Error Display */}
          {lastError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-lg text-sm">
              <div className="font-medium">Error:</div>
              <div>{lastError}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}