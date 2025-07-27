import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Play, Pause, RotateCcw } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MeditationSession {
  id: string;
  category: string;
  duration: number;
  title: string;
  description: string;
  audio_url: string;
  image_url?: string;
}

interface MeditationPlayerProps {
  session?: MeditationSession;
}

export const MeditationPlayer: React.FC<MeditationPlayerProps> = ({ session }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  // Get session from sessionStorage if not passed as prop
  const currentSession = session || JSON.parse(sessionStorage.getItem('currentMeditationSession') || 'null');

  useEffect(() => {
    if (!currentSession) {
      navigate('/guided-meditation');
      return;
    }

    // Initialize audio
    const audio = new Audio(currentSession.audio_url);
    audioRef.current = audio;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const updateDuration = () => {
      setDuration(audio.duration);
    };

    const onEnded = () => {
      handleSessionComplete();
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
      audio.currentTime = 0;
    };
  }, [currentSession]);

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
    
    // Fade out audio
    if (audioRef.current) {
      const fadeOutInterval = setInterval(() => {
        if (audioRef.current && audioRef.current.volume > 0.1) {
          audioRef.current.volume -= 0.1;
        } else {
          clearInterval(fadeOutInterval);
          if (audioRef.current) {
            audioRef.current.volume = 1;
          }
        }
      }, 100);
    }

    // Show completion toast
    toast({
      title: "Session Complete! 🧘‍♀️",
      description: `Great job completing "${currentSession.title}"!`,
      duration: 4000,
    });

    // Update meditation streak
    await updateMeditationStreak();
    
    // Navigate back after a delay
    setTimeout(() => {
      navigate('/guided-meditation');
    }, 2000);
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
          description: "Keep up the great work with your meditation practice!",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error updating meditation streak:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">No session selected</h2>
          <Button onClick={() => navigate('/guided-meditation')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Meditation
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-32 h-32 bg-purple-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-24 h-24 bg-indigo-200 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-pink-200 rounded-full opacity-25 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-6 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/guided-meditation')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-gray-800">{currentSession.title}</h1>
          <p className="text-sm text-gray-600">{currentSession.duration} minutes</p>
        </div>
        <div className="w-20"></div> {/* Spacer for centered title */}
      </div>

      {/* Main Player */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Breathing Orb */}
        <div className="mb-12">
          <div className={`relative w-48 h-48 rounded-full bg-gradient-to-br from-purple-300 to-indigo-400 shadow-2xl transition-all duration-4000 ${
            hasStarted ? 'animate-pulse scale-110' : 'scale-100'
          }`}>
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-purple-200 to-indigo-300 shadow-inner"></div>
            <div className="absolute inset-8 rounded-full bg-gradient-to-br from-purple-100 to-indigo-200 shadow-inner"></div>
            <div className="absolute inset-12 rounded-full bg-white/80 shadow-inner flex items-center justify-center">
              <div className="text-2xl text-purple-600">🧘‍♀️</div>
            </div>
          </div>
        </div>

        {/* Session Info */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{currentSession.title}</h2>
          <p className="text-gray-600 max-w-md">{currentSession.description}</p>
        </div>

        {/* Progress */}
        <div className="w-full max-w-md mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRestart}
            className="h-12 w-12 rounded-full"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
          
          <Button
            size="lg"
            onClick={handlePlayPause}
            className="h-16 w-16 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-lg"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 ml-1" />
            )}
          </Button>
          
          <div className="w-12"></div> {/* Spacer for symmetry */}
        </div>

        {/* Instructions */}
        {!hasStarted && (
          <div className="mt-8 text-center animate-fade-in">
            <p className="text-gray-600 text-sm">
              Find a comfortable position and press play when you're ready
            </p>
          </div>
        )}
      </div>
    </div>
  );
};