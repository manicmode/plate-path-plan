import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Play, Pause, Volume2, VolumeX, RotateCcw, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SessionData {
  title: string;
  description: string;
  duration: number;
  audio_url: string;
  category: string;
  id: string;
}

const MeditationPlayer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Get session data from navigation state
  const sessionData: SessionData = location.state?.sessionData || {
    title: "Meditation Session",
    description: "A peaceful meditation session",
    duration: 10,
    audio_url: "",
    category: "general",
    id: "default"
  };

  // Audio and playback state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(sessionData.duration * 60); // Convert minutes to seconds
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Animation state
  const [breathingScale, setBreathingScale] = useState(1);

  // Format time helper
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Update meditation streak
  const updateMeditationStreak = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      
      const { data: existingStreak, error: fetchError } = await supabase
        .from('meditation_streaks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching meditation streak:', fetchError);
        return;
      }

      if (existingStreak) {
        // Check if already completed today
        if (existingStreak.last_completed_date === today) {
          return;
        }

        const lastDate = new Date(existingStreak.last_completed_date || '1970-01-01');
        const todayDate = new Date(today);
        const dayDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        let newStreak = existingStreak.current_streak;
        if (dayDiff === 1) {
          newStreak += 1;
        } else if (dayDiff > 1) {
          newStreak = 1;
        }

        const { error } = await supabase
          .from('meditation_streaks')
          .update({
            current_streak: newStreak,
            total_sessions: existingStreak.total_sessions + 1,
            last_completed_date: today
          })
          .eq('user_id', user.id);

        if (!error) {
          // Show celebration toast
          if (newStreak > existingStreak.current_streak) {
            toast({
              title: `🔥 ${newStreak}-Day Streak!`,
              description: "Amazing consistency! Keep up the great work.",
              duration: 4000,
            });
          } else {
            toast({
              title: "🌱 Session Complete!",
              description: "You've completed another meditation session.",
              duration: 3000,
            });
          }
        }
      } else {
        // First session
        const { error } = await supabase
          .from('meditation_streaks')
          .insert({
            user_id: user.id,
            current_streak: 1,
            total_sessions: 1,
            last_completed_date: today
          });

        if (!error) {
          toast({
            title: "🌱 First Session Complete!",
            description: "Welcome to your mindfulness journey!",
            duration: 4000,
          });
        }
      }
    } catch (error) {
      console.error('Error updating meditation streak:', error);
    }
  };

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedData = () => {
      setDuration(audio.duration);
      setIsLoading(false);
      // Auto-start playback
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(console.error);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setIsSessionComplete(true);
      updateMeditationStreak();
    };

    const handleLoadStart = () => setIsLoading(true);

    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);

    return () => {
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
    };
  }, []);

  // Breathing animation
  useEffect(() => {
    if (!isPlaying) return;

    const breathingInterval = setInterval(() => {
      setBreathingScale(prev => prev === 1 ? 1.2 : 1);
    }, 4000); // 4-second breathing cycle

    return () => clearInterval(breathingInterval);
  }, [isPlaying]);

  // Handle play/pause
  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(console.error);
    }
  };

  // Handle mute toggle
  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
  };

  // Handle restart
  const handleRestart = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    setCurrentTime(0);
    setProgress(0);
    setIsSessionComplete(false);
    
    if (!isPlaying) {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(console.error);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    if (isPlaying && currentTime > 30) { // Show warning if more than 30 seconds in
      setShowExitDialog(true);
    } else {
      navigateBack();
    }
  };

  const navigateBack = () => {
    const audio = audioRef.current;
    if (audio) {
      // Fade out audio
      const fadeOut = setInterval(() => {
        if (audio.volume > 0.1) {
          audio.volume = Math.max(0, audio.volume - 0.1);
        } else {
          audio.pause();
          clearInterval(fadeOut);
        }
      }, 100);
    }
    
    navigate('/guided-meditation');
  };

  const confirmExit = () => {
    setShowExitDialog(false);
    navigateBack();
  };

  // Get category emoji and color
  const getCategoryStyle = (category: string) => {
    const styles = {
      'morning-boost': { emoji: '🌅', color: 'from-orange-400 to-yellow-400' },
      'sleep-wind-down': { emoji: '🌙', color: 'from-indigo-400 to-purple-400' },
      'focus-clarity': { emoji: '🧠', color: 'from-blue-400 to-cyan-400' },
      'self-love': { emoji: '💞', color: 'from-pink-400 to-rose-400' },
      'anxiety-relief': { emoji: '🌿', color: 'from-green-400 to-emerald-400' },
      'gratitude': { emoji: '🙏', color: 'from-amber-400 to-orange-400' },
      'deep-healing': { emoji: '🔮', color: 'from-purple-400 to-violet-400' },
      'manifestation': { emoji: '🔥', color: 'from-red-400 to-pink-400' },
    };
    
    return styles[category as keyof typeof styles] || { emoji: '🧘‍♀️', color: 'from-primary to-primary-foreground' };
  };

  const categoryStyle = getCategoryStyle(sessionData.category);

  if (isSessionComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto">
          <div className="relative mb-8">
            <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center animate-pulse">
              <div className="text-4xl">✅</div>
            </div>
            <div className="absolute inset-0 w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-green-400/20 to-emerald-400/20 animate-ping" />
          </div>
          
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Session Complete!
          </h2>
          
          <p className="text-lg text-muted-foreground mb-8">
            Well done! Take a moment to notice how you feel after this peaceful journey.
          </p>

          <div className="space-y-4">
            <Button 
              onClick={handleRestart} 
              variant="outline" 
              className="w-full gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Meditate Again
            </Button>
            
            <Button 
              onClick={navigateBack} 
              className="w-full bg-gradient-to-r from-primary to-primary-foreground"
            >
              Continue Your Journey
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Audio element */}
      <audio
        ref={audioRef}
        src={sessionData.audio_url}
        preload="auto"
      />

      {/* Header */}
      <div className="relative z-10 p-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="text-white/80 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="text-center">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${categoryStyle.color} text-sm font-medium`}>
            <span>{categoryStyle.emoji}</span>
            <span className="text-white">{sessionData.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
          </div>
        </div>
        
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] p-4 space-y-8">
        {/* Session Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
            {sessionData.title}
          </h1>
          <p className="text-lg text-white/70 max-w-md">
            {sessionData.description}
          </p>
        </div>

        {/* Breathing Orb Animation */}
        <div className="relative flex items-center justify-center">
          <div 
            className="w-64 h-64 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 backdrop-blur-sm border border-white/10 flex items-center justify-center transition-transform duration-4000 ease-in-out"
            style={{ 
              transform: `scale(${breathingScale})`,
              boxShadow: '0 0 60px rgba(59, 130, 246, 0.3), inset 0 0 60px rgba(59, 130, 246, 0.1)'
            }}
          >
            <div className="w-48 h-48 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 backdrop-blur-sm flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/50 to-secondary/50 backdrop-blur-sm flex items-center justify-center">
                <div className="text-4xl animate-pulse">
                  {categoryStyle.emoji}
                </div>
              </div>
            </div>
          </div>
          
          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-white/20 rounded-full animate-bounce"
                style={{
                  left: `${20 + (i * 10)}%`,
                  top: `${30 + (i * 5)}%`,
                  animationDelay: `${i * 0.5}s`,
                  animationDuration: `${3 + (i * 0.2)}s`
                }}
              />
            ))}
          </div>
        </div>

        {/* Progress and Time */}
        <div className="w-full max-w-md space-y-3">
          <div className="flex justify-between text-sm text-white/60">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <Progress 
            value={progress} 
            className="h-2 bg-white/10"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
            }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className="text-white/60 hover:text-white hover:bg-white/10 w-12 h-12"
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>

          <Button
            onClick={togglePlayPause}
            size="lg"
            disabled={isLoading}
            className="w-20 h-20 rounded-full bg-gradient-to-r from-primary to-primary-foreground hover:scale-110 transition-all duration-300 shadow-lg shadow-primary/25"
          >
            {isLoading ? (
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-8 w-8 text-white" />
            ) : (
              <Play className="h-8 w-8 text-white ml-1" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleRestart}
            className="text-white/60 hover:text-white hover:bg-white/10 w-12 h-12"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>

        {/* Status Text */}
        <div className="text-center">
          <p className="text-white/60">
            {isLoading 
              ? "Loading meditation..." 
              : isPlaying 
                ? "Let the peaceful sounds guide you..." 
                : "Ready to begin your journey"
            }
          </p>
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="bg-slate-800 text-white border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Meditation?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              You're in the middle of your meditation session. Are you sure you want to leave? Your progress won't be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
              Continue Session
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmExit}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Leave Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MeditationPlayer;