import { Button } from "@/components/ui/button";
import { useFeatureFlagOptimized } from "@/hooks/useFeatureFlagOptimized";
import { useFeatureFlagActions } from "@/hooks/useFeatureFlagActions";
import { useMyFeatureFlags } from "@/hooks/useMyFeatureFlags";
import { notify } from "@/lib/notify";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { useVoiceCoachRecorder } from "./hooks/useVoiceCoachRecorder";
import { useVadAutoStop } from "./hooks/useVadAutoStop";

export default function StartVoiceCoachButton() {
  const { enabled, loading } = useFeatureFlagOptimized("voice_coach_mvp");
  const { enabled: killSwitchDisabled } = useFeatureFlagOptimized("voice_coach_disabled");
  const { setUserFlag } = useFeatureFlagActions();
  const { refresh } = useMyFeatureFlags();

  // State for transcription and response
  const [transcriptionText, setTranscriptionText] = useState<string>("");
  const [responseText, setResponseText] = useState<string>("");
  const [vadData, setVadData] = useState<{ rms: number; silenceMs: number | null }>({ rms: 0, silenceMs: null });

  // Environment checks
  const inIframe = typeof window !== 'undefined' && window.top !== window.self;
  const insecure = typeof window !== 'undefined' && !window.isSecureContext;

  // Audio finalization pipeline
  const onFinalize = async (blob: Blob) => {
    console.log('[VoiceCoach] Starting audio finalization pipeline');
    setTranscriptionText("Transcribing...");
    
    try {
      // Convert to base64 for STT
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = () => reject(new Error('Failed to read audio file'));
        reader.readAsDataURL(blob);
      });

      console.log('[VoiceCoach] Audio converted to base64, size:', base64Audio.length);

      // Send to STT
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio }
      });

      if (error) throw new Error(error.message || 'STT failed');
      if (!data?.text) throw new Error('No transcription received');

      const transcription = data.text;
      console.log('[VoiceCoach] Transcription received:', transcription);
      setTranscriptionText(transcription);

      // Auto-send to Voice Coach for response
      setResponseText("Generating response...");
      
      try {
        const { data: responseData, error: responseError } = await supabase.functions.invoke('voice-turn', {
          body: { 
            audio: base64Audio,
            mimeType: blob.type,
            transcript: transcription 
          }
        });

        if (responseError) throw new Error(responseError.message || 'Voice turn failed');
        if (!responseData) throw new Error('No response received');

        const response = responseData.text || responseData.response || 'Response received';
        console.log('[VoiceCoach] Voice response received:', response);
        setResponseText(response);
        
        notify.success("Voice session completed!");
        
        // TODO: If TTS is enabled, auto-play the response here
        
      } catch (responseError) {
        console.error('[VoiceCoach] Voice response error:', responseError);
        setResponseText(`Response error: ${responseError instanceof Error ? responseError.message : 'Unknown error'}`);
        notify.error('Failed to generate response');
      }

    } catch (error) {
      console.error('[VoiceCoach] STT error:', error);
      setTranscriptionText(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      notify.error('Failed to transcribe audio');
    }
  };

  // Voice recorder with idempotent stop
  const { state, start, stop, cancel, streamRef } = useVoiceCoachRecorder(onFinalize);

  // make a stable value so useVadAutoStop re-runs when the ref changes
  const liveStream = useMemo(() => streamRef.current ?? null, [streamRef.current]);

  // VAD auto-stop
  useVadAutoStop({
    stream: liveStream,
    isRecording: state === "recording",
    onSilenceStop: stop,
    trailingMs: 900,
    minVoiceRms: 0.02,
    maxMs: 30_000,
    onVadUpdate: (rms, silenceMs) => {
      setVadData({ rms, silenceMs });
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

    if (!enabled) {
      notify.info("Voice Coach is coming soon for your account.");
      return;
    }

    // Clear previous results
    setTranscriptionText("");
    setResponseText("");

    try {
      await start();
      notify.success("🎤 Listening... (tap to cancel)");
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
    switch (state) {
      case "recording":
        return (
          <>
            <Square className="h-4 w-4" />
            Listening... (tap to cancel)
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
      {/* Main Voice Button */}
      <Button
        disabled={killSwitchDisabled}
        onClick={handleButtonClick}
        variant={state === "recording" ? "destructive" : "default"}
        className="w-full gap-2"
      >
        {getButtonContent()}
      </Button>

      {/* VAD Debug Info (only shown in debug mode) */}
      {state === "recording" && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'vc' && (
        <div className="p-2 bg-muted/50 rounded text-xs space-y-1">
          <div>RMS Level: {vadData.rms.toFixed(4)} (threshold: 0.02)</div>
          <div>Silence: {vadData.silenceMs !== null ? `${vadData.silenceMs.toFixed(0)}ms` : 'Voice detected'}</div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-100" 
              style={{ width: `${Math.min(100, vadData.rms * 5000)}%` }}
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