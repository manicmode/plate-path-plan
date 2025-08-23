import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Mic, MicOff, AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import { useFeatureFlagOptimized } from "@/hooks/useFeatureFlagOptimized";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { handleToolCall as handleLegacyToolCall } from "./agentTools";
import IdeaStarters from "./IdeaStarters";

type CallState = "idle" | "connecting" | "live";
type ToolStatus = { isActive: boolean; toolName?: string; args?: any; startTime?: number };

export default function VoiceAgentPage() {
  const { enabled: killSwitchDisabled } = useFeatureFlagOptimized("voice_coach_disabled");
  const { enabled: mvpEnabled } = useFeatureFlagOptimized("voice_coach_mvp");
  const { isAdmin } = useAdminRole();

  const [callState, setCallState] = useState<CallState>("idle");
  const [micDevice, setMicDevice] = useState<string>("");
  const [lastError, setLastError] = useState<string>("");
  const [toolStatus, setToolStatus] = useState<ToolStatus>({ isActive: false });
  const [confirmationSoundEnabled, setConfirmationSoundEnabled] = useState(() => {
    return localStorage.getItem('voice-confirmation-sound') !== 'false';
  });

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const eventsChannelRef = useRef<RTCDataChannel | null>(null);
  const toolsChannelRef = useRef<RTCDataChannel | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Buffer for accumulating function call arguments
  const functionCallBufferRef = useRef<Map<string, string>>(new Map());
  
  // Confirmation latch (client-side safety net)
  const pendingActionRef = useRef<{ tool: string; args: any; expiresAt: number } | null>(null);
  
  // Define tools that should be available on every response
  const getTools = () => [
    {
      type: "function",
      name: "log_water",
      description: "Log water intake. Tell the user you are logging their water.",
      parameters: {
        type: "object",
        properties: {
          amount_ml: { type: "number", description: "Amount in milliliters" },
          amount_oz: { type: "number", description: "Amount in fluid ounces" },
          name: { type: "string", description: "Optional description" },
          when: { type: "string", format: "date-time", description: "When consumed (ISO datetime)" }
        }
      }
    },
    {
      type: "function", 
      name: "log_meal",
      description: "Log a meal or food intake. Tell the user you are logging their meal.",
      parameters: {
        type: "object",
        properties: {
          meal_text: { type: "string", description: "Description of the meal or food" },
          when: { type: "string", format: "date-time", description: "When eaten (ISO datetime)" }
        },
        required: ["meal_text"]
      }
    },
    {
      type: "function",
      name: "log_workout", 
      description: "Log exercise or workout activity. Tell the user you are logging their workout.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "Summary of the workout" },
          when: { type: "string", format: "date-time", description: "When performed (ISO datetime)" }
        },
        required: ["summary"]
      }
    },
    {
      type: "function",
      name: "set_goal",
      description: "Set a health goal. Tell the user you are setting their goal.",
      parameters: {
        type: "object", 
        properties: {
          name: { 
            type: "string", 
            enum: ["protein", "calories", "steps", "water_ml"],
            description: "Type of goal to set"
          },
          value: { type: "number", description: "Target value for the goal" }
        },
        required: ["name", "value"]
      }
    }
  ];
  
  // Check if text is an affirmative response
  const isAffirmativeResponse = (text: string): boolean => {
    const lowerText = text.toLowerCase().trim();
    const affirmatives = [
      'yes', 'yeah', 'yep', 'yup', 'sure', 'okay', 'ok', 'do it', 
      'please', 'log it', 'correct', 'right', 'exactly', 'that\'s right',
      'go ahead', 'proceed', 'confirm', 'absolutely', 'definitely'
    ];
    
    return affirmatives.some(word => 
      lowerText === word || 
      lowerText.startsWith(word + ' ') || 
      lowerText.startsWith(word + ',') ||
      lowerText.endsWith(' ' + word) ||
      lowerText.includes(' ' + word + ' ')
    );
  };
  
  // Initialize AudioContext for confirmation sounds
  const initializeAudioContext = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  };

  // Play confirmation earcon (200ms sine sweep with fade)
  const playEarcon = async () => {
    if (!confirmationSoundEnabled) return;
    
    try {
      await initializeAudioContext();
      const ctx = audioContextRef.current!;
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Sine sweep from 800Hz to 1200Hz over 200ms
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.2);
      
      // Envelope: quick attack, gentle release
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
      
    } catch (error) {
      console.warn('Failed to play confirmation earcon:', error);
    }
  };
  
  // Handle confirmation sound toggle
  const handleConfirmationSoundToggle = (enabled: boolean) => {
    setConfirmationSoundEnabled(enabled);
    localStorage.setItem('voice-confirmation-sound', String(enabled));
  };
  
  // Format tool status message
  const formatToolStatusMessage = (toolName: string, args: any): string => {
    switch (toolName) {
      case 'log_water':
        const amount = args.amount_ml;
        const unit = amount > 500 ? `${Math.round(amount)}ml` : `${Math.round(amount * 0.033814)}oz`;
        return `Logging ${unit} water...`;
      case 'log_meal':
        return `Logging meal...`;
      case 'log_workout':
        return `Logging workout...`;
      case 'set_goal':
        return `Setting goal...`;
      default:
        return `Processing ${toolName}...`;
    }
  };

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

      // Initialize AudioContext on first user interaction
      await initializeAudioContext();

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
      dataChannelRef.current = toolsChannel;
      toolsChannelRef.current = toolsChannel;

      // Step 2.6: Set up events data channel for realtime communication
      const eventsChannel = pc.createDataChannel("oai-events", { ordered: true });
      eventsChannelRef.current = eventsChannel;
      
      eventsChannel.onopen = () => {
        debugLog('events-dc-open', 'Events data channel opened');
        console.info("[Agent] events datachannel open");
      };
      
      eventsChannel.onclose = () => {
        debugLog('events-dc-close', 'Events data channel closed');
        console.info("[Agent] events datachannel closed");
      };
      
      eventsChannel.onerror = (error) => {
        debugLog('events-dc-error', 'Events data channel error');
        console.error("[Agent] events datachannel error", error);
      };

      // Handle OpenAI Realtime API events
      eventsChannel.onmessage = (event) => {
        handleRealtimeEvent(event);
      };
      
      toolsChannel.onopen = () => {
        debugLog('tools-dc-open', 'Tools data channel opened');
        console.info("[Agent] tools datachannel open");
      };
      
      toolsChannel.onclose = () => {
        debugLog('tools-dc-close', 'Tools data channel closed');
        console.info("[Agent] tools datachannel closed");
      };
      
      toolsChannel.onerror = (error) => {
        debugLog('tools-dc-error', 'Tools data channel error');
        console.error("[Agent] tools datachannel error", error);
      };

      toolsChannel.onmessage = async (event) => {
        debugLog('dc-message', 'Tool call received');
        
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === "tool_call") {
            const { name, args, id } = message;
            
            // Handle tool call based on tool type
            let result;
            
            // Read-only data tools (use agent-tools endpoint)
            const readOnlyTools = ['get_week_summary', 'get_trends', 'get_last_meal', 'get_last_workout', 'get_goals'];
            
            if (readOnlyTools.includes(name)) {
              result = await handleAgentToolCall(name, args);
            } else {
              // Legacy write tools (use existing handleLegacyToolCall)
              result = await handleLegacyToolCall(name, args);
            }
            
            // Send response back
            const response = {
              type: "tool_result",
              id: id,
              ok: result.ok,
              message: result.message || result.data
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
        console.info("[Agent] audio: first frame received");
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

      // Step 6: Get ephemeral token from our edge function (with auth)
      debugLog('token-request-start', 'Fetching ephemeral token');
      const { data: tokenResponse, error: tokenError } = await supabase.functions.invoke('realtime-token', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      console.info("[Agent] token fetch", tokenResponse ? 200 : (tokenError ? 'error' : 'unknown'));

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

    // Clear data channel references
    dataChannelRef.current = null;
    eventsChannelRef.current = null;
    toolsChannelRef.current = null;
    
    // Clear function call buffer
    functionCallBufferRef.current.clear();

    // Clear audio element
    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }

    setCallState("idle");
    setMicDevice("");
    notify.info("Voice chat ended");
  };

  // Helper function for read-only agent tools
  const handleAgentToolCall = async (toolName: string, args: any) => {
    const timeoutMs = 10000; // 10 second timeout
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      if (!accessToken) {
        throw new Error('No authentication token available');
      }
      
      const { data, error } = await supabase.functions.invoke('agent-tools', {
        body: { tool: toolName, args },
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      clearTimeout(timeoutId);
      
      if (error) throw error;
      
      if (!data?.ok) {
        throw new Error(data?.message || 'Tool call failed');
      }
      
      return {
        ok: true,
        message: JSON.stringify(data.data),
        data: data.data
      };
      
    } catch (error) {
      console.error(`[VoiceAgent] Tool call ${toolName} failed:`, error);
      
      if (error.name === 'AbortError') {
        return {
          ok: false,
          message: "I'm having trouble getting that information right now. Could you try asking again?"
        };
      }
      
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Sorry, I couldn't get that information."
      };
    }
  };

  // Connection management functions
  const ensureConnected = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout after 10 seconds'));
      }, 10000);

      const checkConnection = () => {
        const pcState = pcRef.current?.connectionState;
        const dcState = eventsChannelRef.current?.readyState;
        console.info("[Agent] pc state", pcState, pcRef.current?.iceConnectionState);
        console.info("[Agent] events-dc", dcState);
        
        if (pcState === 'connected' && dcState === 'open') {
          clearTimeout(timeout);
          console.info("[Agent] ensureConnected: pc=connected dc=open");
          resolve();
          return true;
        }
        return false;
      };

      // Check if already connected
      if (checkConnection()) return;

      // Check current state
      const currentState = callState;
      
      // If not started or failed, start the connection
      if (currentState === 'idle' || !pcRef.current) {
        console.info("[Agent] Starting new connection...");
        handleStart().then(() => {
          // Wait for connection to be established
          const pollConnection = () => {
            if (checkConnection()) return;
            // Continue polling for up to 10 seconds total
            setTimeout(pollConnection, 100);
          };
          setTimeout(pollConnection, 100); // Small delay to let connection establish
        }).catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
      } else {
        // Already connecting or connected, just wait
        console.info("[Agent] Waiting for existing connection...");
        const pollConnection = () => {
          if (checkConnection()) return;
          setTimeout(pollConnection, 100);
        };
        pollConnection();
      }
    });
  };

  const sendEvent = async (payload: any): Promise<void> => {
    if (!eventsChannelRef.current || eventsChannelRef.current.readyState !== 'open') {
      throw new Error('Events data channel not ready');
    }
    
    eventsChannelRef.current.send(JSON.stringify(payload));
    console.info("[Agent] send", payload.type);
  };

  const ask = async (text: string): Promise<void> => {
    try {
      console.info("[IdeaStarter] click", text);
      
      await ensureConnected();
      
      console.log(`[Agent] send conversation.item.create`);
      await sendEvent({
        type: "conversation.item.create",
        item: { 
          type: "message", 
          role: "user", 
          content: [{ type: "input_text", text }] 
        }
      });
      
      console.log(`[Agent] send response.create with tools`);
      await sendEvent({
        type: "response.create",
        response: { 
          conversation: "default", 
          modalities: ["audio"],
          tools: getTools(),
          tool_choice: "auto"
        }
      });
      
    } catch (error) {
      console.error('[Agent] ask failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      notify.error(`Failed to ask question: ${errorMsg}`);
      throw error;
    }
  };

  // Helper function to send questions to the realtime agent
  const handleQuestionSelect = async (question: string) => {
    debugLog('question-selected', question);
    
    try {
      await ask(question);
    } catch (error) {
      debugLog('question-select-error', error);
      // Error already handled and notified in ask() function
    }
  };

  // Handle OpenAI Realtime API events
  const handleRealtimeEvent = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      
      // Log all realtime events for forensic tracing
      console.log(`[RT] events message: ${data.type}`, data);
      
      // Handle session creation - send session.update with tools
      if (data.type === 'session.created') {
        console.log('[RT] session.created received, sending session.update with tools');
        
        const sessionUpdate = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: "You are a helpful health and fitness coach. You help users log their water intake, meals, workouts, and set health goals. When users ask you to log something, you can use the available tools to record that information. If you're not sure about the specific details (like exact amounts), ask the user for confirmation before logging. For example, 'Should I log 16 oz of water for you?' Always be conversational and encouraging about their health journey.",
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 1000
            },
            tools: getTools(),
            tool_choice: 'auto',
            temperature: 0.8,
            max_response_output_tokens: 'inf'
          }
        };
        
        sendEvent(sessionUpdate).catch(error => {
          console.error('[RT] Failed to send session.update:', error);
        });
      }
      
      // Handle audio transcript deltas for confirmation latch 
      else if (data.type === 'response.audio_transcript.delta') {
        const transcript = data.delta;
        if (transcript) {
          console.log(`[RT] AI transcript delta:`, transcript);
          
          // Check if AI is asking for confirmation and set latch
          const lowerTranscript = transcript.toLowerCase();
          if (lowerTranscript.includes('should i log') || 
              lowerTranscript.includes('would you like me to log') ||
              lowerTranscript.includes('shall i record') ||
              (lowerTranscript.includes('log') && lowerTranscript.includes('?'))) {
            
            console.log('[Agent] AI asking confirmation, setting up latch for next user input');
            
            // Try to extract logging parameters from recent context
            // This is a simple heuristic - in practice you might store context more systematically
            let pendingAction = null;
            
            if (lowerTranscript.includes('water') || lowerTranscript.includes('oz') || lowerTranscript.includes('ml')) {
              // Extract water amount if mentioned
              const ozMatch = transcript.match(/(\d+(?:\.\d+)?)\s*(?:fl\s*)?oz/i);
              const mlMatch = transcript.match(/(\d+(?:\.\d+)?)\s*ml/i);
              
              if (ozMatch) {
                pendingAction = {
                  tool: 'log_water',
                  args: { amount_oz: parseFloat(ozMatch[1]) },
                  expiresAt: Date.now() + 60000 // 60 seconds
                };
              } else if (mlMatch) {
                pendingAction = {
                  tool: 'log_water', 
                  args: { amount_ml: parseFloat(mlMatch[1]) },
                  expiresAt: Date.now() + 60000
                };
              }
            }
            
            if (pendingAction) {
              pendingActionRef.current = pendingAction;
              console.log('[Agent] Confirmation latch set:', pendingAction);
            }
          }
        }
      }
      
      // Handle user input transcripts for confirmation latch checking
      else if (data.type === 'conversation.item.input_audio_transcription.completed') {
        const userTranscript = data.transcript;
        if (userTranscript && pendingActionRef.current) {
          console.log(`[RT] User transcript:`, userTranscript);
          
          // Check if user gave affirmative response and latch is active
          if (isAffirmativeResponse(userTranscript) && 
              pendingActionRef.current.expiresAt > Date.now()) {
            
            console.log('[Agent] Affirmative response detected, executing pending action');
            const pendingAction = pendingActionRef.current;
            pendingActionRef.current = null; // Clear latch
            
            // Execute the tool call immediately
            handleRealtimeToolCall({
              name: pendingAction.tool,
              args: pendingAction.args,
              callId: 'latch-' + Date.now()
            });
          } else if (pendingActionRef.current.expiresAt <= Date.now()) {
            // Expire old latch
            pendingActionRef.current = null;
            console.log('[Agent] Confirmation latch expired');
          }
        }
      }
      
      // Handle function call argument deltas (streaming)
      else if (data.type === 'response.function_call_arguments.delta') {
        const key = data.call_id || data.response_id || 'default';
        const existing = functionCallBufferRef.current.get(key) || '';
        functionCallBufferRef.current.set(key, existing + (data.delta || ''));
        console.log(`[RT] response.function_call_arguments.delta:`, { 
          call_id: data.call_id, 
          delta: data.delta,
          accumulated_length: functionCallBufferRef.current.get(key)?.length || 0
        });
      }
      
      // Handle function call completion
      else if (data.type === 'response.function_call_arguments.done') {
        const key = data.call_id || data.response_id || 'default';
        const argsJson = data.arguments || functionCallBufferRef.current.get(key) || '';
        functionCallBufferRef.current.delete(key);
        
        try {
          const args = JSON.parse(argsJson);
          const toolName = data.name || 'unknown_tool';
          
          debugLog('function-call-done', { name: toolName, args, callId: data.call_id });
          console.info('[Tools] tool_call received:', toolName, args);
          
          // Update tool status to show activity
          setToolStatus({
            isActive: true,
            toolName,
            args,
            startTime: Date.now()
          });
          
          handleRealtimeToolCall({
            name: toolName,
            args,
            callId: data.call_id,
            responseId: data.response_id,
            itemId: data.item_id
          });
          
        } catch (parseError) {
          console.error('[Tools] Failed to parse function arguments:', argsJson, parseError);
        }
      }
      
      // Handle other event types for debugging
      else if (data.type?.startsWith('response.') || data.type?.startsWith('conversation.')) {
        debugLog('realtime-other', data.type);
      }
      
    } catch (error) {
      debugLog('realtime-event-error', error);
      console.error('[Agent] Failed to parse realtime event:', error);
    }
  };

  // Handle tool calls (write operations → voice-tools edge function)
  const handleRealtimeToolCall = async (toolCall: { name: string; args: any; callId?: string; responseId?: string; itemId?: string }) => {
    const { name, args, callId } = toolCall;
    
    console.log(`[Tools] tool_call: ${name}`, args);
    
    // Set timeout for tool execution - update status message
    const timeoutId = setTimeout(() => {
      console.log(`[Tools] timeout waiting for tool_result`);
      
      // Update status to "Still working..."
      setToolStatus(prev => ({
        ...prev,
        toolName: 'timeout'
      }));
      
      // Have agent say something about working on it
      sendEvent({
        type: 'response.create',
        response: {
          modalities: ['audio'],
          instructions: "Say 'Still working on that...' briefly and naturally.",
          tools: getTools(),
          tool_choice: "auto"
        }
      });
    }, 6000);
    
    try {
      // Get user session for authorization
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      if (!accessToken) {
        throw new Error('No authentication token available');
      }

      debugLog('tool-call-start', { name, args });
      
      const requestBody = { tool: name, args };
      console.log(`[Tools] POST to /functions/v1/voice-tools request body:`, requestBody);

      // Call the voice-tools edge function
      const response = await fetch('https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/voice-tools', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      clearTimeout(timeoutId);

      const result = await response.json();
      console.log(`[Tools] voice-tools response - status: ${response.status}, body:`, result);
      debugLog('tool-call-response', { status: response.status, result });

      // Send tool result back to OpenAI
      const toolResult = {
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: callId,
          output: JSON.stringify(result)
        }
      };

      await sendEvent(toolResult);
      console.log(`[Tools] tool_result sent`);
      debugLog('tool-result-sent', toolResult);

      // Play confirmation earcon on success, then trigger response
      if (result.ok) {
        await playEarcon();
      }

      // Then trigger response generation with confirmation message
      let instructions: string;
      if (result.ok) {
        if (result.duplicate) {
          instructions = "Say 'Already logged that a moment ago—want to add another?' in a friendly, conversational tone.";
        } else {
          instructions = "Say 'Logged it! Anything else?' in a cheerful, accomplished tone.";
        }
      } else {
        instructions = `There was an error: ${result.error || result.message}. Apologize briefly and ask the user to try again.`;
      }

      console.log(`[Agent] send response.create`);
      await sendEvent({
        type: 'response.create',
        response: {
          modalities: ['audio'],
          instructions,
          tools: getTools(),
          tool_choice: "auto"
        }
      });
      
      // Clear tool status after confirmation starts
      setToolStatus({ isActive: false });
      
      debugLog('response-create-sent', 'Confirmation audio requested');

      // Finally, dispatch UI update events for immediate cache invalidation
      if (result.ok) {
        console.info('[Tools] Dispatching UI update events');
        
        // Dispatch specific events for different data types
        if (name === 'log_water') {
          window.dispatchEvent(new CustomEvent('hydration:updated'));
        } else if (name === 'log_meal') {
          window.dispatchEvent(new CustomEvent('nutrition:updated'));
        } else if (name === 'log_workout') {
          window.dispatchEvent(new CustomEvent('exercise:updated'));
        } else if (name === 'set_goal') {
          window.dispatchEvent(new CustomEvent('goals:updated'));
        }
      }

    } catch (error) {
      clearTimeout(timeoutId);
      console.error('[Tools] Tool call failed:', error);
      debugLog('tool-call-error', error);
      
      // Clear tool status on error
      setToolStatus({ isActive: false });
      
      // Send error response back to OpenAI
      try {
        const errorResult = {
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: callId,
            output: JSON.stringify({ 
              ok: false, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            })
          }
        };

        await sendEvent(errorResult);
        
        await sendEvent({
          type: 'response.create',
          response: {
            modalities: ['audio'],
            instructions: "Apologize for the technical issue and ask the user to try again.",
            tools: getTools(),
            tool_choice: "auto"
          }
        });
        
      } catch (sendError) {
        console.error('[Tools] Failed to send error response:', sendError);
      }
    }
  };

  // Debug helper for manual testing
  useEffect(() => {
    if (debugMode) {
      (window as any).debugAsk = (text: string) => ask(text);
      (window as any).debugTool = async (name: string, args: any) => {
        console.info('[Debug] Manual tool call:', name, args);
        await handleRealtimeToolCall({ name, args, callId: 'debug-' + Date.now() });
      };
    }
  }, [debugMode]);

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
          <div className="flex flex-col items-center space-y-3">
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

            {/* Tool Status Animation */}
            {toolStatus.isActive && (
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {toolStatus.toolName === 'timeout' 
                    ? 'Still working...' 
                    : toolStatus.toolName && toolStatus.args
                    ? formatToolStatusMessage(toolStatus.toolName, toolStatus.args)
                    : 'Processing...'
                  }
                </span>
              </div>
            )}

            {/* Confirmation Sound Toggle */}
            {callState !== "idle" && (
              <div className="flex items-center gap-2 text-sm">
                <Switch
                  checked={confirmationSoundEnabled}
                  onCheckedChange={handleConfirmationSoundToggle}
                  className="scale-75"
                />
                <span className="text-muted-foreground">Play confirmation sound</span>
              </div>
            )}
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

          {/* Idea Starters */}
          <IdeaStarters 
            onQuestionSelect={handleQuestionSelect}
            disabled={callState === "connecting"}
          />
        </CardContent>
      </Card>
    </div>
  );
}