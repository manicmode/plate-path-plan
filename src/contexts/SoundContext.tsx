import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { soundManager } from '@/utils/SoundManager';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

interface SoundContextType {
  isEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  playSound: (soundKey: string) => Promise<void>;
  getAudioStatus: () => any;
  getMobileAudioDiagnostics: () => any;
  forceInitialize: () => Promise<void>;
  // Convenience methods for specific sounds
  playAIThought: () => Promise<void>;
  playBodyScanCapture: () => Promise<void>;
  playChallengeWin: () => Promise<void>;
  playFoodLogConfirm: () => Promise<void>;
  playFriendAdded: () => Promise<void>;
  playGoalHit: () => Promise<void>;
  playHealthScanCapture: () => Promise<void>;
  playProgressUpdate: () => Promise<void>;
  playReminderChime: () => Promise<void>;
  isSoundEnabled: () => boolean;
  setVolume: (volume: number) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

interface SoundProviderProps {
  children: ReactNode;
}

export const SoundProvider: React.FC<SoundProviderProps> = ({ children }) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const { user } = useAuth();

  useEffect(() => {
    // Load initial sound preference
    setIsEnabled(soundManager.isSoundEnabled());
  }, []);

  useEffect(() => {
    // Initialize sound system when user logs in
    if (user) {
      console.log('🔊 User logged in, preparing sound system');
      // The sound system will initialize on first user interaction
    }
  }, [user]);

  const setSoundEnabled = (enabled: boolean) => {
    setIsEnabled(enabled);
    soundManager.setSoundEnabled(enabled);
    
    if (enabled) {
      toast.success('🔊 Sounds enabled');
    } else {
      toast.info('🔇 Sounds disabled');
    }
  };

  const playSound = async (soundKey: string) => {
    console.log(`🔊 SoundContext: Playing sound "${soundKey}", enabled: ${isEnabled}`);
    if (!isEnabled) {
      console.log('🔊 SoundContext: Sound disabled by user preference');
      return;
    }
    try {
      await soundManager.play(soundKey);
      console.log(`🔊 SoundContext: Successfully played "${soundKey}"`);
    } catch (error) {
      console.warn('🔊 SoundContext: Sound playback failed:', error);
    }
  };

  const getAudioStatus = () => {
    return soundManager.getStatus();
  };

  const getMobileAudioDiagnostics = () => {
    return soundManager.getMobileAudioDiagnostics();
  };

  const forceInitialize = async () => {
    try {
      await soundManager.forceInitialize();
      toast.success('🔊 Audio system initialized');
    } catch (error) {
      console.warn('Audio initialization failed:', error);
      toast.error('Failed to initialize audio system');
    }
  };

  // Convenience methods for specific sounds
  const playAIThought = () => playSound('ai_thought');
  const playBodyScanCapture = () => playSound('body_scan_camera');
  const playChallengeWin = () => playSound('challenge_win');
  const playFoodLogConfirm = () => playSound('food_log_confirm');
  const playFriendAdded = () => playSound('friend_added');
  const playGoalHit = () => playSound('goal_hit');
  const playHealthScanCapture = () => playSound('health_scan_capture');
  const playProgressUpdate = () => playSound('progress_update');
  const playReminderChime = () => playSound('reminder_chime');

  const isSoundEnabledCheck = () => soundManager.isSoundEnabled();
  const setVolume = (volume: number) => soundManager.setVolume(volume);

  const value: SoundContextType = {
    isEnabled,
    setSoundEnabled,
    playSound,
    getAudioStatus,
    getMobileAudioDiagnostics,
    forceInitialize,
    playAIThought,
    playBodyScanCapture,
    playChallengeWin,
    playFoodLogConfirm,
    playFriendAdded,
    playGoalHit,
    playHealthScanCapture,
    playProgressUpdate,
    playReminderChime,
    isSoundEnabled: isSoundEnabledCheck,
    setVolume
  };

  return (
    <SoundContext.Provider value={value}>
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = (): SoundContextType => {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
};