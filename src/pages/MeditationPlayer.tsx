import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Pause, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface MeditationSession {
  id: string;
  title: string;
  description: string;
  duration: number;
  audio_url: string;
  category: string;
}

export default function MeditationPlayer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Get session data from navigation state or sessionStorage
  const sessionData = location.state?.session || 
    JSON.parse(sessionStorage.getItem('currentMeditationSession') || 'null');
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(sessionData?.duration * 60 || 0);
  const [progress, setProgress] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [calmingMusicEnabled, setCalmingMusicEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if no session data
  useEffect(() => {
    if (!sessionData) {
      navigate('/guided-meditation');
      return;
    }
  }, [sessionData, navigate]);

  // Initialize audio
  useEffect(() => {
    if (!sessionData?.audio_url) return;

    const audio = new Audio(sessionData.audio_url);
    audioRef.current = audio;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      const totalDuration = audio.duration || sessionData.duration * 60;
      setProgress((audio.currentTime / totalDuration) * 100);
    };

    const updateDuration = () => {
      setDuration(audio.duration || sessionData.duration * 60);
      setIsLoading(false);
    };

    const onEnded = () => {
      handleSessionComplete();
    };

    const onError = () => {
      console.error('Audio load error');
      setIsLoading(false);
      toast({
        title: "⚠️ Audio Error",
        description: "Unable to load audio. Using timer mode instead.",
        duration: 3000,
      });
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('canplaythrough', () => setIsLoading(false));

    // Auto-start playback
    setTimeout(() => {
      audio.play().then(() => {
        setIsPlaying(true);
        setHasStarted(true);
      }).catch(() => {
        setIsLoading(false);
        toast({
          title: "🎵 Ready to Begin",
          description: "Tap the play button to start your meditation",
          duration: 3000,
        });
      });
    }, 1000);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
      audio.currentTime = 0;
    };
  }, [sessionData]);

  const handlePlayPause = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
        setHasStarted(true);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      toast({
        title: "⚠️ Playback Error",
        description: "Unable to play audio. Please check your connection.",
        duration: 3000,
      });
    }
  };

  const handleRestart = () => {
    if (!audioRef.current) return;
    
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    setProgress(0);
  };

  const handleSessionComplete = async () => {
    setIsPlaying(false);
    
    // Fade out audio smoothly
    if (audioRef.current && calmingMusicEnabled) {
      const fadeOutInterval = setInterval(() => {
        if (audioRef.current && audioRef.current.volume > 0.05) {
          audioRef.current.volume -= 0.05;
        } else {
          clearInterval(fadeOutInterval);
          if (audioRef.current) {
            audioRef.current.volume = 1;
          }
        }
      }, 100);
    }

    // Update meditation streak
    await updateMeditationStreak();
    
    // Show completion modal
    setShowCompletionModal(true);
  };

  const updateMeditationStreak = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];

      // Get current streak
      const { data: streakData } = await supabase
        .from('meditation_streaks')
        .select('*')
        .eq('user_id', user.id)
        .single();

      let newStreak = 1;
      let totalSessions = 1;

      if (streakData) {
        totalSessions = streakData.total_sessions + 1;
        
        // Check if last completed was yesterday
        const lastDate = new Date(streakData.last_completed_date);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastDate.toDateString() === yesterday.toDateString()) {
          newStreak = streakData.current_streak + 1;
        } else if (lastDate.toDateString() === new Date().toDateString()) {
          newStreak = streakData.current_streak; // Same day, no change
        } else {
          newStreak = 1; // Reset streak
        }
      }

      // Update or insert streak
      const { error } = await supabase
        .from('meditation_streaks')
        .upsert({
          user_id: user.id,
          current_streak: newStreak,
          last_completed_date: today,
          total_sessions: totalSessions,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error updating streak:', error);
      } else if (newStreak > 1) {
        toast({
          title: `🔥 ${newStreak} Day Streak!`,
          description: "Amazing consistency with your meditation practice!",
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Error updating meditation streak:', error);
    }
  };

  const handleCloseCompletion = () => {
    setShowCompletionModal(false);
    // Clear session data and navigate back
    sessionStorage.removeItem('currentMeditationSession');
    navigate('/guided-meditation');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCategoryEmoji = (category: string) => {
    const emojiMap: { [key: string]: string } = {
      'morning-boost': '🌞',
      'stress-relief': '🌿',
      'sleep-sounds': '🌙',
      'focus-flow': '🧠',
      'anxiety-ease': '💚',
      'deep-rest': '🌊'
    };
    return emojiMap[category] || '🧘‍♀️';
  };

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-xl font-semibold mb-2">No session selected</h2>
          <Button onClick={() => navigate('/guided-meditation')} variant="outline" className="border-white/30 text-white hover:bg-white/10">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Meditation
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-32 h-32 bg-purple-400/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-24 h-24 bg-blue-400/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-pink-400/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-black/10"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/guided-meditation')}
          className="text-white/80 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCalmingMusicEnabled(!calmingMusicEnabled)}
          className="text-white/80 hover:text-white hover:bg-white/10"
        >
          {calmingMusicEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        {/* Category Badge */}
        <Badge variant="secondary" className="mb-4 bg-white/10 text-white border-white/20">
          {getCategoryEmoji(sessionData.category)} {sessionData.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Badge>

        {/* Session Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 max-w-2xl">
          {sessionData.title}
        </h1>

        {/* Description */}
        <p className="text-white/80 text-lg mb-8 max-w-lg">
          {sessionData.description}
        </p>

        {/* Breathing Orb */}
        <div className="mb-12">
          <div className={`relative w-48 h-48 md:w-64 md:h-64 transition-all duration-4000 ${
            hasStarted ? 'animate-pulse scale-110' : 'scale-100'
          }`}>
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 shadow-2xl opacity-80"></div>
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-purple-300 to-blue-400 shadow-xl opacity-70"></div>
            <div className="absolute inset-8 rounded-full bg-gradient-to-br from-purple-200 to-blue-300 shadow-lg opacity-60"></div>
            <div className="absolute inset-12 rounded-full bg-white/40 shadow-inner flex items-center justify-center">
              <div className="text-4xl md:text-5xl">🧘‍♀️</div>
            </div>
            
            {/* Glow effect */}
            <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 blur-xl opacity-30 ${
              isPlaying ? 'animate-pulse' : ''
            }`}></div>
          </div>
        </div>

        {/* Progress */}
        <div className="w-full max-w-md mb-8">
          <div className="flex justify-between text-sm text-white/70 mb-3">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <Progress value={progress} className="h-2 bg-white/20" />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRestart}
            className="h-12 w-12 rounded-full text-white/80 hover:text-white hover:bg-white/10"
            disabled={isLoading}
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
          
          <Button
            size="lg"
            onClick={handlePlayPause}
            disabled={isLoading}
            className="h-16 w-16 rounded-full bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 shadow-xl shadow-purple-500/25"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
            ) : isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 ml-1" />
            )}
          </Button>
          
          <div className="w-12"></div> {/* Spacer for symmetry */}
        </div>

        {/* Instructions */}
        {!hasStarted && !isLoading && (
          <div className="mt-8 animate-fade-in">
            <p className="text-white/60 text-sm">
              Find a comfortable position and let yourself relax
            </p>
          </div>
        )}
      </div>

      {/* Completion Modal */}
      <Dialog open={showCompletionModal} onOpenChange={() => {}}>
        <DialogContent className="bg-gradient-to-br from-slate-800 to-purple-900 border-purple-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">Session Complete! ✅</DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <div className="text-6xl mb-4">🧘‍♀️</div>
            <h3 className="text-xl font-semibold mb-2">Well Done!</h3>
            <p className="text-white/80 mb-6">
              You've completed "{sessionData.title}". Your mind and body thank you for this moment of peace.
            </p>
            <Button 
              onClick={handleCloseCompletion}
              className="bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700"
            >
              Continue Journey
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}