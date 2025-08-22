import { Button } from "@/components/ui/button";
import { useFeatureFlagOptimized } from "@/hooks/useFeatureFlagOptimized";
import { useFeatureFlagActions } from "@/hooks/useFeatureFlagActions";
import { useMyFeatureFlags } from "@/hooks/useMyFeatureFlags";
import { notify } from "@/lib/notify";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo, useEffect } from "react";
import { Mic, Square, Loader2, Volume2, Hand } from "lucide-react";
import { useVoiceCoachRecorder } from "./hooks/useVoiceCoachRecorder";
import { useVadAutoStop } from "./hooks/useVadAutoStop";
import { useTalkBack } from "./hooks/useTalkBack";

export default function StartVoiceCoachButton() {
  const { enabled, loading } = useFeatureFlagOptimized("voice_coach_mvp");
  const { enabled: killSwitchDisabled } = useFeatureFlagOptimized("voice_coach_disabled");
  const { setUserFlag } = useFeatureFlagActions();
  const { refresh } = useMyFeatureFlags();

  // TTS hook
  const { canSpeak, isSpeaking, speak, stop: stopTTS } = useTalkBack();

  // State for transcription and response
  const [transcriptionText, setTranscriptionText] = useState<string>("");
  const [responseText, setResponseText] = useState<string>("");
  
  // TTS settings (persisted in localStorage)
  const [speakReplies, setSpeakReplies] = useState(() => 
    JSON.parse(localStorage.getItem("vc_speak_replies") || "true")
  );
  const [handsFree, setHandsFree] = useState(() => 
    JSON.parse(localStorage.getItem("vc_hands_free") || "false")
  );

  // Persist settings changes
  useEffect(() => {
    localStorage.setItem("vc_speak_replies", JSON.stringify(speakReplies));
  }, [speakReplies]);

  useEffect(() => {
    localStorage.setItem("vc_hands_free", JSON.stringify(handsFree));
  }, [handsFree]);
  const [vadData, setVadData] = useState<{ 
    rms: number; 
    silenceMs: number | null; 
    peakDb: number;
    mimeChosen?: string;
    isIosSafari?: boolean;
    exitReason?: string;
  }>({ 
    rms: 0, 
    silenceMs: null, 
    peakDb: -Infinity 
  });

  // Environment checks
  const inIframe = typeof window !== 'undefined' && window.top !== window.self;
  const insecure = typeof window !== 'undefined' && !window.isSecureContext;

  // Audio finalization pipeline with proper FormData upload
  const onFinalize = async (blob: Blob, metadata: { mimeType: string; isIosSafari: boolean }) => {
    console.log('[VoiceCoach] upload begin');
    setTranscriptionText("Transcribing...");
    
    // Update VAD data with metadata
    setVadData(prev => ({
      ...prev,
      mimeChosen: metadata.mimeType,
      isIosSafari: metadata.isIosSafari
    }));
    
    try {
      // Create FormData with proper file extension
      const formData = new FormData();
      const ext = metadata.mimeType.includes('mp4') ? 'm4a' : 
                  metadata.mimeType.includes('webm') ? 'webm' : 'audio';
      const filename = `voice-${Date.now()}.${ext}`;
      
      formData.append('audio', blob, filename);

      // Send to voice-turn edge function
      const response = await fetch('https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/voice-turn', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b2lpaWpxdGFob2hmYWZxaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTE2MzgsImV4cCI6MjA2Njk2NzYzOH0.Ny_Gxbhus7pNm0OHipRBfaFLNeK_ZSePfbj8no4SVGw`,
        },
        body: formData
      });

      console.log('[VoiceCoach] upload done');

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[VoiceCoach] EF status:', response.status, errorText);
        throw new Error(`Voice turn failed: ${response.status} ${response.statusText} — ${errorText}`);
      }

      const responseData = await response.json();
      
      if (!responseData.ok) {
        throw new Error(responseData.message || 'Voice turn failed');
      }

      const transcription = responseData.text;
      console.log('[VoiceCoach] Transcription received:', transcription);
      setTranscriptionText(transcription);

      // Auto-send to Voice Coach for response
      setResponseText("Generating response...");
      
      try {
        const { data: chatData, error: chatError } = await supabase.functions.invoke('voice-turn', {
          body: { 
            transcript: transcription,
            mode: 'chat' // Indicate this is for chat response, not transcription
          }
        });

        if (chatError) throw new Error(chatError.message || 'Voice turn failed');
        if (!chatData?.text) throw new Error('No response received');

        const response = chatData.text;
        console.log('[VoiceCoach] Voice response received:', response);
        setResponseText(response);
        
        notify.success("Voice session completed!");
        
        // TTS talk back + hands-free re-arm
        if (speakReplies && canSpeak && response) {
          try {
            await speak(response);
            // Re-arm mic after TTS ends if hands-free is enabled
            if (handsFree) {
              console.log('[VoiceCoach] Hands-free re-arm');
              await start();
              notify.success("🎤 Re-armed for hands-free");
            }
          } catch (ttsError) {
            console.error('[VoiceCoach] TTS error:', ttsError);
            notify.error('Could not speak reply');
          }
        }
        
      } catch (responseError) {
        console.error('[VoiceCoach] Voice response error:', responseError);
        setResponseText(`Response error: ${responseError instanceof Error ? responseError.message : 'Unknown error'}`);
        notify.error('Failed to generate response');
      }

    } catch (error) {
      console.error('[VoiceCoach] Upload/transcription error:', error);
      setTranscriptionText(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      notify.error('Failed to process audio');
    }
  };

  // Voice recorder with idempotent stop
  const { state, start, stop, cancel, streamRef } = useVoiceCoachRecorder(onFinalize);

  // make a stable value so useVadAutoStop re-runs when the ref changes
  const liveStream = useMemo(() => streamRef.current ?? null, [streamRef.current]);

  // VAD auto-stop with exit reason tracking
  useVadAutoStop({
    stream: liveStream,
    isRecording: state === "recording",
    onSilenceStop: (reason) => {
      console.log('[VoiceCoach] Auto-stop triggered:', reason);
      setVadData(prev => ({ ...prev, exitReason: reason }));
      stop();
    },
    trailingMs: 900,
    minVoiceRms: 0.003, // ~-45dB
    maxMs: 30_000,
    onVadUpdate: (rms, silenceMs, peakDb) => {
      setVadData(prev => ({ ...prev, rms, silenceMs, peakDb }));
    }
  });

  const handleToggleUserOverride = async () => {
    const success = await setUserFlag("voice_coach_mvp", !enabled);
    if (success) {
      await refresh();
      notify.success(`Voice Coach ${(!enabled ? "enabled" : "disabled")} for you`);
    }
  };

  const handleButtonClick = async () => {
    if (state === "recording") {
      // Cancel recording
      cancel();
      setTranscriptionText("");
      setResponseText("");
      return;
    }

    // If TTS is speaking, stop it first then start recording
    if (isSpeaking) {
      console.log('[VoiceCoach] Stopping TTS to start recording');
      stopTTS();
    }

    if (!enabled) {
      notify.info("Voice Coach is coming soon for your account.");
      return;
    }

    // Clear previous results
    setTranscriptionText("");
    setResponseText("");

    try {
      console.log('[VoiceCoach] start()');
      await start();
      notify.success("🎤 Listening… auto-stop on silence");
    } catch (error: any) {
      console.error('[VoiceCoach] Start error:', error);
      if (error?.name === 'NotAllowedError') {
        notify.error('Microphone permission required. Check browser settings.');
      } else if (error?.name === 'NotFoundError') {
        notify.error('No microphone detected.');
      } else if (inIframe || insecure) {
        notify.error('Open in a new browser tab (HTTPS) to use microphone.');
      } else {
        notify.error(`Microphone error: ${error.message || 'Unknown error'}`);
      }
    }
  };

  if (loading) {
    return <Button disabled>Loading...</Button>;
  }

  const getButtonContent = () => {
    if (isSpeaking) {
      return (
        <>
          <Volume2 className="h-4 w-4 animate-pulse" />
          Speaking… (tap to interrupt)
        </>
      );
    }

    switch (state) {
      case "recording":
        return (
          <>
            <div className="h-4 w-4 bg-red-500 rounded-full animate-pulse" />
            Listening… (tap to cancel)
          </>
        );
      case "processing":
        return (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        );
      default:
        return (
          <>
            <Mic className="h-4 w-4" />
            Start Voice Session
          </>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* TTS Settings Toggles */}
      <div className="flex gap-4 items-center justify-center text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            checked={speakReplies} 
            onChange={e => setSpeakReplies(e.target.checked)}
            className="rounded"
          />
          <Volume2 className="h-4 w-4" />
          <span>Speak replies</span>
        </label>
        
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            checked={handsFree} 
            onChange={e => setHandsFree(e.target.checked)}
            className="rounded"
          />
          <Hand className="h-4 w-4" />
          <span>Hands-free</span>
        </label>
      </div>

      {/* Main Voice Button */}
      <Button
        disabled={killSwitchDisabled || (state === "recording" && isSpeaking)}
        onClick={handleButtonClick}
        variant={state === "recording" ? "destructive" : isSpeaking ? "secondary" : "default"}
        className="w-full gap-2"
      >
        {getButtonContent()}
      </Button>

      {/* VAD Debug Info (only shown in debug mode) */}
      {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'vc' && (
        <div className="p-2 bg-muted/50 rounded text-xs space-y-1">
          <div>mimeChosen: {vadData.mimeChosen || 'none'}</div>
          <div>isIosSafari: {vadData.isIosSafari ? 'true' : 'false'}</div>
          <div>vadSilenceMs: {vadData.silenceMs !== null ? `${vadData.silenceMs.toFixed(0)}ms` : 'Voice detected'}</div>
          <div>peakDb: {vadData.peakDb !== -Infinity ? vadData.peakDb.toFixed(1) : '-∞'} dB</div>
          <div>exitReason: {vadData.exitReason || 'none'}</div>
          <div>RMS: {vadData.rms.toFixed(4)} (~{vadData.rms > 0 ? (20 * Math.log10(vadData.rms)).toFixed(1) : '-∞'}dB)</div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-100" 
              style={{ width: `${Math.min(100, Math.max(0, (vadData.peakDb + 60) * 2))}%` }}
            />
          </div>
        </div>
      )}

      {/* Transcription Display */}
      {transcriptionText && (
        <div className="p-3 bg-muted/50 rounded border">
          <div className="text-xs font-medium text-muted-foreground mb-1">Transcription:</div>
          <div className="text-sm">{transcriptionText}</div>
        </div>
      )}

      {/* Response Display */}
      {responseText && (
        <div className="p-3 bg-primary/10 rounded border">
          <div className="text-xs font-medium text-primary mb-1">Voice Coach Response:</div>
          <div className="text-sm">{responseText}</div>
        </div>
      )}

      {/* Environment Warning */}
      {(inIframe || insecure) && (
        <div className="p-2 text-xs bg-yellow-50 text-yellow-800 rounded border border-yellow-200">
          Microphone requires HTTPS and a top-level tab.{' '}
          <a 
            href={typeof window !== 'undefined' ? window.location.href : '#'} 
            target="_blank" 
            rel="noreferrer" 
            className="underline hover:no-underline"
          >
            Open in Browser
          </a>
        </div>
      )}

      {/* Dev Helper */}
      <Button variant="outline" onClick={handleToggleUserOverride} size="sm">
        {enabled ? "Disable for me" : "Enable for me"}
      </Button>
    </div>
  );
}