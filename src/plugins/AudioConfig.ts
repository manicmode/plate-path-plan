/**
 * Audio Configuration Plugin for Native Platforms
 * Configures audio session for ambient/non-interrupting playback
 */

import { registerPlugin } from '@capacitor/core';

export interface AudioConfigPlugin {
  /**
   * Configure audio session for ambient playback
   * This ensures sounds don't interrupt background audio from other apps
   */
  configureAmbientAudio(): Promise<{ success: boolean }>;
  
  /**
   * Reset audio session to default behavior
   */
  resetAudioSession(): Promise<{ success: boolean }>;
}

const AudioConfig = registerPlugin<AudioConfigPlugin>('AudioConfig');

export default AudioConfig;