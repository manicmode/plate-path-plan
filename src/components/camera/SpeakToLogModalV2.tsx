import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DialogTitle, DialogDescription } from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Mic, MicOff, X, Sparkles, Edit3, RotateCcw, Languages,
  Wand2, CheckCircle, AlertCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import confetti from 'canvas-confetti';
import { submitTextLookup } from '@/lib/food/textLookup';
import { useWaveform } from '@/hooks/useWaveform';
import { useRotatingExamples } from '@/hooks/useRotatingExamples';
import { useVAD } from '@/hooks/useVAD';
import { TranscriptChips } from '@/components/ui/TranscriptChips';
import { ProcessingStepper } from '@/components/ui/ProcessingStepper';
import { FOOD_TEXT_DEBUG, ENABLE_SPEAK_CONFETTI } from '@/lib/flags';
import { SFX } from '@/lib/sfx/sfxManager';

interface SpeakToLogModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  onResults: (items: any[]) => void;
  onOpenManualEntry?: () => void;
}

type ModalState = 'idle' | 'listening' | 'processing' | 'result' | 'error' | 'permission-denied';
type Language = 'auto' | 'en-US' | 'es-ES' | 'fr-FR';
type StepStatus = 'pending' | 'active' | 'completed';

interface ProcessingStep {
  key: string;
  label: string;
  status: StepStatus;
}

const EXAMPLE_PHRASES = [
  "grilled chicken and rice",
  "acai bowl with granola", 
  "two eggs and toast",
  "caesar salad with chicken",
  "protein smoothie with banana",
  "avocado toast whole grain"
];

const PROCESSING_STEPS: ProcessingStep[] = [
  { key: 'transcribing', label: 'Transcribing speech', status: 'pending' },
  { key: 'parsing', label: 'Understanding foods', status: 'pending' },
  { key: 'finding', label: 'Finding nutrition data', status: 'pending' }
];

export const SpeakToLogModalV2: React.FC<SpeakToLogModalV2Props> = ({
  isOpen,
  onClose,
  onResults,
  onOpenManualEntry
}) => {
  // States
  const [state, setState] = useState<ModalState>('idle');
  const [transcript, setTranscript] = useState('');
  const [transcriptWords, setTranscriptWords] = useState<string[]>([]);
  const [language, setLanguage] = useState<Language>('auto');
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>(PROCESSING_STEPS.map(s => ({ ...s })));
  const [results, setResults] = useState<any[]>([]);
  const [editedTranscript, setEditedTranscript] = useState('');
  const [showLanguageSelect, setShowLanguageSelect] = useState(false);

  // Refs
  const recognitionRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Hooks
  const { currentExample, onMouseEnter, onMouseLeave } = useRotatingExamples(EXAMPLE_PHRASES);
  const { isSpeaking, analyser, cleanup: vadCleanup } = useVAD(audioStream, {
    threshold: 0.01,
    silenceDurationMs: 1500,
    onSilence: handleAutoStop
  });
  
  useWaveform(canvasRef, {
    analyser,
    isActive: state === 'listening',
    color: '#10b981'
  });

  // Telemetry logging
  const logTelemetry = (event: string, data?: any) => {
    if (FOOD_TEXT_DEBUG) {
      console.log(`[SPEECH][${event.toUpperCase()}]`, data);
    }
  };

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language === 'auto' ? 'en-US' : language;
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPart = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPart;
          } else {
            interimTranscript += transcriptPart;
          }
        }
        
        const fullTranscript = finalTranscript + interimTranscript;
        setTranscript(fullTranscript);
        
        // Split into words for chips
        if (fullTranscript.trim()) {
          const words = fullTranscript.trim().split(/\s+/);
          setTranscriptWords(words);
        }
      };
      
      recognition.onerror = (event: any) => {
        logTelemetry('ERROR', { code: event.error });
        
        if (event.error === 'not-allowed') {
          setState('permission-denied');
        } else {
          toast.error('Speech recognition error. Please try again.');
          setState('error');
        }
      };
      
      recognition.onend = () => {
        if (state === 'listening') {
          setState('idle');
        }
      };
      
      recognitionRef.current = recognition;
    }
  }, [language]);

  // Auto-stop handler
  function handleAutoStop() {
    if (state === 'listening' && transcript.trim()) {
      stopListening();
      triggerHaptic('selectionChanged');
      logTelemetry('AUTOSTOP', { duration: Date.now() - (timeoutRef.current as any) });
    }
  }

  // Haptic feedback
  const triggerHaptic = async (type: 'soft' | 'success' | 'selectionChanged') => {
    try {
      const styleMap = {
        soft: ImpactStyle.Light,
        success: ImpactStyle.Medium,
        selectionChanged: ImpactStyle.Light
      };
      await Haptics.impact({ style: styleMap[type] });
    } catch (error) {
      // Ignore haptics errors on web
    }
  };

  // Sound effects
  const playSound = (type: 'start' | 'stop') => {
    try {
      // Use basic console log for now since SFX keys might vary
      console.log(`[SOUND] Playing ${type} sound`);
    } catch (error) {
      // Ignore sound errors
    }
  };

  const startListening = async () => {
    try {
      logTelemetry('OPEN');
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      setAudioStream(stream);
      
      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setState('listening');
        setTranscript('');
        setTranscriptWords([]);
        timeoutRef.current = setTimeout(() => {}, Date.now()); // For duration tracking
        
        triggerHaptic('soft');
        playSound('start');
        logTelemetry('START');
        
        toast.success('Listening... Speak your food items now.');
      } else {
        setState('error');
        toast.error('Speech recognition not supported in this browser');
      }
      
    } catch (error) {
      logTelemetry('ERROR', { code: 'mic-denied' });
      setState('permission-denied');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && state === 'listening') {
      recognitionRef.current.stop();
    }
    
    // Clean up audio stream
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
    
    vadCleanup();
    setState('idle');
    playSound('stop');
    logTelemetry('STOP', { duration: timeoutRef.current ? Date.now() - (timeoutRef.current as any) : 0 });
  };

  const processTranscript = async (textToProcess: string = transcript) => {
    const cleanTranscript = textToProcess.trim();
    if (!cleanTranscript) {
      toast.error('Please speak something first');
      return;
    }

    setState('processing');
    logTelemetry('TRANSCRIBE', { textLen: cleanTranscript.length, lang: language });

    // Animate processing steps
    const stepKeys = ['transcribing', 'parsing', 'finding'];
    for (let i = 0; i < stepKeys.length; i++) {
      setProcessingSteps(prev => prev.map(s => 
        s.key === stepKeys[i] ? { ...s, status: 'active' as StepStatus } : 
        stepKeys.indexOf(s.key) < i ? { ...s, status: 'completed' as StepStatus } : s
      ));
      
      // Small delay between steps for visual feedback
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    try {
      // Use unified text lookup
      const { items } = await submitTextLookup(cleanTranscript, { source: 'speech' });

      // Complete all steps
      setProcessingSteps(prev => prev.map(s => ({ ...s, status: 'completed' as StepStatus })));

      if (!items || items.length === 0) {
        setState('error');
        toast.error('No food items recognized. Please try speaking more clearly.');
        logTelemetry('PARSE', { itemsCount: 0, confidence: 0 });
        return;
      }

      logTelemetry('PARSE', { itemsCount: items.length, confidence: items[0]?.confidence || 0 });
      
      // Show success with confetti
      if (ENABLE_SPEAK_CONFETTI) {
        confetti({
          particleCount: 10,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#10b981', '#34d399', '#6ee7b7']
        });
      }
      
      triggerHaptic('success');
      setResults(items);
      setState('result');
      toast.success(`Found ${items.length} food item${items.length > 1 ? 's' : ''} from your speech!`);
      
    } catch (error) {
      setState('error');
      logTelemetry('ERROR', { code: 'processing-failed', message: (error as Error).message });
      toast.error('Failed to process speech. Please try again.');
    }
  };

  const handleConfirm = () => {
    onResults(results);
    handleClose();
  };

  const handleClose = () => {
    logTelemetry('CLOSE');
    
    if (state === 'listening') {
      stopListening();
    }
    
    // Cleanup
    vadCleanup();
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
    
    // Reset state
    setState('idle');
    setTranscript('');
    setTranscriptWords([]);
    setResults([]);
    setEditedTranscript('');
    setShowLanguageSelect(false);
    setProcessingSteps(PROCESSING_STEPS.map(s => ({ ...s })));
    
    onClose();
  };

  const editWord = (index: number) => {
    const newWords = [...transcriptWords];
    const editedWord = prompt(`Edit word: "${transcriptWords[index]}"`, transcriptWords[index]);
    if (editedWord !== null && editedWord.trim()) {
      newWords[index] = editedWord.trim();
      setTranscriptWords(newWords);
      setTranscript(newWords.join(' '));
    }
  };

  const removeWord = (index: number) => {
    const newWords = transcriptWords.filter((_, i) => i !== index);
    setTranscriptWords(newWords);
    setTranscript(newWords.join(' '));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.code === 'Space' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (state === 'idle') {
          startListening();
        } else if (state === 'listening') {
          stopListening();
        }
      }
      
      if (e.code === 'Enter' && state === 'result') {
        e.preventDefault();
        handleConfirm();
      }
      
      if (e.code === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, state]);

  // Announce state changes for accessibility
  const ariaLiveMessage = {
    idle: '',
    listening: 'Listening for speech',
    processing: 'Processing speech and finding foods',
    result: `Found ${results.length} food items`,
    error: 'An error occurred',
    'permission-denied': 'Microphone access denied'
  }[state];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-0 p-0 overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Speak to Log Food</DialogTitle>
        </VisuallyHidden>
        <VisuallyHidden>
          <DialogDescription>
            Record your voice to automatically detect and log food items
          </DialogDescription>
        </VisuallyHidden>

        {/* Accessibility announcements */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {ariaLiveMessage}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Mic className="h-6 w-6 text-emerald-500" />
              {state === 'listening' && (
                <motion.div
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
                />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Speak to Log Food
              </h3>
              {state === 'listening' && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  ● Live
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {state === 'listening' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLanguageSelect(!showLanguageSelect)}
                className="text-gray-500 hover:text-gray-700"
              >
                <Languages className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Language selector */}
        <AnimatePresence>
          {showLanguageSelect && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-6 pb-4"
            >
              <Select value={language} onValueChange={(value: Language) => setLanguage(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  <SelectItem value="en-US">English</SelectItem>
                  <SelectItem value="es-ES">Spanish</SelectItem>
                  <SelectItem value="fr-FR">French</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="px-6 pb-6 space-y-6">
          
          {/* Waveform */}
          {(state === 'listening' || state === 'processing') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 56 }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full"
            >
              <canvas
                ref={canvasRef}
                className="w-full h-14 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20"
                style={{ width: '100%', height: '56px' }}
              />
            </motion.div>
          )}

          {/* Transcript Chips */}
          <AnimatePresence mode="wait">
            {state === 'idle' && (
              <motion.div
                key="idle-chips"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center space-y-4"
              >
                <motion.div
                  onMouseEnter={onMouseEnter}
                  onMouseLeave={onMouseLeave}
                  animate={{ y: [-2, 2, -2] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="inline-block px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-800/30 dark:to-teal-800/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium"
                >
                  "{currentExample}"
                </motion.div>
              </motion.div>
            )}

            {(state === 'listening' || state === 'result') && transcriptWords.length > 0 && (
              <motion.div
                key="transcript-chips"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <TranscriptChips
                  words={transcriptWords}
                  isEditable={state === 'result'}
                  onEdit={editWord}
                  onRemove={removeWord}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Processing Stepper */}
          {state === 'processing' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-4"
            >
              <ProcessingStepper steps={processingSteps} />
            </motion.div>
          )}

          {/* Results Summary */}
          {state === 'result' && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="text-center">
                <CheckCircle className="inline-block h-8 w-8 text-emerald-500 mb-2" />
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Found {results.length} food item{results.length > 1 ? 's' : ''}
                </h4>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2">
                {results.slice(0, 2).map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{item.name}</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{item.calories} cal</span>
                  </div>
                ))}
                {results.length > 2 && (
                  <div className="text-xs text-gray-500 text-center pt-2">
                    +{results.length - 2} more item{results.length > 3 ? 's' : ''}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Error States */}
          {state === 'permission-denied' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-4"
            >
              <AlertCircle className="mx-auto h-12 w-12 text-orange-500" />
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900 dark:text-white">Microphone Access Needed</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enable microphone permissions in your browser to use voice logging.
                </p>
              </div>
            </motion.div>
          )}

          {state === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-4"
            >
              <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900 dark:text-white">Didn't catch that</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Try speaking closer to your microphone or use manual entry.
                </p>
              </div>
            </motion.div>
          )}

          {/* Primary Action Button */}
          <div className="flex justify-center">
            {state === 'idle' && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={startListening}
                  className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-2xl hover:shadow-3xl transition-all duration-300"
                >
                  <Mic className="h-12 w-12" />
                </Button>
              </motion.div>
            )}

            {state === 'listening' && (
              <motion.div
                animate={{ 
                  boxShadow: [
                    "0 0 0 0 rgba(16, 185, 129, 0.4)",
                    "0 0 0 20px rgba(16, 185, 129, 0)",
                    "0 0 0 0 rgba(16, 185, 129, 0)"
                  ]
                }}
                transition={{ repeat: Infinity, duration: 2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={stopListening}
                  className="w-32 h-32 rounded-full bg-gradient-to-br from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white shadow-2xl"
                >
                  <MicOff className="h-12 w-12" />
                </Button>
              </motion.div>
            )}

            {state === 'processing' && (
              <Button
                disabled
                className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 text-white shadow-xl"
              >
                <Wand2 className="h-8 w-8 animate-pulse" />
              </Button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {state === 'idle' && (
              <>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={onOpenManualEntry}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Find Food
                </Button>
              </>
            )}

            {(state === 'listening' || state === 'processing') && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTranscript('');
                    setTranscriptWords([]);
                  }}
                  disabled={state === 'processing'}
                  className="flex-1"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Clear
                </Button>
                <Button
                  variant="outline"
                  onClick={stopListening}
                  disabled={state === 'processing'}
                  className="flex-1"
                >
                  Stop
                </Button>
              </>
            )}

            {state === 'result' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setState('idle')}
                  className="flex-1"
                >
                  Try Again
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Review & Log
                </Button>
              </>
            )}

            {(state === 'error' || state === 'permission-denied') && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setState('idle')}
                  className="flex-1"
                >
                  Try Again
                </Button>
                <Button
                  onClick={onOpenManualEntry}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Manual Entry
                </Button>
              </>
            )}
          </div>

          {/* Tips */}
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {state === 'idle' && 'Try speaking naturally about your meal'}
              {state === 'listening' && 'Tap Stop when done or wait for auto-stop'}
              {state === 'processing' && 'AI is understanding your foods...'}
              {state === 'result' && 'Tap chips above to edit words'}
              {(state === 'error' || state === 'permission-denied') && 'Press Space to start recording'}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};