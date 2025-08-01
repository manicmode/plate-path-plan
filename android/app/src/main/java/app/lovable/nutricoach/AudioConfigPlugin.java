package app.lovable.nutricoach;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * AudioConfig Plugin for Android
 * Configures audio for ambient playback that doesn't interrupt background audio
 */
@CapacitorPlugin(name = "AudioConfig")
public class AudioConfigPlugin extends Plugin {

    private AudioManager audioManager;
    private AudioAttributes ambientAudioAttributes;

    @Override
    public void load() {
        super.load();
        audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        
        // Create audio attributes for ambient sound effects
        // USAGE_ASSISTANCE_SONIFICATION is for brief notification sounds
        // that should not interrupt other audio
        ambientAudioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
    }

    @PluginMethod
    public void configureAmbientAudio(PluginCall call) {
        try {
            // On Android, we don't need to request audio focus for brief sound effects
            // The USAGE_ASSISTANCE_SONIFICATION usage type automatically handles this
            // appropriately without interrupting background audio
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to configure ambient audio: " + e.getMessage());
        }
    }

    @PluginMethod
    public void resetAudioSession(PluginCall call) {
        try {
            // Android handles audio focus automatically based on usage type
            // No explicit reset needed for our use case
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to reset audio session: " + e.getMessage());
        }
    }

    /**
     * Get the configured audio attributes for ambient playback
     * This can be used by other audio components in the app
     */
    public AudioAttributes getAmbientAudioAttributes() {
        return ambientAudioAttributes;
    }
}