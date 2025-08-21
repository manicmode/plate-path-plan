import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, Clock, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { VoiceRecorder } from './Recorder';
import { VoicePlayer } from './Player';
import { VoiceCoachAPI, VoiceTurnResponse, VoiceMinutesResponse } from './api';
import { isVoiceCoachAvailable } from './featureFlag';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface VoiceCoachProps {
  onClose?: () => void;
}

interface VoiceTurn {
  id: string;
  timestamp: Date;
  transcript: string;
  reply_text: string;
  tts_url?: string;
  tool_results?: Array<{
    tool_name: string;
    success: boolean;
    result?: any;
  }>;
  usage: {
    tokens_prompt: number;
    tokens_output: number;
    ms_asr: number;
    ms_tts: number;
    seconds_recorded: number;
  };
}

export const VoiceCoach: React.FC<VoiceCoachProps> = ({ onClose }) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [turns, setTurns] = useState<VoiceTurn[]>([]);
  const [minuteUsage, setMinuteUsage] = useState<VoiceMinutesResponse | null>(null);
  const [currentPlayingUrl, setCurrentPlayingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if Voice Coach is available
  const isAvailable = isVoiceCoachAvailable();

  // Load minute usage on mount
  useEffect(() => {
    if (isAvailable) {
      loadMinuteUsage();
    }
  }, [isAvailable]);

  const loadMinuteUsage = async () => {
    try {
      const usage = await VoiceCoachAPI.getMinuteUsage();
      setMinuteUsage(usage);
    } catch (error) {
      console.error('Failed to load minute usage:', error);
      // Don't show error toast for usage loading - it's not critical
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob, duration: number) => {
    if (!isAvailable) return;

    // Check if user has exceeded quota
    if (minuteUsage && minuteUsage.remaining_seconds <= 0) {
      toast({
        title: "Quota Exceeded",
        description: "You've reached your monthly voice limit. Upgrade your plan for more minutes.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response: VoiceTurnResponse = await VoiceCoachAPI.submitVoiceTurn(
        audioBlob, 
        'audio/webm'
      );

      // Create new turn
      const newTurn: VoiceTurn = {
        id: Date.now().toString(),
        timestamp: new Date(),
        transcript: response.transcript,
        reply_text: response.reply_text,
        tts_url: response.tts_url,
        tool_results: response.tool_results,
        usage: response.usage,
      };

      setTurns(prev => [newTurn, ...prev]);

      // Auto-play TTS if available
      if (response.tts_url) {
        setCurrentPlayingUrl(response.tts_url);
      }

      // Refresh minute usage
      await loadMinuteUsage();

      // Show success toast with key insights
      const toolResults = response.tool_results?.filter(r => r.success) || [];
      if (toolResults.length > 0) {
        const actions = toolResults.map(r => r.tool_name).join(', ');
        toast({
          title: "Voice Coach Completed",
          description: `Processed your request and executed: ${actions}`,
        });
      } else {
        toast({
          title: "Voice Coach Response",
          description: "Your voice request has been processed successfully.",
        });
      }

    } catch (error) {
      console.error('Voice turn failed:', error);
      setError(error instanceof Error ? error.message : 'Voice processing failed');
      toast({
        title: "Voice Processing Failed",
        description: "Please try again or check your connection.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatUsagePercentage = (): number => {
    if (!minuteUsage) return 0;
    const totalSeconds = minuteUsage.plan_minutes * 60;
    return (minuteUsage.used_seconds_month / totalSeconds) * 100;
  };

  const getRemainingMinutes = (): string => {
    if (!minuteUsage) return '---';
    const remainingMinutes = Math.floor(minuteUsage.remaining_seconds / 60);
    return remainingMinutes.toString();
  };

  const getUsageColor = (): string => {
    const percentage = formatUsagePercentage();
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  // Feature flag check
  if (!isAvailable) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
            <Zap className="w-6 h-6 text-muted-foreground" />
          </div>
          <CardTitle>Voice Coach</CardTitle>
          <CardDescription>
            Voice Coach is not available for your current plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Upgrade to access AI-powered voice coaching with progress analysis, 
            smart logging, and personalized recommendations.
          </p>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header with close button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Voice Coach</h1>
          <p className="text-muted-foreground">
            AI-powered voice assistant for your health journey
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Usage meter */}
      {minuteUsage && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Monthly Usage</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={cn('text-sm font-mono', getUsageColor())}>
                  {getRemainingMinutes()} min remaining
                </span>
                <Badge variant="outline">{minuteUsage.month_key}</Badge>
              </div>
            </div>
            <Progress value={formatUsagePercentage()} className="h-2" />
            {formatUsagePercentage() > 90 && (
              <p className="text-xs text-yellow-600 mt-1">
                ⚠️ Approaching monthly limit. Consider upgrading for more minutes.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main interaction area */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-lg">Start a Voice Session</CardTitle>
          <CardDescription>
            Record up to 30 seconds. Ask me to analyze progress, log entries, 
            set reminders, or plan your week.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6">
          <VoiceRecorder
            onRecordingComplete={handleRecordingComplete}
            disabled={isProcessing || (minuteUsage?.remaining_seconds || 0) <= 0}
            maxDuration={30}
          />
          
          {isProcessing && (
            <div className="text-center space-y-2">
              <div className="animate-pulse">
                <p className="text-sm font-medium">Processing your voice...</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Transcribing → Analyzing → Generating response
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current audio player */}
      {currentPlayingUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Voice Response</CardTitle>
          </CardHeader>
          <CardContent>
            <VoicePlayer
              audioUrl={currentPlayingUrl}
              autoPlay={true}
              onPlaybackComplete={() => setCurrentPlayingUrl(null)}
              onError={(error) => {
                console.error('TTS playback error:', error);
                toast({
                  title: "Playback Error",
                  description: "Could not play voice response",
                  variant: "destructive",
                });
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Session history */}
      {turns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Session History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {turns.map((turn) => (
              <div key={turn.id} className="border-l-2 border-primary/20 pl-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <p className="text-sm text-muted-foreground">
                      {turn.timestamp.toLocaleTimeString()}
                    </p>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm">
                        <strong>You:</strong> "{turn.transcript}"
                      </p>
                    </div>
                    <div className="bg-primary/5 rounded-lg p-3">
                      <p className="text-sm">
                        <strong>Coach:</strong> {turn.reply_text}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Tool results */}
                {turn.tool_results && turn.tool_results.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {turn.tool_results.map((result, index) => (
                      <Badge
                        key={index}
                        variant={result.success ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {result.success ? (
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                        ) : (
                          <X className="w-3 h-3 mr-1" />
                        )}
                        {result.tool_name}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Audio player for this turn */}
                {turn.tts_url && (
                  <VoicePlayer
                    audioUrl={turn.tts_url}
                    className="mt-2"
                    onError={(error) => {
                      console.error('Historical TTS playback error:', error);
                    }}
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Help */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-medium mb-2">Example Voice Commands</h3>
          <div className="grid md:grid-cols-2 gap-3 text-sm text-muted-foreground">
            <div>
              <p>• "Analyze my progress over the last 30 days"</p>
              <p>• "Log 2 liters of water for today"</p>
            </div>
            <div>
              <p>• "Remind me tomorrow at 9am to take vitamins"</p>
              <p>• "Plan my workout week focusing on strength"</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceCoach;