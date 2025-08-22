import { useCallback, useEffect, useRef, useState } from "react";

type TalkBackOpts = { rate?: number; pitch?: number; voiceName?: string };

// Deterministic voice loading for iOS Safari
async function voicesReady(): Promise<SpeechSynthesisVoice[]> {
  let voices = speechSynthesis.getVoices();
  if (voices.length > 0) return voices;
  
  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const handler = () => {
      speechSynthesis.onvoiceschanged = null;
      const loadedVoices = speechSynthesis.getVoices();
      console.log(`[TalkBack] voicesReady loaded ${loadedVoices.length} voices`);
      resolve(loadedVoices);
    };
    
    speechSynthesis.onvoiceschanged = handler;
    speechSynthesis.getVoices(); // Poke loading
    setTimeout(() => {
      // Fallback timeout
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) handler();
    }, 1000);
  });
}

// Smart voice picker with iOS Safari optimization
function pickVoice(voices: SpeechSynthesisVoice[], preferredLang = 'en-US'): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  
  // Precedence: localService + Siri → Samantha → first localService en- → first en- → fallback first
  const siri = voices.find(v => v.localService && v.name.toLowerCase().includes('siri'));
  if (siri) {
    console.log(`[TalkBack] Selected Siri voice: ${siri.name} (${siri.lang})`);
    return siri;
  }
  
  const samantha = voices.find(v => v.name.toLowerCase().includes('samantha'));
  if (samantha) {
    console.log(`[TalkBack] Selected Samantha voice: ${samantha.name} (${samantha.lang})`);
    return samantha;
  }
  
  const localEn = voices.find(v => v.localService && v.lang.startsWith('en-'));
  if (localEn) {
    console.log(`[TalkBack] Selected local English voice: ${localEn.name} (${localEn.lang})`);
    return localEn;
  }
  
  const anyEn = voices.find(v => v.lang.startsWith('en-'));
  if (anyEn) {
    console.log(`[TalkBack] Selected English voice: ${anyEn.name} (${anyEn.lang})`);
    return anyEn;
  }
  
  console.log(`[TalkBack] Selected fallback voice: ${voices[0].name} (${voices[0].lang})`);
  return voices[0];
}

export function useTalkBack(opts: TalkBackOpts = {}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    ttsOnStart: false,
    ttsEnded: false,
    ttsError: '',
    selectedVoice: ''
  });
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load voices deterministically
  useEffect(() => {
    const load = async () => {
      const loadedVoices = await voicesReady();
      setVoices(loadedVoices);
      const selected = pickVoice(loadedVoices);
      setDebugInfo(prev => ({ 
        ...prev, 
        selectedVoice: selected ? `${selected.name} (${selected.lang})` : 'none' 
      }));
    };
    load();
    
    window.speechSynthesis.onvoiceschanged = load;
    return () => { 
      window.speechSynthesis.onvoiceschanged = null; 
    };
  }, []);

  const getSelectedVoice = useCallback(() => {
    return pickVoice(voices);
  }, [voices]);

  const stop = useCallback(() => {
    try { 
      window.speechSynthesis.cancel(); 
    } catch (e) {
      console.warn('Failed to cancel speech synthesis:', e);
    }
    setIsSpeaking(false);
    utterRef.current = null;
  }, []);

  const speak = useCallback(async (text: string): Promise<void> => {
    if (!text?.trim()) {
      console.warn('[TalkBack] Empty text provided');
      return Promise.resolve();
    }

    // Reset debug info
    setDebugInfo(prev => ({ ...prev, ttsOnStart: false, ttsEnded: false, ttsError: '' }));

    try {
      // Ensure voices are loaded
      const loadedVoices = await voicesReady();
      console.log(`[TalkBack] Loaded ${loadedVoices.length} voices`);
      
      // Resume if paused (iOS Safari fix)
      if (speechSynthesis.paused) {
        try { 
          speechSynthesis.resume();
          console.log('[TalkBack] Resumed paused synthesis'); 
        } catch (e) {
          console.warn('[TalkBack] Resume failed:', e);
        }
      }
      
      // Cancel any existing utterances
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterRef.current = utterance;
      
      // Configure utterance with iOS optimization
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      // Select voice deterministically
      const selectedVoice = pickVoice(loadedVoices);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
        setDebugInfo(prev => ({ 
          ...prev, 
          selectedVoice: `${selectedVoice.name} (${selectedVoice.lang})` 
        }));
      } else {
        utterance.lang = 'en-US';
        console.warn('[TalkBack] No voice selected, using system default');
      }
      
      return new Promise<void>((resolve, reject) => {
        let startWatchdog: NodeJS.Timeout | null = null;
        let endWatchdog: NodeJS.Timeout | null = null;
        
        // Start timeout - if onstart doesn't fire within 2.5s
        startWatchdog = setTimeout(() => {
          console.error('[TalkBack] Start timeout - onstart never fired');
          setDebugInfo(prev => ({ ...prev, ttsError: 'start-timeout' }));
          setIsSpeaking(false);
          utterRef.current = null;
          reject(new Error('start-timeout'));
        }, 2500);
        
        utterance.onstart = () => {
          console.log('[TalkBack] Speech started successfully');
          setDebugInfo(prev => ({ ...prev, ttsOnStart: true }));
          if (startWatchdog) {
            clearTimeout(startWatchdog);
            startWatchdog = null;
          }
          
          // End watchdog - 60s after start
          endWatchdog = setTimeout(() => {
            console.error('[TalkBack] End timeout - speech took too long');
            setDebugInfo(prev => ({ ...prev, ttsError: 'end-timeout' }));
            setIsSpeaking(false);
            utterRef.current = null;
            reject(new Error('end-timeout'));
          }, 60000);
        };
        
        utterance.onend = () => {
          console.log('[TalkBack] Speech completed successfully');
          setDebugInfo(prev => ({ ...prev, ttsEnded: true }));
          if (startWatchdog) clearTimeout(startWatchdog);
          if (endWatchdog) clearTimeout(endWatchdog);
          setIsSpeaking(false);
          utterRef.current = null;
          resolve();
        };
        
        utterance.onerror = (e) => {
          console.error('[TalkBack] Speech error:', e);
          const errorMsg = e.error?.toString() || 'unknown';
          setDebugInfo(prev => ({ ...prev, ttsError: errorMsg }));
          if (startWatchdog) clearTimeout(startWatchdog);
          if (endWatchdog) clearTimeout(endWatchdog);
          setIsSpeaking(false);
          utterRef.current = null;
          reject(e.error || e);
        };
        
        setIsSpeaking(true);
        speechSynthesis.speak(utterance);
        console.log(`[TalkBack] Speech queued: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
      });
      
    } catch (e) {
      console.error('[TalkBack] Speak failed:', e);
      setDebugInfo(prev => ({ ...prev, ttsError: e instanceof Error ? e.message : 'unknown' }));
      setIsSpeaking(false);
      utterRef.current = null;
      throw e;
    }
  }, []);

  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

  return { canSpeak, isSpeaking, speak, stop, voices, getSelectedVoice, debugInfo };
}