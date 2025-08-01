import Foundation
import Capacitor
import AVFoundation

/**
 * AudioConfig Plugin for iOS
 * Configures AVAudioSession for ambient playback that doesn't interrupt background audio
 */
@objc(AudioConfigPlugin)
public class AudioConfigPlugin: CAPPlugin {
    
    @objc func configureAmbientAudio(_ call: CAPPluginCall) {
        do {
            let audioSession = AVAudioSession.sharedInstance()
            
            // Set audio session category to ambient with mixWithOthers option
            // This allows our sounds to play alongside music from other apps
            try audioSession.setCategory(.ambient, mode: .default, options: [.mixWithOthers])
            
            // Activate the audio session
            try audioSession.setActive(true)
            
            call.resolve([
                "success": true
            ])
        } catch {
            call.reject("Failed to configure ambient audio: \(error.localizedDescription)")
        }
    }
    
    @objc func resetAudioSession(_ call: CAPPluginCall) {
        do {
            let audioSession = AVAudioSession.sharedInstance()
            
            // Reset to default playback category
            try audioSession.setCategory(.playback, mode: .default)
            try audioSession.setActive(true)
            
            call.resolve([
                "success": true
            ])
        } catch {
            call.reject("Failed to reset audio session: \(error.localizedDescription)")
        }
    }
}