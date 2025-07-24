import { useCallback } from 'react';
import { soundManager } from '@/utils/SoundManager';

/**
 * React hook for sound effects integration
 * Provides convenient methods to trigger app sounds
 */
export const useSound = () => {
  const playSound = useCallback(async (soundKey: string) => {
    try {
      await soundManager.play(soundKey);
    } catch (error) {
      console.log('Sound playback failed:', error);
    }
  }, []);

  const playAIThought = useCallback(() => playSound('ai_thought'), [playSound]);
  const playBodyScanCapture = useCallback(() => playSound('body_scan_camera'), [playSound]);
  const playChallengeWin = useCallback(() => playSound('challenge_win'), [playSound]);
  const playFoodLogConfirm = useCallback(() => playSound('food_log_confirm'), [playSound]);
  const playFriendAdded = useCallback(() => playSound('friend_added'), [playSound]);
  const playGoalHit = useCallback(() => playSound('goal_hit'), [playSound]);
  const playHealthScanCapture = useCallback(() => playSound('health_scan_capture'), [playSound]);
  const playProgressUpdate = useCallback(() => playSound('progress_update'), [playSound]);
  const playReminderChime = useCallback(() => playSound('reminder_chime'), [playSound]);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    soundManager.setSoundEnabled(enabled);
  }, []);

  const isSoundEnabled = useCallback(() => {
    return soundManager.isSoundEnabled();
  }, []);

  const setVolume = useCallback((volume: number) => {
    soundManager.setVolume(volume);
  }, []);

  return {
    playSound,
    playAIThought,
    playBodyScanCapture,
    playChallengeWin,
    playFoodLogConfirm,
    playFriendAdded,
    playGoalHit,
    playHealthScanCapture,
    playProgressUpdate,
    playReminderChime,
    setSoundEnabled,
    isSoundEnabled,
    setVolume
  };
};