import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Keyboard, Mic, Search } from 'lucide-react';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { useViewportUnitsFix } from '@/hooks/useViewportUnitsFix';

interface ManualEntryFallbackProps {
  onManualEntry: (query: string, type: 'text' | 'voice') => void;
  onBack: () => void;
}

export const ManualEntryFallback: React.FC<ManualEntryFallbackProps> = ({
  onManualEntry,
  onBack
}) => {
  const [textQuery, setTextQuery] = useState('');
  const { isRecording, startRecording, stopRecording, transcribedText } = useVoiceRecording();
  
  // Fix viewport units for iOS
  useViewportUnitsFix();

  const handleTextSubmit = () => {
    if (textQuery.trim()) {
      onManualEntry(textQuery.trim(), 'text');
    }
  };

  const handleVoiceSubmit = () => {
    if (transcribedText) {
      onManualEntry(transcribedText, 'voice');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTextSubmit();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900"
      style={{ height: "calc(var(--vh, 1vh) * 100)" }}
    >
      {/* inner grid */}
      <div
        className="grid h-full"
        style={{ 
          gridTemplateRows: "auto 1fr auto", 
          paddingTop: "max(env(safe-area-inset-top),12px)", 
          paddingBottom: "max(env(safe-area-inset-bottom),12px)" 
        }}
      >
        {/* Header */}
        <header className="p-6">
          <div className="flex items-center space-x-4 mb-6">
            <Button
              onClick={onBack}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">Manual Entry</h1>
              <p className="text-gray-300">Unable to recognize the image. Please try another method.</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="overflow-y-auto min-h-0 px-6 space-y-6">
        {/* Error Message */}
        <Card className="bg-red-900/20 border-red-400/30 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-4">😔</div>
            <h3 className="text-xl font-bold text-red-300 mb-2">Image Not Recognized</h3>
            <p className="text-red-200 text-sm">
              We couldn't identify any food items or barcodes in your image. 
              Please try one of the options below to continue your health analysis.
            </p>
          </CardContent>
        </Card>

        {/* Text Entry Option */}
        <Card className="bg-black/40 border-white/20 backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <Keyboard className="w-6 h-6 mr-2 text-blue-400" />
              Type Food Name or Barcode
            </h3>
            
            <div className="space-y-4">
              <Input
                value={textQuery}
                onChange={(e) => setTextQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g., 'Organic quinoa chips' or '123456789012'"
                className="bg-white/10 border-white/20 text-white placeholder-gray-400 text-lg py-3"
              />
              
              <Button
                onClick={handleTextSubmit}
                disabled={!textQuery.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg"
              >
                <Search className="w-5 h-5 mr-2" />
                Search Database
              </Button>
            </div>
          </CardContent>
        </Card>

          {/* Voice Entry Option */}
          <Card className="bg-black/40 border-white/20 backdrop-blur-sm">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <Mic className="w-6 h-6 mr-2 text-green-400" />
                Voice Recognition
              </h3>
              
              <div className="space-y-4">
                {transcribedText && (
                  <div className="bg-green-900/20 border border-green-400/30 rounded-lg p-4">
                    <p className="text-green-300 font-medium">Heard: "{transcribedText}"</p>
                  </div>
                )}
                
                <div className="flex space-x-3">
                  <Button
                    onClick={isRecording ? stopRecording : startRecording}
                    variant={isRecording ? "destructive" : "default"}
                    className={`flex-1 py-3 text-lg ${
                      isRecording 
                        ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    <Mic className={`w-5 h-5 mr-2 ${isRecording ? 'animate-bounce' : ''}`} />
                    {isRecording ? 'Stop Recording' : '🎤 Speak to Identify'}
                  </Button>
                  
                  {transcribedText && (
                    <Button
                      onClick={handleVoiceSubmit}
                      className="bg-green-600 hover:bg-green-700 text-white py-3"
                    >
                      <Search className="w-5 h-5 mr-2" />
                      Analyze
                    </Button>
                  )}
                </div>
                
                <p className="text-gray-400 text-sm text-center">
                  Tap the microphone and say the food name clearly
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Suggestions */}
          <Card className="bg-black/40 border-white/20 backdrop-blur-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-white mb-4">Quick Suggestions</h3>
              
              <div className="grid grid-cols-1 gap-2">
                {[
                  'Apple',
                  'Banana',
                  'Greek yogurt',
                  'Chicken breast',
                  'Avocado',
                  'Quinoa',
                  'Salmon',
                  'Broccoli'
                ].map((food) => (
                  <Button
                    key={food}
                    onClick={() => onManualEntry(food, 'text')}
                    variant="outline"
                    className="justify-start text-left border-gray-600 text-gray-300 hover:bg-gray-600/20 hover:text-white"
                  >
                    {food}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>

        {/* Footer */}
        <footer className="sticky bottom-0 pt-3 bg-gradient-to-t from-black/40 to-transparent px-6">
          {/* Footer content here if needed */}
        </footer>
      </div>
    </div>
  );
};