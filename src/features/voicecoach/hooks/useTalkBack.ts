import { useCallback, useEffect, useRef, useState } from "react";

type TalkBackOpts = { rate?: number; pitch?: number; voiceName?: string };

// Robust voice loader for iOS Safari
async function ensureVoices(): Promise<SpeechSynthesisVoice[]> {
  let voices = speechSynthesis.getVoices();
  if (voices.length) return voices;
  
  await new Promise<void>(resolve => {
    const handler = () => { 
      speechSynthesis.onvoiceschanged = null; 
      resolve(); 
    };
    speechSynthesis.onvoiceschanged = handler;
    // Poke loading
    speechSynthesis.getVoices();
    setTimeout(handler, 800);
  });
  
  return speechSynthesis.getVoices();
}

export function useTalkBack(opts: TalkBackOpts = {}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load voices (iOS may emit voices asynchronously)
  useEffect(() => {
    const load = async () => {
      const loadedVoices = await ensureVoices();
      setVoices(loadedVoices);
    };
    load();
    
    window.speechSynthesis.onvoiceschanged = load;
    return () => { 
      window.speechSynthesis.onvoiceschanged = null; 
    };
  }, []);

  const pickVoice = useCallback(() => {
    if (!voices.length) return null;
    // Prefer configured name; else pick an English voice if present; else first
    const byName = opts.voiceName ? voices.find(v => v.name.includes(opts.voiceName!)) : null;
    const en = voices.find(v => /^en[-_]/i.test(v.lang));
    return byName || en || voices[0];
  }, [voices, opts.voiceName]);

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

    try {
      // Ensure voices are loaded (critical for iOS)
      await ensureVoices();
      
      // Resume if paused (iOS Safari fix)
      if (speechSynthesis.paused) {
        try { 
          speechSynthesis.resume(); 
        } catch (e) {
          console.warn('[TalkBack] Resume failed:', e);
        }
      }
      
      // Cancel any existing utterances
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterRef.current = utterance;
      
      // Configure utterance
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';
      
      // Pick best English voice
      const availableVoices = speechSynthesis.getVoices();
      const englishVoice = availableVoices.find(v => /en/i.test(v.lang)) || availableVoices[0];
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
      
      return new Promise<void>((resolve, reject) => {
        utterance.onend = () => {
          console.log('[TalkBack] Speech completed');
          setIsSpeaking(false);
          utterRef.current = null;
          resolve();
        };
        
        utterance.onerror = (e) => {
          console.error('[TalkBack] Speech error:', e);
          setIsSpeaking(false);
          utterRef.current = null;
          reject(e.error || e);
        };
        
        setIsSpeaking(true);
        speechSynthesis.speak(utterance);
        console.log('[TalkBack] Speech started');
      });
      
    } catch (e) {
      console.error('[TalkBack] Speak failed:', e);
      setIsSpeaking(false);
      utterRef.current = null;
      throw e;
    }
  }, []);

  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

  return { canSpeak, isSpeaking, speak, stop, voices, pickVoice };
}