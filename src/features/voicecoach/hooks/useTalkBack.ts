import { useCallback, useEffect, useRef, useState } from "react";

type TalkBackOpts = { rate?: number; pitch?: number; voiceName?: string };

export function useTalkBack(opts: TalkBackOpts = {}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load voices (iOS may emit voices asynchronously)
  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis.getVoices());
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

  const speak = useCallback((text: string) => new Promise<void>((resolve, reject) => {
    try {
      stop(); // cancel any ongoing utterance
      const u = new SpeechSynthesisUtterance(text);
      utterRef.current = u;
      const v = pickVoice();
      if (v) u.voice = v;
      u.rate = opts.rate ?? 1.0;
      u.pitch = opts.pitch ?? 1.0;
      u.onend = () => { 
        setIsSpeaking(false); 
        utterRef.current = null;
        resolve(); 
      };
      u.onerror = (e) => { 
        setIsSpeaking(false); 
        utterRef.current = null;
        reject(e.error || e); 
      };
      setIsSpeaking(true);
      window.speechSynthesis.speak(u);
    } catch (e) { 
      setIsSpeaking(false); 
      utterRef.current = null;
      reject(e); 
    }
  }), [pickVoice, stop, opts.rate, opts.pitch]);

  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

  return { canSpeak, isSpeaking, speak, stop, voices, pickVoice };
}