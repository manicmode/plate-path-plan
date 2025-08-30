import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Keyboard, Mic, RotateCcw } from 'lucide-react';

interface InconclusiveReportProps {
  message: string;
  reason?: 'front_of_pack' | 'no_ingredients' | 'insufficient_text' | 'low_confidence';
  onRetakePhoto: () => void;
  onManualEntry: () => void;
  onVoiceEntry: () => void;
}

export const InconclusiveReport: React.FC<InconclusiveReportProps> = ({
  message,
  reason,
  onRetakePhoto,
  onManualEntry,
  onVoiceEntry
}) => {
  
  const getTips = () => {
    switch (reason) {
      case 'front_of_pack':
        return [
          "Turn to the back or side of the package",
          "Look for 'Ingredients:' or 'Nutrition Facts'",
          "Avoid brand names and marketing text"
        ];
      case 'no_ingredients':
        return [
          "Fill the frame with the ingredients panel",
          "Keep the label flat and well-lit",
          "Avoid shadows and glare"
        ];
      case 'insufficient_text':
      case 'low_confidence':
        return [
          "Get closer to the text",
          "Improve lighting conditions", 
          "Keep the camera steady"
        ];
      default:
        return [
          "Find the ingredients or nutrition panel",
          "Fill the frame with the label text",
          "Avoid glare and shadows"
        ];
    }
  };

  const tips = getTips();
  return (
    <div className="p-6 space-y-6">
      {/* Status Card */}
      <Card className="bg-gray-50 border-gray-300 dark:bg-gray-800 dark:border-gray-600">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            <Badge variant="secondary" className="text-sm font-medium bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
              Inconclusive
            </Badge>
          </div>
          <CardTitle className="text-lg text-gray-700 dark:text-gray-300">
            Analysis Incomplete
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-4xl mb-4">
            {reason === 'front_of_pack' ? '🔄' : '🔍'}
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            {message}
          </p>
          
          {/* Capture Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
            <p className="text-blue-700 dark:text-blue-300 text-xs font-medium mb-2">
              💡 Photo Tips:
            </p>
            <ul className="text-blue-600 dark:text-blue-400 text-xs space-y-1 text-left">
              {tips.map((tip, index) => (
                <li key={index}>• {tip}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          onClick={onRetakePhoto}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          Retake Photo
        </Button>

        <Button
          onClick={onManualEntry}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 text-lg"
        >
          <Keyboard className="w-5 h-5 mr-2" />
          Manual Entry
        </Button>

        <Button
          onClick={onVoiceEntry}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 text-lg"
        >
          <Mic className="w-5 h-5 mr-2" />
          Voice Entry
        </Button>
      </div>
    </div>
  );
};