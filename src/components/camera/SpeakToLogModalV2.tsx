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
  Wand2, CheckCircle, AlertCircle, Settings, Trash2, Loader2
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
      <DialogContent className="max-w-md mx-auto bg-slate-900/70 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl/20 p-0 overflow-hidden">
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

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="p-6 md:p-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            {/* Left: Mic icon in branded pill */}
            <div className="flex items-center gap-3">
              <motion.div 
                className="px-3 py-2 rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 flex items-center gap-2"
                animate={state === 'listening' ? { scale: [1, 1.05, 1] } : {}}
                transition={{ repeat: state === 'listening' ? Infinity : 0, duration: 2 }}
              >
                <Mic className="h-4 w-4 text-white" />
                {state === 'listening' && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-2 h-2 bg-white rounded-full"
                  />
                )}
              </motion.div>
              <h3 className="text-lg font-semibold text-white">
                Speak to Log Food
              </h3>
            </div>
            
            {/* Right: Close button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full w-8 h-8 p-0 focus:ring-2 focus:ring-sky-400"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Transcript Bubble */}
          <TranscriptBubble 
            transcript={transcript}
            isListening={state === 'listening'}
            isReady={state === 'result'}
            onEdit={setTranscript}
            onClear={() => {
              setTranscript('');
              setTranscriptWords([]);
            }}
          />

          {/* Main Mic Control */}
          <div className="flex flex-col items-center my-8">
            <MicButton 
              state={state}
              onPress={state === 'idle' ? startListening : state === 'listening' ? stopListening : undefined}
              canvasRef={canvasRef}
            />
            
            {/* Helper Text */}
            <motion.p 
              key={state}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-sm text-slate-400 text-center"
            >
              {getHelperText(state)}
            </motion.p>
          </div>

          {/* Suggestions (Idle state only) */}
          <AnimatePresence>
            {state === 'idle' && !transcript && (
              <SuggestionChips 
                phrases={EXAMPLE_PHRASES.slice(0, 3)}
                onSelect={(phrase) => {
                  setTranscript(phrase);
                  setTranscriptWords(phrase.split(' '));
                  logTelemetry('UX', { event: 'suggestions_click', text: phrase });
                }}
              />
            )}
          </AnimatePresence>

          {/* Processing Steps */}
          <AnimatePresence>
            {state === 'processing' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6"
              >
                <ProcessingStepper steps={processingSteps} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Summary */}
          <AnimatePresence>
            {state === 'result' && results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">
                    Found {results.length} food item{results.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-1">
                  {results.slice(0, 2).map((item: any, index: number) => (
                    <div key={index} className="text-sm text-slate-300">
                      • {item.name} ({item.calories || 0} cal)
                    </div>
                  ))}
                  {results.length > 2 && (
                    <div className="text-sm text-slate-400">
                      +{results.length - 2} more...
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error States */}
          <AnimatePresence>
            {(state === 'error' || state === 'permission-denied') && (
              <ErrorCallout 
                state={state}
                onRetry={() => setState('idle')}
                onManualEntry={onOpenManualEntry}
              />
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={handleClose}
              className="text-slate-400 hover:text-white hover:bg-white/10 focus:ring-2 focus:ring-slate-400"
            >
              Cancel
            </Button>
            
            <div className="flex items-center gap-2">
              {/* Manual Entry Link */}
              {onOpenManualEntry && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onOpenManualEntry();
                    handleClose();
                  }}
                  className="text-slate-500 hover:text-slate-300 text-xs"
                >
                  Manual Entry
                </Button>
              )}
              
              {/* Find Food Button */}
              <motion.div
                animate={state === 'result' && transcript.trim() ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                <Button
                  onClick={state === 'result' ? handleConfirm : () => processTranscript()}
                  disabled={!transcript.trim() || state === 'processing'}
                  className="bg-gradient-to-r from-sky-400 to-emerald-400 hover:from-sky-500 hover:to-emerald-500 text-white font-medium px-6 focus:ring-2 focus:ring-sky-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {state === 'processing' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {state === 'result' ? 'Review & Log' : 'Find Food'}
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

// Helper Components

interface TranscriptBubbleProps {
  transcript: string;
  isListening: boolean;
  isReady: boolean;
  onEdit: (text: string) => void;
  onClear: () => void;
}

const TranscriptBubble: React.FC<TranscriptBubbleProps> = ({
  transcript,
  isListening,
  isReady,
  onEdit,
  onClear
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(transcript);

  const handleEdit = () => {
    if (isReady) {
      setIsEditing(true);
      setEditValue(transcript);
    }
  };

  const handleSave = () => {
    onEdit(editValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(transcript);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {(transcript || isListening) && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="mb-4"
        >
          <div className="relative group">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 pr-12">
              {isEditing ? (
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleSave}
                  onKeyDown={handleKeyDown}
                  className="bg-transparent border-none p-0 text-white placeholder:text-slate-400 focus-visible:ring-0"
                  placeholder="grilled chicken and rice"
                  autoFocus
                />
              ) : (
                <p 
                  className={`text-white cursor-pointer transition-colors ${
                    isReady ? 'hover:text-sky-300' : ''
                  } ${isListening ? 'animate-pulse' : ''}`}
                  onClick={handleEdit}
                  aria-live={isListening ? 'polite' : 'off'}
                >
                  {transcript || (
                    <span className="text-slate-400 italic">
                      grilled chicken and rice
                    </span>
                  )}
                </p>
              )}
              
              {/* Edit hint */}
              {isReady && !isEditing && transcript && (
                <Edit3 className="absolute top-1/2 right-4 -translate-y-1/2 h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
            
            {/* Clear button */}
            {transcript && !isListening && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="absolute -top-2 -right-2 w-6 h-6 p-0 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-full"
                aria-label="Clear transcript"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface MicButtonProps {
  state: ModalState;
  onPress?: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

const MicButton: React.FC<MicButtonProps> = ({ state, onPress, canvasRef }) => {
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Timer for listening state
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state === 'listening') {
      setTimeElapsed(0);
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [state]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getButtonLabel = () => {
    switch (state) {
      case 'idle': return 'Start recording';
      case 'listening': return 'Stop recording';
      case 'processing': return 'Processing speech';
      default: return 'Microphone';
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Timer chip for listening state */}
      <AnimatePresence>
        {state === 'listening' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mb-3 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-300 text-sm font-mono"
          >
            {formatTime(timeElapsed)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main mic button */}
      <div className="relative">
        <motion.button
          onClick={onPress}
          disabled={!onPress}
          className={`
            relative w-28 h-28 md:w-36 md:h-36 rounded-full flex items-center justify-center
            focus:outline-none focus:ring-4 focus:ring-sky-400/50 transition-all
            ${state === 'idle' ? 'bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700' : ''}
            ${state === 'listening' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : ''}
            ${state === 'processing' ? 'bg-gradient-to-br from-sky-500 to-sky-600' : ''}
            ${state === 'result' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : ''}
            disabled:cursor-not-allowed
          `}
          whileTap={onPress ? { scale: 0.98 } : {}}
          animate={
            state === 'idle' 
              ? { scale: [1, 1.02, 1], opacity: [0.9, 1, 0.9] }
              : state === 'listening'
              ? { scale: [1, 1.05, 1] }
              : {}
          }
          transition={
            state === 'idle'
              ? { repeat: Infinity, duration: 2.4, ease: "easeInOut" }
              : state === 'listening'
              ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
              : { duration: 0.2 }
          }
          aria-label={getButtonLabel()}
        >
          {/* Pulsing ring for listening */}
          {state === 'listening' && (
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-emerald-300"
              animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          )}

          {/* Spinner ring for processing */}
          {state === 'processing' && (
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-transparent border-t-sky-300"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            />
          )}

          {/* Waveform for listening */}
          {state === 'listening' && (
            <div className="absolute inset-4">
              <canvas
                ref={canvasRef}
                className="w-full h-full rounded-full"
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          )}

          {/* Mic icon */}
          <Mic className={`
            ${state === 'listening' ? 'h-8 w-8 md:h-10 md:w-10 text-white relative z-10' : 'h-8 w-8 md:h-10 md:w-10'}
            ${state === 'idle' ? 'text-slate-300' : 'text-white'}
          `} />
        </motion.button>
      </div>
    </div>
  );
};

interface SuggestionChipsProps {
  phrases: string[];
  onSelect: (phrase: string) => void;
}

const SuggestionChips: React.FC<SuggestionChipsProps> = ({ phrases, onSelect }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, staggerChildren: 0.1 }}
      className="mb-6"
    >
      <p className="text-sm text-slate-400 text-center mb-3">Try saying:</p>
      <div className="flex flex-wrap justify-center gap-2">
        {phrases.map((phrase, index) => (
          <motion.button
            key={phrase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelect(phrase)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-sm text-slate-300 hover:text-white transition-all hover:-translate-y-0.5 focus:ring-2 focus:ring-sky-400"
          >
            "{phrase}"
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

interface ErrorCalloutProps {
  state: 'error' | 'permission-denied';
  onRetry: () => void;
  onManualEntry?: () => void;
}

const ErrorCallout: React.FC<ErrorCalloutProps> = ({ state, onRetry, onManualEntry }) => {
  const isPermissionDenied = state === 'permission-denied';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-red-400 font-medium mb-1">
            {isPermissionDenied ? 'Microphone Access Needed' : 'Something Went Wrong'}
          </h4>
          <p className="text-sm text-slate-300 mb-3">
            {isPermissionDenied 
              ? 'Please enable microphone access in your browser settings to use voice logging.'
              : 'We couldn\'t process your speech. Please try again or use manual entry.'
            }
          </p>
          <div className="flex items-center gap-2">
            {isPermissionDenied ? (
              <>
                <Button
                  size="sm"
                  onClick={() => window.open('chrome://settings/content/microphone', '_blank')}
                  className="bg-red-500 hover:bg-red-600 text-white text-xs"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Open Settings
                </Button>
                {onManualEntry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onManualEntry}
                    className="border-slate-600 text-slate-300 hover:text-white text-xs"
                  >
                    Use Manual Entry
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={onRetry}
                  className="bg-red-500 hover:bg-red-600 text-white text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Try Again
                </Button>
                {onManualEntry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onManualEntry}
                    className="border-slate-600 text-slate-300 hover:text-white text-xs"
                  >
                    Manual Entry
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Helper function for state-based text
const getHelperText = (state: ModalState): string => {
  switch (state) {
    case 'idle':
      return 'Tap the mic or press Space to start recording';
    case 'listening':
      return 'Listening... speak your food items clearly';
    case 'processing':
      return 'Processing your speech and finding foods...';
    case 'result':
      return 'Review your foods or press Enter to log them';
    case 'error':
      return 'Something went wrong. Please try again';
    case 'permission-denied':
      return 'Microphone access is required for voice logging';
    default:
      return 'Try speaking naturally about your meal';
  }
};