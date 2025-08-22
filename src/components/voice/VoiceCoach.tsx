import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useFeatureFlagOptimized } from "@/hooks/useFeatureFlagOptimized";
import { useAdminRole } from "@/hooks/useAdminRole";
import { notify } from "@/lib/notify";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo, useEffect } from "react";
import { Mic, Square, Loader2, Volume2, Hand, AlertTriangle, ExternalLink } from "lucide-react";
import { useVoiceCoachRecorder } from "@/features/voicecoach/hooks/useVoiceCoachRecorder";
import { useVadAutoStop } from "@/features/voicecoach/hooks/useVadAutoStop";
import { useTalkBack } from "@/features/voicecoach/hooks/useTalkBack";

type VadData = { 
  rms: number; 
  silenceMs: number | null; 
  peakDb: number;
  mimeChosen?: string;
  isIosSafari?: boolean;
  exitReason?: string;
};

export default function VoiceCoach() {
  const { enabled: mvpEnabled } = useFeatureFlagOptimized("voice_coach_mvp");
  const { enabled: killSwitchDisabled } = useFeatureFlagOptimized("voice_coach_disabled");
  const { isAdmin } = useAdminRole();

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

  // VAD data for debug display
  const [vadData, setVadData] = useState<VadData>({ 
    rms: 0, 
    silenceMs: null, 
    peakDb: -Infinity 
  });

  // Environment checks
  const inIframe = typeof window !== 'undefined' && window.top !== window.self;
  const insecure = typeof window !== 'undefined' && !window.isSecureContext;
  const debugMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'vc';

  // Persist settings changes
  useEffect(() => {
    localStorage.setItem("vc_speak_replies", JSON.stringify(speakReplies));
  }, [speakReplies]);

  useEffect(() => {
    localStorage.setItem("vc_hands_free", JSON.stringify(handsFree));
  }, [handsFree]);

  // Feature gating logic
  const isAllowed = !killSwitchDisabled && (isAdmin || mvpEnabled);

  // Audio finalization pipeline
  const onFinalize = async (blob: Blob, metadata: { mimeType: string; isIosSafari: boolean }) => {
    console.log('[VoiceCoach] Processing audio blob');
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
      const { data, error } = await supabase.functions.invoke('voice-turn', {
        body: formData
      });

      if (error) throw error;
      if (!data?.ok) {
        throw new Error(data?.error || 'Voice processing failed');
      }

      const transcription = data.text;
      const aiReply = data.reply;
      
      console.log('[VoiceCoach] Received:', { transcription, aiReply });
      setTranscriptionText(transcription);
      setResponseText(aiReply);
      
      notify.success("Voice session completed!");
      
      // TTS talk back + hands-free re-arm
      if (speakReplies && canSpeak && aiReply) {
        try {
          await speak(aiReply);
          // Re-arm mic after TTS ends if hands-free is enabled
          if (handsFree) {
            console.log('[VoiceCoach] Hands-free re-arm');
            setTimeout(() => start(), 400); // 400ms delay as specified
            notify.success("🎤 Re-armed for hands-free");
          }
        } catch (ttsError) {
          console.error('[VoiceCoach] TTS error:', ttsError);
          notify.error('Could not speak reply');
        }
      }

    } catch (error) {
      console.error('[VoiceCoach] Processing error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setTranscriptionText(`Failed: ${errorMsg}`);
      
      // Show user-friendly error messages
      if (errorMsg.includes('missing_openai_key')) {
        notify.error('Voice Coach not configured. Please contact admin.');
      } else if (errorMsg.includes('too large')) {
        notify.error('Recording too long. Please keep it under 30 seconds.');
      } else {
        notify.error('Failed to process audio. Please try again.');
      }
    }
  };

  // Voice recorder with idempotent stop
  const { state, start, stop, cancel, streamRef } = useVoiceCoachRecorder(onFinalize);

  // Make a stable value so useVadAutoStop re-runs when the ref changes
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

  const handleButtonClick = async () => {
    if (state === "recording") {
      // Stop recording
      stop();
      return;
    }

    // If TTS is speaking, stop it first then start recording
    if (isSpeaking) {
      console.log('[VoiceCoach] Stopping TTS to start recording');
      stopTTS();
    }

    if (!isAllowed) {
      notify.info("Voice Coach access restricted.");
      return;
    }

    // Clear previous results
    setTranscriptionText("");
    setResponseText("");

    try {
      console.log('[VoiceCoach] Starting recording');
      await start();
      notify.success("🎤 Listening… auto-stop on silence");
    } catch (error: any) {
      console.error('[VoiceCoach] Start error:', error);
      
      // Runtime guard against stack overflow
      if (error?.message?.includes('Maximum call stack size exceeded')) {
        console.warn('[VoiceCoach] Stack overflow detected - resetting state');
        cancel(); // Reset recorder state
        notify.error('Recording error. Please try again.');
        return;
      }
      
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

  const openInBrowser = () => {
    window.open(window.location.href, '_blank', 'noopener');
  };

  const getButtonContent = () => {
    if (isSpeaking) {
      return (
        <>
          <Volume2 className="h-4 w-4 animate-pulse" />
          Speaking…
        </>
      );
    }

    switch (state) {
      case "recording":
        return (
          <>
            <Square className="h-4 w-4 text-red-500" />
            Stop
          </>
        );
      case "processing":
        return (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing…
          </>
        );
      default:
        return (
          <>
            <Mic className="h-4 w-4" />
            Start
          </>
        );
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice Coach
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Feature Gate Check */}
          {!isAllowed && (
            <div className="p-3 bg-muted rounded-lg border text-center">
              <div className="text-sm text-muted-foreground">
                Voice Coach access restricted.
                {isAdmin && (
                  <>
                    {' '}
                    <a 
                      href="/admin/feature-flags" 
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Manage access <ExternalLink className="h-3 w-3" />
                    </a>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Environment Warnings */}
          {insecure && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">Microphone requires HTTPS.</span>
                </div>
                <Button size="sm" variant="outline" onClick={openInBrowser}>
                  Open in Browser
                </Button>
              </div>
            </div>
          )}

          {inIframe && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">Open in Browser (top-level tab required).</span>
                </div>
                <Button size="sm" variant="outline" onClick={openInBrowser}>
                  Open in Browser
                </Button>
              </div>
            </div>
          )}

          {/* Settings Toggles */}
          <div className="flex justify-center gap-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="speak-replies"
                checked={speakReplies}
                onCheckedChange={setSpeakReplies}
              />
              <label htmlFor="speak-replies" className="text-sm font-medium flex items-center gap-1">
                <Volume2 className="h-4 w-4" />
                Speak replies
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="hands-free"
                checked={handsFree}
                onCheckedChange={setHandsFree}
              />
              <label htmlFor="hands-free" className="text-sm font-medium flex items-center gap-1">
                <Hand className="h-4 w-4" />
                Hands-free
              </label>
            </div>
          </div>

          {/* Main CTA Button */}
          <div className="text-center space-y-2">
            <Button
              size="lg"
              disabled={!isAllowed || (state === "processing")}
              onClick={handleButtonClick}
              variant={state === "recording" ? "destructive" : isSpeaking ? "secondary" : "default"}
              className="w-full max-w-xs"
            >
              {getButtonContent()}
            </Button>
            <p className="text-xs text-muted-foreground">auto-stop on silence</p>
          </div>

          {/* Results Display */}
          {transcriptionText && (
            <div className="p-3 bg-muted/50 rounded-lg border">
              <div className="text-xs font-medium text-muted-foreground mb-1">You said:</div>
              <div className="text-sm">{transcriptionText}</div>
            </div>
          )}

          {responseText && (
            <div className="p-3 bg-primary/10 rounded-lg border">
              <div className="text-xs font-medium text-primary mb-1">Coach Response:</div>
              <div className="text-sm">{responseText}</div>
            </div>
          )}

          {/* Debug Info */}
          {debugMode && (
            <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1 font-mono">
              <div className="font-semibold text-sm mb-2">Debug Info:</div>
              <div>MIME: {vadData.mimeChosen || 'none'}</div>
              <div>iOS Safari: {vadData.isIosSafari ? 'yes' : 'no'}</div>
              <div>Silence: {vadData.silenceMs !== null ? `${vadData.silenceMs.toFixed(0)}ms` : 'Voice detected'}</div>
              <div>Peak: {vadData.peakDb !== -Infinity ? `${vadData.peakDb.toFixed(1)}dB` : '-∞'}</div>
              <div>Exit: {vadData.exitReason || 'none'}</div>
              <div>RMS: {vadData.rms.toFixed(4)} (~{vadData.rms > 0 ? (20 * Math.log10(vadData.rms)).toFixed(1) : '-∞'}dB)</div>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-100" 
                  style={{ width: `${Math.min(100, Math.max(0, (vadData.peakDb + 60) * 2))}%` }}
                />
              </div>
              <div className="mt-2 space-y-1">
                <div>Kill Switch: {killSwitchDisabled ? 'ON (disabled)' : 'OFF'}</div>
                <div>MVP Flag: {mvpEnabled ? 'ON' : 'OFF'}</div>
                <div>Is Admin: {isAdmin ? 'YES' : 'NO'}</div>
                <div>Allowed: {isAllowed ? 'YES' : 'NO'}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}