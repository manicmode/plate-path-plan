import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

interface NoDetectionFallbackProps {
  onRetryPhoto: () => void;
  onRetryCamera: () => void;
  onManualEntry: () => void;
  onVoiceEntry?: () => void;
  onBack: () => void;
  status: 'no_detection' | 'not_found';
}

export const NoDetectionFallback: React.FC<NoDetectionFallbackProps> = ({
  onRetryPhoto,
  onRetryCamera,
  onManualEntry,
  onVoiceEntry,
  onBack,
  status
}) => {
  const isNoDetection = status === 'no_detection';
  
  return (
    <div
      className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900"
      style={{ 
        height: "min(100dvh, 100vh)",
        paddingBottom: "env(safe-area-inset-bottom)"
      }}
    >
      <div
        className="grid h-full"
        style={{ 
          gridTemplateRows: "auto 1fr auto",
          paddingTop: "max(env(safe-area-inset-top), 12px)"
        }}
      >
        {/* Header */}
        <header className="p-6 flex-shrink-0">
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
              <h1 className="text-2xl font-bold text-white">
                {isNoDetection ? "We couldn't detect a product" : "We couldn't find that barcode"}
              </h1>
              <p className="text-gray-300">
                {isNoDetection 
                  ? "Please try one of the options below to continue." 
                  : "The barcode wasn't found in our database. Try another method."}
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main 
          className="overflow-y-auto min-h-0 px-6 space-y-6 flex-1"
          style={{ 
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain"
          }}
        >
          {/* Status Message */}
          <Card className="bg-orange-900/20 border-orange-400/30 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-4">{isNoDetection ? "🔍" : "📦"}</div>
              <h3 className="text-xl font-bold text-orange-300 mb-2">
                {isNoDetection ? "No Product Detected" : "Barcode Not Found"}
              </h3>
              <p className="text-orange-200 text-sm">
                {isNoDetection 
                  ? "We couldn't identify any food items or barcodes in your image."
                  : "This barcode isn't in our database yet."
                }
              </p>
            </CardContent>
          </Card>

          {/* Action Options */}
          <div className="space-y-4">
            <Button
              onClick={onRetryCamera}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg"
            >
              📸 Retry Scan
            </Button>

            <Button
              onClick={onRetryPhoto}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg"
            >
              📷 Photo Mode
            </Button>

            <Button
              onClick={onManualEntry}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 text-lg"
            >
              ⌨️ Manual Entry
            </Button>

            {onVoiceEntry && (
              <Button
                onClick={onVoiceEntry}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 text-lg"
              >
                🎤 Voice Entry
              </Button>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer 
          className="flex-shrink-0 pt-3 bg-gradient-to-t from-black/40 to-transparent px-6"
          style={{ 
            paddingBottom: "max(env(safe-area-inset-bottom), 16px)"
          }}
        >
          {/* Footer space */}
        </footer>
      </div>
    </div>
  );
};