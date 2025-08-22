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
      const loadedVoices = await ensureVoices();
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
      
      // Configure utterance
      utterance.rate = opts.rate ?? 1.0;
      utterance.pitch = opts.pitch ?? 1.0;
      utterance.lang = 'en-US';
      
      // Use properly loaded voices (CRITICAL FIX)
      const selectedVoice = pickVoice();
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log(`[TalkBack] Selected voice: ${selectedVoice.name} (${selectedVoice.lang})`);
      } else {
        console.warn('[TalkBack] No voice selected, using system default');
      }
      
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('[TalkBack] Speech timeout - falling back to text');
          setIsSpeaking(false);
          utterRef.current = null;
          reject(new Error('Speech timeout'));
        }, 30000); // 30s timeout
        
        utterance.onend = () => {
          clearTimeout(timeout);
          console.log('[TalkBack] Speech completed successfully');
          setIsSpeaking(false);
          utterRef.current = null;
          resolve();
        };
        
        utterance.onerror = (e) => {
          clearTimeout(timeout);
          console.error('[TalkBack] Speech error:', e);
          setIsSpeaking(false);
          utterRef.current = null;
          reject(e.error || e);
        };
        
        setIsSpeaking(true);
        speechSynthesis.speak(utterance);
        console.log(`[TalkBack] Speech started: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
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